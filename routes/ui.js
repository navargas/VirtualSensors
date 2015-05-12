var express = require('express');
var sessions = require('../lib/sessions.js');
var nav = require('../lib/nav.js');
var env = require('../lib/loadConfig.js').read('config.json');
var OAuth2 = require('googleapis').auth.OAuth2;
var oauth2Client = new OAuth2(env.CLIENT_ID, env.CLIENT_SECRET, env.REDIRECT_URL);
var router = express.Router();
var debug = true;

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
  } else {
    var url = oauth2Client.generateAuthUrl({"scope":"email", "response_type":"code"});
    res.render('login', {"layout":"blank","oauthurl":url});
  }
});

router.get('/newdevice', function(req, res) {
  var data = {"layout":"blank"}
  res.render('newdevice', data);
});

router.get('/cards', function(req, res) {
  if (sessions.isValidSession(req)) {
    var devices = sessions.getDevices(req);
    var topic = sessions.getOrg(req).topic;
    devices = nav.demap(devices).values;
    var data = {"cards":devices, "topic":topic};
    res.render('cards', data);
  } else {
    res.send('error').end();
  }
});

module.exports = router;
