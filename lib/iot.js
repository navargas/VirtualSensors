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
  var value = 'error';
  try {
    var jsonobj = JSON.parse(eventJSON);
    value = jsonobj.value;
  } catch (e) {
    eventJSON = JSON.stringify({"error":"invalid JSON", "message":e.message, "syntax":eventJSON});
  }
  client.publishDeviceEvent('quickstart', id, 'event', 'json', eventJSON);
  return value;
};

exports.resolve = function(orgUID) {
  return title + orgUID;
};

function decorate(str) {
  return '{{' + str + '}}';
}

function substitute(str, find, replace) {
  find = decorate(find);
  if (typeof replace == 'string') replace = '"' + replace + '"';
  return str.replace(new RegExp(find, 'g'), replace);
}

exports.register = function(device, orgname, interval, devUID) {
  if (env.noiot == 'true')
    return;
  console.log("REGISTERING", device);
  interval = interval * 1000;
  console.log("INTERVAL", interval);
  var sendMessage = function(device, orgname) {
    var profile = sessions.getProfile(orgname, device.static.templateprofile);
    var jsonstr = profile.syntax;
    var variables = profile.variables;
    for (variable in variables) {
      if (!variables.hasOwnProperty(variable)) continue;
      var vObj = variables[variable];
      var substring;
      if (vObj.type == 'script') {
        var currentdate = new Date();
        var datetime = currentdate.getFullYear() + "-"
          + (1e15+(currentdate.getMonth()+1)+"").slice(-2) + "-"
          + (1e15+currentdate.getDate()+"").slice(-2) + " "
          + (1e15+currentdate.getHours()+"").slice(-2) + ":"
          + (1e15+currentdate.getMinutes()+"").slice(-2) + ":"
          + (1e15+currentdate.getSeconds()+"").slice(-2);
        substring = datetime;
      } else if (vObj.type == 'random') {
        var max = parseInt(vObj.max);
        var min = parseInt(vObj.min);
        var val = Math.round(Math.random() * (max - min) + min);
        substring = val.toString();
      } else if (vObj.type == 'static') {
        var userInput = device.static[variable];
        if (userInput === undefined) userInput = 'null';
        substring = userInput;
      }
      if (substring)
        jsonstr = substitute(jsonstr, variable, substring);
      if (vObj.display == 'yes') {
        device.displayvalue = substring;
      }
    }
    exports.sendEvent(orgname, jsonstr);
  }; sendMessage(device, orgname);
  schedule[devUID] = setInterval(sendMessage, interval, device, orgname);
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
