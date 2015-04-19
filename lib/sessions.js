var hat = require('hat');
var DAY = 24 * 60 * 60 * 1000;

// sessionMap : "session_token":session_obj
// sessionObj : token, username, orginization, expDate
var sessionMap = {};

// orgs : orgname:org
// org  : orgname, creator, devices, IoTAuth
var orgs = {};


var byToken = function(token) {
  return sessionMap[token]; 
};

exports.verify = function(req, res, next) {
  if (req.body.token && sessionMap[req.body.token]) {
    next();
  } else {
    res.send({"error":"Invalid or missing token."});
    res.end();
  }
};

exports.authenticate = function(username, password) {
  var newToken = hat(128);
  var date = new Date();
  var now = date.getTime();
  var nextWeek = now + 7*DAY;
  sessionMap[newToken] = {
    "token" : newToken,
    "username" : username,
    "expire" : nextWeek
  };
  console.log('New Session:', sessionMap[newToken]);
  return newToken;
};
