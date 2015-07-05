var express = require('express');
var sessions = require('../lib/sessions.js');
var nav = require('../lib/nav.js');
var env = require('../lib/loadConfig.js').read('config.json');
var OAuth2 = require('googleapis').auth.OAuth2;
var useOauth = true;
var router = express.Router();
var oauth2Client = null;
var DEBUG_USER = 'DEV-USER-001'
var TOKEN_AGE = 900000000;

var NOTICES = [
  {"name":"helplink",
   "title":"Hello!",
   "message": "Welcome to Team IT's VirtualSensors. Click the \"Help\" link at the top of each page to get more info."}
];

if (env.CLIENT_ID && env.CLIENT_SECRET && env.REDIRECT_URL) {
  var oauth2Client = new OAuth2(env.CLIENT_ID, env.CLIENT_SECRET, env.REDIRECT_URL);
  useOauth = true;
} else {
  useOauth = false;
}

router.get('/', function(req, res) {
  if (sessions.isValidSession(req)) {
    var user = sessions.getUser(req);
    var devices = sessions.getDevices(req);
    devices = nav.demap(devices).values;
    console.log('GET: devices', devices);
    var data = {"cards":devices};
    data.layout = 'blank';
    data.username = user.username;
    if (user.google && user.google.displayName) {
      data.username = user.google.displayName;
    }
    res.render('index', data);
  } else if (useOauth) {
    var url = oauth2Client.generateAuthUrl({"scope":"email", "response_type":"code"});
    res.render('login', {"layout":"blank","hidelogout":true,"oauthurl":url});
  } else {
    if (!sessions.user(DEBUG_USER)) {
      sessions.createUser(DEBUG_USER, null, null);
      console.log('DEBUG USER CREATED');
    }
    var token = sessions.makeSession(DEBUG_USER);
    console.log('DEBUG USER AUTHENTICATED');
    res.cookie('token',token, { maxAge: TOKEN_AGE });
    res.redirect('/');
    res.end();
  }
});

router.get('/customdevice', sessions.verify, function(req, res) {
  res.render('customdevice', {"layout":"blank"});
});

router.get('/newdevice', sessions.verify, function(req, res) {
  var templates = sessions.getProfiles(req);
  var currentTemplate = req.cookies.template;
  console.log('cookies', req.cookies);
  if (!templates[currentTemplate]) {
    res.cookie('template', Object.keys(templates)[0]);
    currentTemplate = Object.keys(templates)[0];
  }
  var data = {
    "layout":"blank",
    "options": [],
    "template":currentTemplate,
    "templates":[]
  };
  for (name in templates) {
    if (!templates.hasOwnProperty(name)) continue;
    var templateObj = {"name":name};
    if (name == currentTemplate) {
      data.templates.unshift(templateObj);
      var variables = templates[name].variables;
      for (variable in variables) {
        if (!variables.hasOwnProperty(variable)) continue;
        if (variables[variable].type == 'static') {
          data.options.push({"name":variable});
        }
      }
    } else {
      data.templates.push(templateObj);
    }
  }
  if (data.templates.length == 0) {
    data.templates.push({"name":"none found"});
  }
  console.log('sending...', data);
  res.render('newdevice', data);
});

router.get('/cards', function(req, res) {
  if (sessions.isValidSession(req)) {
    var devices = sessions.getDevices(req);
    var topic = sessions.getOrg(req).topic;
    devices = nav.demap(devices).values;
    var ack = sessions.getAcknowledge(req);
    var data = {"cards":devices, "topic":topic, "notices":[]};
    for (notice in NOTICES) {
      if (!NOTICES.hasOwnProperty(notice)) continue;
      if (!(notice in ack)) data.notices.push(NOTICES[notice]);
    };
    res.render('cards', data);
  } else {
    res.send('error').end();
  }
});

module.exports = router;
