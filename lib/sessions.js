var hat = require('hat');
var DAY = 24 * 60 * 60 * 1000;
var bcrypt = require('bcryptjs');
var iot = require('../lib/iot.js');

// sessionMap : "session_token":session_obj
// sessionObj : token, username, orginization, expDate
var sessionMap = {};

// orgs    : orgname:org
// org     : name, creator, devices, IoTAuth, uid
// devices : name, uid, unit, min, max
var orgs = {
};

// users : username:user
// user  : username, tokens, bcrypt
var users = {
};


var byToken = function(token) {
  return sessionMap[token]; 
};

exports.verify = function(req, res, next) {
  console.log(req.cookies);
  if (req.body.token && sessionMap[req.body.token]) {
    next();
  } else if (req.cookies.token && sessionMap[req.cookies.token]) {
    next();
  } else {
    res.send({"error":"Invalid or missing token."});
    res.end();
  }
};

exports.createUser = function(data, callback) {
  if (!data.username || !data.password) {
    callback("username/password not provided");
    return;
  }
  var user = data.username;
  bcrypt.hash(data.password, 8, function(err, hash) {
    console.log('Creating user', user);
    var defaultOrg = user + '-default';
    if (user[user]) {
      callback("User already exists");
      return;
    }
    users[user] = {
      "username" : user,
      "password" : hash,
      "tokens" : [],
      "orgs" : []
    };
    orgs[defaultOrg] = {
      "creator": user,
      "name": defaultOrg,
      "devices":{},
      "uid":hat(32)
    };
    users[user].orgs.push(defaultOrg);
    users[user].useOrg = defaultOrg;
    console.log('done');
    callback(null);
  });
};

exports.authenticate = function(username, password, callback) {
  if (!users[username]) {
    console.log('Invalid user', username);
    callback("Invalid username or password");
    return;
  }
  bcrypt.compare(password, users[username].password, function(err, res) {
    if (res) {
      var newToken = hat(128);
      var date = new Date();
      var now = date.getTime();
      var nextWeek = now + 7*DAY;
      sessionMap[newToken] = {
        "token" : newToken,
        "username" : username,
        "org":users[username].useOrg,
        "expire" : nextWeek
      };
      console.log('New Session:', sessionMap[newToken]);
      callback(null, sessionMap[newToken].token);
    } else {
      callback("Invalid username or password");
    }
  });
};

exports.removeDevice = function(req, uid) {
  var devList = exports.getDevices(req);
  if (!devList[uid])
    return {"error":"device not found"};
  var topic = iot.unregister(uid);
  delete devList[uid];
  return topic;
};

exports.addDevice = function(req, device) {
  var devList = exports.getDevices(req);
  var orgName = sessionMap[req.body.token].org;
  var org = orgs[orgName];
  var uid = hat(32);
  var interval = device.interval || 5;
  devList[uid] = device;
  var topic = iot.register(device, org.uid, interval, uid);
  return {"uid":uid, "topic":topic};
};

exports.getOrg = function(req) {
  var token = req.body.token || req.cookies.token;
  if (token && sessionMap[token]) {
    var org = sessionMap[token].org;
    var uid = orgs[org].uid;
    return {"name":org, "topic":iot.resolve(uid)};
  } else {
    return {"error":"missing token"};
  }
};

exports.getDevices = function(req) {
  var token = req.body.token || req.cookies.token;
  if (token && sessionMap[token]) {
    var org = sessionMap[token].org;
    var devices = orgs[org].devices;
    return devices;
  } else {
    return {"error":"missing token"};
  }
};

exports.log = function() {
  console.log('users', users);
  console.log('orgs', orgs);
  console.log('sessionMap', sessionMap);
};
