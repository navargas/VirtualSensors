var express = require('express');
//var settings = require('./bluemix-settings.js'); 
var settings;
if (!settings) {
   settings = {};
}
console.log("", settings);

// defensiveness against errors parsing request bodies...
process.on('uncaughtException', function (err) {
   console.log('Caught exception: ' + err.stack);
});

var app = express();

app.get('/', function(req, res) {
   res.end("ok");
});

app.listen(process.env.VCAP_APP_PORT || 80);
