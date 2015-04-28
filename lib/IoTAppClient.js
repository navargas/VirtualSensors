/**
 *****************************************************************************
 Copyright (c) 2014 IBM Corporation and other Contributors.
 All rights reserved. This program and the accompanying materials
 are made available under the terms of the Eclipse Public License v1.0
 which accompanies this distribution, and is available at
 http://www.eclipse.org/legal/epl-v10.html
 Contributors:
 IBM - Initial Contribution
 *****************************************************************************
 * 
 */

module.exports = IoTAppClient;

var mqtt = require("mqtt");
var inArray = require('in-array');
var request = require('request');
var Q = require('q');
var log4js = require("log4js");


var DEVICE_EVT_RE = /^iot-2\/type\/(.+)\/id\/(.+)\/evt\/(.+)\/fmt\/(.+)$/;
var DEVICE_CMD_RE = /^iot-2\/type\/(.+)\/id\/(.+)\/cmd\/(.+)\/fmt\/(.+)$/;
var DEVICE_MON_RE = /^iot-2\/type\/(.+)\/id\/(.+)\/mon$/;
var APP_MON_RE    = /^iot-2\/app\/(.+)\/mon$/;
var SUPPORTED_CALLBACKS = ['deviceEvent', 'deviceCommand', 'deviceStatus', 'appStatus', 'disconnect'];

var BROKER_PORT = 1883;

/**
* Constructor - returns a new instance of {IoTAppClient}
* 
* @param {String} appId - the application id
* @param {String} apiKey - the API key
* @param {String} apiToken - the API token
*/
function IoTAppClient(appId, apiKey, apiToken, brokerHostPassed){
	// Allow constructor to be called safely without "new"
	if (!(this instanceof IoTAppClient)) {
		return new IoTAppClient(appId, apiKey, apiToken, brokerHostPassed, environment);
	}
	
	this.logger = log4js.getLogger();

	if (typeof brokerHostPassed === 'undefined' || brokerHostPassed === null) {
		this.brokerHost = "quickstart.messaging.internetofthings.ibmcloud.com";
		this.logger.debug("Broker Host not passed so using ", this.brokerHost);
	} else {
		this.brokerHost = brokerHostPassed;
		this.logger.debug("Broker Host PASSED ", this.brokerHost);		
	}
	
	if(!apiKey && apiToken || apiKey && !apiToken) {
		this.logger.error("Either pass both API Key and API Token or pass neither: ");
		throw new Error("Incomplete Token information passed");
	} else if(!apiKey || !apiToken){
		// Ensure both apiKey and apiToken are null if either are null
		// so that we don't half authenticate in QuickStart
		this.orgId = "quickstart";
		this.apiKey = null;
		this.apiToken = null;
	} else {
		this.orgId = apiKey.split(":")[1];
		if(this.orgId === null || typeof this.orgId === 'undefined') {
			this.orgId = apiKey.split("-")[1];
		}
		this.apiKey = apiKey;
		this.apiToken = apiToken;
	}
	
	this.appId = appId;
	this.callbacks = {}; // having this here allows us to register callbacks before calling connectBroker() 
	this.clientId = "a:" + this.orgId + ":" + this.appId;
	
	this.subscriptions = {};
	this.subscriptionCount = 0;
	this.retryCount = 0;
	
	// tests should manually override these properties
	this.apiHost = "https://internetofthings.ibmcloud.com";
	this.rejectUnauthorized = true;
	
	this.logger.trace("IoTAppClient constructed: " + this.appId + ", " + this.orgId + ", " + this.clientId + ", " + this.brokerHost);
}


/*
 ************************************************************************
 * MQTT Support
 ************************************************************************
 */

