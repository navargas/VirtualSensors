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

// When the app is restarted, many devices will have the same
// interval. Registering all at once would cause uneven load
// on the application every n seconds. This is avoided by delaying
// a randomized number of seconds per device.
function delayRegister(device, org, interval, deviceName, delay) {
  console.log('      in', delay, 'ms');
  setTimeout(function() {
    exports.register(device, org, interval, deviceName);
  }, delay);
}

exports.init = function(session_data) {
  client.connectBroker(1883);
  setTimeout(function() {
    console.log('Restarting dead devices...');
    var allOrgs = session_data.getOrgs();
    var restartedDevices = 0;
    for (org in allOrgs) {
      if (org === '_id' || org === '_rev') continue;
      console.log('  for organization', org);
      for (dev in allOrgs[org].devices) {
        console.log('    restarting device:', dev);
        // interval is hardcoded to three seconds for now
        var interval = 3;
        var delay = Math.random() * interval * 1000;
        // wait for 'delay' seconds, then register device
        // There are two randomized IDs: name, and uid.
        // This needs to be consolidated.
        var deviceObject = allOrgs[org].devices[dev];
        delayRegister(deviceObject, org, interval, deviceObject.uid, delay);
        restartedDevices++;
      }
    }
    console.log('Restarted', restartedDevices, 'devices');
  }, 5000);
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
    eventJSON = JSON.stringify({
      "error":"invalid JSON",
      "message":e.message,
      "syntax":eventJSON
    });
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
    var activeVariables = Object.keys(variables).length;
    function variableCallback(variable, vObj, substring) {
      // this callback is called when variable rendering is finished
      // results are sent to ibmiot foundation for redistribution via mqtt
      activeVariables -= 1;
      if (substring)
        jsonstr = substitute(jsonstr, variable, substring);
      if (vObj.display == 'yes') {
        device.displayvalue = substring;
      }
      if (activeVariables <= 0) {
        exports.sendEvent(orgname, jsonstr);
      }
    }
    if (activeVariables === 0) {
      // If there are no dynamic variables the event must still fire
      variableCallback(undefined, {}, '');
    }
    for (variable in variables) {
      if (!variables.hasOwnProperty(variable)) continue;
      var vObj = variables[variable];
      var substring;
      if (vObj.type == 'script') {
        value = null;
        if (!device.historyMap) device.historyMap = {};
        if (!device.historyMap[variable]) device.historyMap[variable] = [];
        if (vObj.script) {
          var s = new Sandbox();
          var runscript  = 'onmessage = function(message) {\n';
              runscript += vObj.script + '\n';
              runscript += '_VAL = JSON.parse(message);\n';
              runscript += 'var res = value(_VAL.history, _VAL.properties);';
              runscript += 'postMessage({variable:_VAL.variable, result:res});\n';
              runscript += '};\n';
          s.run(runscript, function() {});
          s.on('message', function(mOut) {
            output = mOut.result;
            variable = mOut.variable;
            device.historyMap[variable].push(output);
            if (device.historyMap[variable].length > 10) {
              device.historyMap[variable].shift();
            }
            variableCallback(variable, variables[variable], output);
          });
          s.postMessage(JSON.stringify({
                "variable":variable,
                "history":device.historyMap[variable],
                "properties":{}
          }));
        }
      } else if (vObj.type == 'random') {
        var max = parseInt(vObj.max);
        var min = parseInt(vObj.min);
        var val = Math.round(Math.random() * (max - min) + min);
        substring = val.toString();
        variableCallback(variable, vObj, substring);
      } else if (vObj.type == 'static') {
        var userInput = device.static[variable];
        if (userInput === undefined) userInput = 'null';
        substring = userInput;
        variableCallback(variable, vObj, substring);
      } else {
        //invalid variable type. Not possible through web UI
      }
    }
  };
  sendMessage(device, orgname);
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
