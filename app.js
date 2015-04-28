var express = require('express');
var sessions = require('./lib/sessions.js');
var bodyParser = require('body-parser');
var cookieParser = require('cookie-parser');
var handlebarsExpress = require('express-handlebars');
var iot = require('./lib/iot.js');
iot.init();
var V1 = './routes/v1/';

// defensiveness against errors parsing request bodies...
process.on('uncaughtException', function (err) {
  console.log('Caught exception: ' + err.stack);
});

var app = express();
app.use(cookieParser());
app.engine('hbs', handlebarsExpress());
app.set('view engine', 'hbs');
app.set('views', __dirname + '/views');

//app.get('/', function(req, res) {
//  res.end("ok");
//});

app.use(bodyParser.json());
app.use(bodyParser.urlencoded());
app.use('/api/v1/sensors', require(V1 + 'sensors.js'));
app.use('/api/v1/auth',    require(V1 + 'auth.js'));
app.use('/', require('./routes/ui.js'));

app.listen(process.env.VCAP_APP_PORT || 80);
