var iotf = require('iotclient');
var appId = "virtualdevicesv01";
var apiKey = null;
var apiToken = null;
var client = new iotf(appId, apiKey, apiToken);

exports.init = function() {
  client.connectBroker(1883);
}

exports.sendEvent = function(id, eventJSON) {
  client.publishDeviceEvent('quickstart', id, 'event', 'json', JSON.stringify(eventJSON));
};

exports.destroy = function() {
  client.disconnectBroker();
};
