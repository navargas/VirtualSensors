var express = require('express');
var sessions = require('./lib/sessions.js');
var bodyParser = require('body-parser');
var cookieParser = require('cookie-parser');
var handlebarsExpress = require('express-handlebars');
var partials = require('express-partials');
var iot = require('./lib/iot.js');
var conf = require('./lib/loadConfig.js');
var V1 = './routes/v1/';

iot.init();
conf.read('config.json');

// defensiveness against errors parsing request bodies...
process.on('uncaughtException', function (err) {
  console.log('Caught exception: ' + err.stack);
});

var app = express();
partials.register('.hbs', handlebarsExpress);
app.use(cookieParser());
app.use(partials());
app.engine('hbs', handlebarsExpress());
app.set('view engine', 'hbs');
app.set('views', __dirname + '/views');

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended:true}));
app.use('/api/v1/sensors', require(V1 + 'sensors.js'));
app.use('/api/v1/auth',    require(V1 + 'auth.js'));
app.use('/', require('./routes/ui.js'));
app.use('/public', express.static(__dirname + '/public'));

app.listen(process.env.VCAP_APP_PORT || 80);