IoTAppClient.prototype.connectBroker = function(mqttPort){
	if (typeof mqttPort === 'undefined') {
		mqttPort = BROKER_PORT;
		this.logger.debug("Broker Port not passed so using ", BROKER_PORT);
	} else {
		this.logger.debug("Broker Port PASSED ", mqttPort);		
	}
	this.logger.debug("Connecting to Broker: ", this.brokerHost, mqttPort);
	
	// Setup the MQTT client which will underpin this application client 
	this.mqttClient = mqtt.createClient(mqttPort, this.brokerHost, {
		clientId: this.clientId,
		username: this.apiKey,
		password: this.apiToken,
		reconnectPeriod: 1000
//		keepalive: 10
	});

	// Configure the internal message callback which will pass on messages to the user provided callbacks	
	var self = this; // for referencing "this" from inside nested function definition

	this.mqttClient.on('connect',function(packet){
		this.connected = true;
		self.logger.trace("CONNECTED......: \nSubscription Count = " + self.subscriptionCount);
		for(var count = 0 ; count < self.subscriptionCount ; count++) {
			self.logger.trace((count + 1) + "\t" + self.subscriptions[count] );
			self.checkMqtt();
			self.logger.trace("Resubscribing: ");
			self.mqttClient.subscribe(self.subscriptions[count], {qos: 0});
		}
		self.retryCount = 0;
	});

	this.mqttClient.on('error', function(error){
		self.logger.trace("\n\nError Error Error " + error);
		this.connected = false;
	});
	
	this.mqttClient.on('close', function(){
		self.retryCount++;
		self.logger.trace("Retry count = " + self.retryCount);
		if(self.retryCount <= 60 ) {
			if(self.mqttClient != null && self.mqttClient.options != null) {
				self.mqttClient.options.reconnectPeriod = self.retryCount * 1000;
			}
			if(self.mqttClient != null && self.mqttClient.options == null) {
				self.mqttClient.options = {};
			}

		}
	});
	
	
	this.mqttClient.on('message', function(topic, payload){
		self.logger.trace("mqtt: ", topic, payload);
		
		// For each type of registered callback, check the incoming topic against a Regexp.
		// If matches, forward the payload and various fields from the topic (extracted using groups in the regexp)
		
		if(self.callbacks.deviceEvent){
			var match = DEVICE_EVT_RE.exec(topic);
			if(match){
				self.callbacks.deviceEvent(match[1], match[2], match[3], match[4], payload, topic);
				return;
			}
		}
		if(self.callbacks.deviceCommand){
			var match = DEVICE_CMD_RE.exec(topic);
			if(match){
				self.callbacks.deviceCommand(match[1], match[2], match[3], match[4], payload, topic);
				return;
			}
		}
		if(self.callbacks.deviceStatus){
			var match = DEVICE_MON_RE.exec(topic);
			if(match){
				self.callbacks.deviceStatus(match[1], match[2], payload, topic);
				return;
			}
		}
		if(self.callbacks.appStatus){
			var match = APP_MON_RE.exec(topic);
			if(match){
				self.callbacks.appStatus(match[1], payload, topic);
				return;
			}
		}
		
		// catch all which logs the receipt of an unexpected message
		self.logger.warn("Message received on unexpected topic"+", "+topic+", "+payload);
	});
};



IoTAppClient.prototype.disconnectBroker = function(){
	this.checkMqtt();
	this.mqttClient.end();
	this.mqttClient = null;
};


/**
* on - register <callback> for <type>
* 
* @param {String} type - one of 'deviceEvent', 'deviceCommand', 'deviceStatus', 'appStatus'
* @param {Function} callback - the callback to be registered for the message type
* @returns {IoTAppClient} this - for chaining
*/
IoTAppClient.prototype.on = function(type, callback){
	if(inArray(SUPPORTED_CALLBACKS, type)){
		this.callbacks[type] = callback;
	} else {
		this.logger.warn("The callback of type " + type + " is not suported");
	}
	return this;
};


/**
 * subscribe - subscribe to <topic>
 *
 * @param {String} topic - topic to subscribe to
 * @returns {IoTAppClient} this - for chaining
 */
IoTAppClient.prototype.subscribeToTopic = function(topic){
	this.checkMqtt();
	this.logger.trace("Subscribe: "+", "+topic);
	this.mqttClient.subscribe(topic, {qos: 0});
	this.subscriptions[this.subscriptionCount] = topic;
	this.subscriptionCount++;
	this.logger.trace("Freshly Subscribed to: " +	this.subscriptions[this.subscriptionCount - 1]);
	return this;
};

