var iotf = require('iotclient');
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
  client.publishDeviceEvent('quickstart', id, 'event', 'json', JSON.stringify(eventJSON));
};

exports.resolve = function(orgUID) {
  return title + orgUID;
};

exports.register = function(device, orgUID, interval, devUID) {
  interval = interval * 1000;
  console.log("INTERVAL", interval);
  schedule[devUID] = setInterval(function(device, orgUID) {
    var newValue = Math.random() * (device.max - device.min) + device.min;
    device.current = newValue;
    var data = {};
    data.name = device.name;
    data[device.unit] = newValue;
    exports.sendEvent(orgUID, data);
  }, interval, device, orgUID);
  return title + orgUID;
};

exports.unregister = function(uid) {
  clearInterval(schedule[uid]);
  delete schedule[uid];
  return {"status":"ok"};
}

exports.destroy = function() {
  client.disconnectBroker();
};
