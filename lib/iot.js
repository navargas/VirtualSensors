var Sandbox = require('sandbox');
var iotf = require('../lib/IoTAppClient.js');
var sessions = require('../lib/sessions.js');
var conf = require('./loadConfig.js')
var env = conf.read('config.json');
var hat = require('hat');
var uHat = hat(32);
var appId = "virtualdevicesv01-" + uHat;
var apiKey = null;
var apiToken = null;
var client = new iotf(appId, apiKey, apiToken);

var schedule = {};
var title = 'virtualdevice-';

exports.init = function() {
  client.connectBroker(1883);
}

exports.sendEvent = function(orgUID, eventJSON) {
  var id = title + orgUID;
  if (typeof eventJSON != "string") {
    eventJSON = JSON.stringify(eventJSON);
  }
  try {
    JSON.parse(eventJSON);
  } catch (e) {
    eventJSON = JSON.stringify({"error":"invalid JSON", "message":e.message});
  }
  client.publishDeviceEvent('quickstart', id, 'event', 'json', eventJSON);
};

exports.resolve = function(orgUID) {
  return title + orgUID;
};

exports.register = function(device, orgname, interval, devUID) {
  if (env.noiot == 'true')
    return;
  console.log("REGISTERING", device);
  interval = interval * 1000;
  console.log("INTERVAL", interval);
  schedule[devUID] = setInterval(function(device, orgname) {
    var profile = sessions.getProfile(orgname, device.static.templateprofile);
    exports.sendEvent(orgname, profile.syntax);
  }, interval, device, orgname);
  return title + orgname;
};

exports.unregister = function(uid) {
  clearInterval(schedule[uid]);
  delete schedule[uid];
  return {"status":"ok"};
}

exports.destroy = function() {
  client.disconnectBroker();
};