/**
 * publish - publish <msg> to <topic>
 *
 * @param {String} topic - topic to publish to
 * @param {String} msg - message to publish
 * @returns {IoTAppClient} this - for chaining
 */
IoTAppClient.prototype.publish = function(topic, msg){
	this.checkMqtt();
	this.logger.trace("Publish: "+", "+topic+", "+msg);
	this.mqttClient.publish(topic, msg);
	return this;
};


/**
 * subscribeToDeviceEvents - builds and subscribes to iot-2/type/<type>/id/<id>/evt/<event>/fmt/<format>
 *
 * @param {String} type
 * @param {String} id
 * @param {String} event
 * @param {String} format
 * @returns {IoTAppClient} this - for chaining
 */
IoTAppClient.prototype.subscribeToDeviceEvents = function(type, id, event, format){
	var topic = "iot-2/type/" + type + "/id/" + id + "/evt/"+ event + "/fmt/" + format;
	this.subscribeToTopic(topic);
	return this;
};


/**
 * subscribeToDeviceCommands - builds and subscribes to iot-2/type/<type>/id/<id>/cmd/<command>/fmt/<format>
 *
 * @param {String} type
 * @param {String} id
 * @param {String} command
 * @param {String} format
 * @returns {IoTAppClient} this - for chaining
 */
IoTAppClient.prototype.subscribeToDeviceCommands = function(type, id, command, format){
	var topic = "iot-2/type/" + type + "/id/" + id + "/cmd/"+ command + "/fmt/" + format;
	this.subscribeToTopic(topic);
	return this;
};


/**
 * subscribeToDeviceStatus - builds and subscribes to iot-2/type/<type>/id/<id>/mon
 *
 * @param {String} type
 * @param {String} id
 * @returns {IoTAppClient} this - for chaining
 */
IoTAppClient.prototype.subscribeToDeviceStatus = function(type, id){
	var topic = "iot-2/type/" + type + "/id/" + id + "/mon";
	this.subscribeToTopic(topic);
	return this;
};


/**
 * subscribeToAppStatus - builds and subscribes to iot-2/app/id/<id>/mon
 *
 * @param {String} id
 * @returns {IoTAppClient} this - for chaining
 */
IoTAppClient.prototype.subscribeToAppStatus = function(id){
	var topic = "iot-2/app/" + id + "/mon";
	this.subscribeToTopic(topic);
	return this;
};


/**
 * publishDeviceEvent - builds and publishes to iot-2/type/<type>/id/<id>/evt/<event>/fmt/<format>
 *
 * @param {String} type
 * @param {String} id
 * @param {String} event
 * @param {String} format
 * @param {Object} data
 * @returns {IoTAppClient} this - for chaining
 */
IoTAppClient.prototype.publishDeviceEvent = function(type, id, event, format, data){
	var topic = "iot-2/type/" + type + "/id/" + id + "/evt/" + event + "/fmt/" + format;
	this.publish(topic, data);
	return this;
};

/**
 * publishDeviceCommand - builds and publishes to iot-2/type/<type>/id/<id>/cmd/<command>/fmt/<format>
 *
 * @param {String} type
 * @param {String} id
 * @param {String} command
 * @param {String} format
 * @param {Object} data
 * @returns {IoTAppClient} this - for chaining
 */
IoTAppClient.prototype.publishDeviceCommand = function(type, id, command, format, data){
	var topic = "iot-2/type/" + type + "/id/" + id + "/cmd/" + command + "/fmt/" + format;
	this.publish(topic, data);
	return this;
};

/**
* checkMqtt - convenience method: checks connectMqtt() method has been called, throwing an exception if not
*/
IoTAppClient.prototype.checkMqtt = function(){
	if(!this.mqttClient){
		throw new Error('This method cannot be called until MQTT client has been initialized (see connectMqtt() method)');
	}
};




