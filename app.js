var express = require('express');
var sessions = require('./lib/sessions.js');
var bodyParser = require('body-parser');


var V1 = './routes/v1/';

// defensiveness against errors parsing request bodies...
process.on('uncaughtException', function (err) {
  console.log('Caught exception: ' + err.stack);
});

var app = express();

app.get('/', function(req, res) {
  res.end("ok");
});

app.use(bodyParser.json());
app.use('/api/v1/sensors', require(V1 + 'sensors.js'));
app.use('/api/v1/auth',    require(V1 + 'auth.js'));

app.listen(process.env.VCAP_APP_PORT || 80);
