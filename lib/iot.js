var iotf = require('iotclient');
var appId = "virtual-navargas";
var apiKey = null;
var apiToken = null;
var client = new iotf(appId, apiKey, apiToken);
client.connectBroker(1883);
var payload = {
  d: {
    "working":true,
    "money":"123"
  }
};
setTimeout(function() {
  client.publishDeviceEvent('quickstart', appId, 'event', 'json', JSON.stringify(payload));
  client.publishDeviceEvent('quickstart', 'bobob', 'event', 'json', JSON.stringify(payload));
  client.disconnectBroker();
}, 500);