/*
 ************************************************************************
 * API Support
 ************************************************************************
 */

/**
* callApi -convenience method for making calls to the IoT ReST API
* 
* @param {String} method - HTTP Method for request
* @param {Integer} expectedHttpCode - expected HTTP code in response from server. If not as expected, promise will reject.
* @param {Boolean} expectJsonContent - if set, will attempt to parse server response into JSON
* @param {Array} paths - array of strings, each element will expand to a single path-level in URI to call. Can be null.
* 	Example:  E.g. ['devices', 'type1'] will result in a call to: (<apiHost>/api/v0001/organizations)/devices/type1
* @param {String} body - body of HTTP request to send, can be null
* @returns {Promise} promise. 
* 		If all goes well, promise resolves with a JSON object if expectJsonContent set, or a string otherwise. 
* 		If there is an error, promise will be rejected with an Error object containing a descriptive message.
*/
IoTAppClient.prototype.callApi = function(method, expectedHttpCode, expectJsonContent, paths, body){
	var deferred = Q.defer();
	var uri = this.apiHost + '/api/v0001/organizations/' + this.orgId;
	if(paths){
		for(i in paths){
			uri += '/'+paths[i];
		}
	}	
	this.logger.trace("callApi: "+method+", "+uri);
	request(
			uri,
			{
				method: method,
				rejectUnauthorized: this.rejectUnauthorized,
				body: body,
				auth: {
					user: this.apiKey,
					pass: this.apiToken,
					sendImmediately: true
				},
				headers: {'Content-Type': 'application/json'}
			},		
			function (error, response, body) {
				if(error){
					deferred.reject(error);
				}else{
					if(response.statusCode == expectedHttpCode){
						if(expectJsonContent){
							try{
								deferred.resolve(JSON.parse(body));
							} catch (ex){
								deferred.reject(ex);
							}
						}else{
							deferred.resolve(body);
						}
					}else{
						deferred.reject(new Error(method+" "+uri+": Expected HTTP "+expectedHttpCode+" from server but got HTTP "+response.statusCode));
					}
				}
			}
	);
	return deferred.promise;
};

// TODO: interpret HTTP response codes and produce context-sensitive meaningful errors

IoTAppClient.prototype.getOrganizationDetails = function(){
	this.logger.trace("getOrganizationDetails()");
	return this.callApi('GET', 200, true, null, null);
};

IoTAppClient.prototype.listAllDevices = function(){
	this.logger.trace("listAllDevices()");
	return this.callApi('GET', 200, true, ['devices'], null);
};

IoTAppClient.prototype.listAllDevicesOfType = function(type){
	this.logger.trace("listAllDevicesOfType("+type+")");
	return this.callApi('GET', 200, true, ['devices', type], null);
};

IoTAppClient.prototype.listAllDeviceTypes = function(){
	this.logger.trace("listAllDeviceTypes()");
	return this.callApi('GET', 200, true, ['device-types'], null);
};

IoTAppClient.prototype.registerDevice = function(type, id, metadata){
	this.logger.trace("registerDevice("+type+", "+id+", "+metadata+")");
	// TODO: field validation
	var body = {
			type: type,
			id: id,
			metadata: metadata
	};
	return this.callApi('POST', 201, true, ['devices'], JSON.stringify(body));
};

IoTAppClient.prototype.unregisterDevice = function(type, id){
	this.logger.trace("unregisterDevice("+type+", "+id+")");
	return this.callApi('DELETE', 204, false, ['devices', type, id], null);
};

IoTAppClient.prototype.updateDevice = function(type, id, metadata){
	this.logger.trace("updateDevice("+type+", "+id+", "+metadata+")");
	var body = {
			metadata: metadata
	};
	return this.callApi('PUT', 200, true, ['devices', type, id], JSON.stringify(body));
};

IoTAppClient.prototype.getDeviceDetails = function(type, id){
	this.logger.trace("getDeviceDetails("+type+", "+id+")");
	return this.callApi('GET', 200, true, ['devices', type, id], null);
};

