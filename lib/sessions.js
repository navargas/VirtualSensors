var hat = require('hat');
var DAY = 24 * 60 * 60 * 1000;
var bcrypt = require('bcryptjs');
var iot = require('../lib/iot.js');
var CloudObject = require('../lib/CloudObject.js');

// sessionMap : "session_token":session_obj
// sessionObj : token, username, orginization, expDate
var sessionMap = {};

// orgs    : orgname:org
// org     : name, creator, devices, IoTAuth, uid, profiles
// devices : name, uid, unit, min, max, value
// profiles: name, syntax, variables
var orgs = {};

// users : username:user
// user  : username, tokens, bcrypt
var users = {};

// regex that matches a-z, 0-9, and underscore
var ALPHANUMERIC = /^[a-z0-9_]+$/i;

var byToken = function(token) {
  return sessionMap[token];
};

exports.getOrgs = function() {
  return orgs;
}

exports.init = function(storage) {
  if (!storage) {
    users = {
      "_upload":   function() {},
      "_download": function() {}
    }
    orgs = {
      "_upload":   function() {},
      "_download": function() {}
    }
    return;
  }
  orgs = CloudObject("orgs", storage);
  orgs._download();
  users = CloudObject("users", storage);
  users._download();
}

exports.acknowledge = function(req, msg) {
  var token = req.body.token || req.cookies.token;
  exports.user(byToken(token).username).acknowledge.push(msg);
};

exports.getAcknowledge = function(req) {
  var token = req.body.token || req.cookies.token;
  return exports.user(byToken(token).username).acknowledge;
};

exports.isValidSession = function(req) {
  if (req.body.token && sessionMap[req.body.token]) {
    return true;
  } else if (req.cookies.token && sessionMap[req.cookies.token]) {
    return true;
  } else {
    return false;
  }
};

exports.verify = function(req, res, next) {
  if (exports.isValidSession(req)) {
    next();
  } else {
    res.send({"error":"Invalid or missing token."});
    res.end();
  }
};

exports.user = function(username) {
  return users[username];
};

exports.getDefaultOrg = function(creator, name) {
  COUNT_UP =
    '// history - list of last n values generated\n' +
    '// properties - map of user input properties\n' +
    'function value(history, properties) {\n' +
    '    // increment last value produced\n' +
    '    return (history.pop() || 403) + 1;\n' +
    '}';
  var org = {
    "creator": creator,
    "name": name,
    "devices":{},
    "profiles":{
      "BodyTemperature":
         {"name":"BodyTemperature",
          "syntax":
                    "{\n" +
                    "  \"value\":{{RANDOM_01}},\n"   +
                    "  \"units\":\"°F\"\n" +
                    "}",
          "variables": {
            "RANDOM_01":{"display":"yes", "type":"random", "min":95, "max":110}
          }
         },
      "Atmospheric_CO2":
         {"name":"Atmospheric_CO2",
          "syntax":
                    "{\n" +
                    "  \"value\":{{number}},\n"   +
                    "  \"units\":\"ppm\"\n" +
                    "}",
          "variables": {
            "number":{"display":"yes", "type":"script", "script":COUNT_UP}
          }
         }
     },
    "uid":name
  };
  return org;
};

exports.createUser = function(username, hash, googleinfo) {
  var user = username;
  console.log('Creating user', user);
  var defaultOrg = user + '-default';
  if (user[user]) {
    return {"error":"user already exists"};
  }
  users[user] = {
    "username" : user,
    "password" : hash,
    "google" : googleinfo,
    "acknowledge":[],
    "tokens" : [],
    "orgs" : []
  };
  orgs[defaultOrg] = exports.getDefaultOrg(user, defaultOrg);
  users[user].orgs.push(defaultOrg);
  users[user].useOrg = defaultOrg;
  users._upload();
  orgs._upload();
  console.log('done');
};

exports.createBcryptUser = function(data, callback) {
  if (!data.username || !data.password) {
    callback("username/password not provided");
    return;
  }
  var user = data.username;
  bcrypt.hash(data.password, 8, function(err, hash) {
    exports.createUser(data.username, hash);
    callback();
  });
};

exports.makeSession = function(username) {
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
  return newToken;
};

exports.authenticate = function(username, password, callback) {
  if (!users[username]) {
    console.log('Invalid user', username);
    callback("Invalid username or password");
    return;
  }
  bcrypt.compare(password, users[username].password, function(err, res) {
    if (res) {
      var token = exports.makeSession(username);
      callback(null, token);
    } else {
      callback("Invalid username or password");
    }
  });
};

exports.removeDevice = function(req, devName) {
  var devList = exports.getDevices(req);
  if (!devList[devName])
    return {"error":"device not found"};
  console.log('Removing device:', devName, devList[devName].uid);
  var topic = iot.unregister(devList[devName].uid);
  delete devList[devName];
  orgs._upload();
  return topic;
};

exports.addDevice = function(req, device) {
  var token = req.body.token || req.cookies.token;
  var devList = exports.getDevices(req);
  var orgName = sessionMap[token].org;
  var org = orgs[orgName];
  if (!device.name) device.name = hat(32);
  var devName = device.name;
  if (!ALPHANUMERIC.test(devName)) {
    return {"error":"device name invalid"};
  }
  if (devList[devName]) {
    return {"error":"device already exists"};
  }
  console.log('New device:', device);
  var uid = hat(32);
  var interval = device.interval || 5;
  devList[devName] = device;
  devList[devName].uid = uid;
  console.log('Uploading ', orgs._docObj);
  orgs._upload();
  var topic = iot.register(device, orgName, interval, uid);
  return {"uid":uid, "topic":topic, "status":"ok"};
};

exports.deleteProfile = function(req, profilename) {
  var token = req.body.token || req.cookies.token;
  var org = sessionMap[token].org;
  var profiles = orgs[org].profiles;
  if (!profiles[profilename])
    return {"error":"profile does not exist"};
  delete profiles[profilename];
  orgs._upload();
  return profiles;
};

exports.setProfile = function(req, profile) {
  var token = req.body.token || req.cookies.token;
  var org = sessionMap[token].org;
  profileObject = {};
  if (!profile.name || !ALPHANUMERIC.test(profile.name))
    return {"errror":"missing or invalid profile name"};
  profileObject.name = profile.name;
  profileObject.syntax = profile.syntax || "";
  profileObject.variables = profile.variables || {};
  console.log('New profile', profileObject);
  orgs[org].profiles[profileObject.name] = profileObject;
  orgs._upload();
  return orgs[org].profiles;
};

exports.getProfile = function(orgname, profilename) {
  return orgs[orgname].profiles[profilename];
};

exports.getProfiles = function(req) {
  var token = req.body.token || req.cookies.token;
  if (token && sessionMap[token]) {
    var org = sessionMap[token].org;
    return orgs[org].profiles;
  } else {
    return {"error":"missing token"};
  }
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

exports.deleteSession = function(req) {
  var token = req.body.token || req.cookies.token;
  if (token && sessionMap[token]) {
    delete sessionMap[token];
    return {"status":"ok"};
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

exports.getUser = function(req) {
  var token = req.body.token || req.cookies.token;
  if (token && sessionMap[token]) {
    var username = sessionMap[token].username;
    return exports.user(username);
  } else {
    return {"error":"missing token"};
  }
};

exports.log = function() {
  console.log('users', users);
  console.log('orgs', orgs);
  console.log('sessionMap', sessionMap);
};
