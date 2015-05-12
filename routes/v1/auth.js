var sessions = require('../../lib/sessions.js');
var express = require('express');
var env = require('../../lib/loadConfig.js').read('config.json');
var google = require('googleapis');
var OAuth2 = google.auth.OAuth2;
var TOKEN_AGE = 900000000;
var router = express.Router();

router.get('/', function(req, res) {
  res.end('POST to /api/v1/auth/login');
});

router.get('/oauth', function(req, res) {
  var code = req.query.code;
  var oauth2Client = new OAuth2(env.CLIENT_ID, env.CLIENT_SECRET, env.REDIRECT_URL);
  oauth2Client.getToken(code, function(err, tokens) {
    oauth2Client.setCredentials(tokens);
    google.plus('v1').people.get({userId: 'me', auth: oauth2Client}, function(err, profile) {
      console.log('profile', profile);
      if (err) {
        console.log('err', err);
        res.redirect('/?error=true');
        res.end();
        return;
      } 
      if (!sessions.user(profile.id)) {
        sessions.createUser(profile.id, null, profile);
      }
      var token = sessions.makeSession(profile.id);
      res.cookie('token',token, { maxAge: TOKEN_AGE });
      res.redirect('/');
      res.end();
    });
  });
});

router.get('/logout', function(req, res) {
  var rStat = sessions.deleteSession(req);
  if (req.query.redirect == "true") {
    res.redirect('/');
    res.end();
  } else {
    res.send(rStat);
    res.end();
  }
});

router.get('/log', function(req, res) {
  sessions.log();
  res.end();
});

router.post('/login', function(req, res) {
  if (req.body.username && req.body.password) {
    sessions.authenticate(req.body.username, req.body.password, function(err, token) {
      if (err) {
        res.send({"error":err});
        res.end();
      } else {
        res.cookie('token',token, { maxAge: TOKEN_AGE });
        if (req.query.redirect == 'yes') {
          res.redirect('/');
          res.end();
        } else {
          res.send({"token":token});
          res.end();
        }
      }
    });
  } else {
    res.send({"error":"Username or password not provided. Post JSON data"});
    res.end();
  }
});

router.get('/org', sessions.verify, function(req, res) {
  var info = sessions.getOrg(req);
  res.send(info);
  res.end();
});

router.post('/users', function(req, res) {
  if (!env.debug) {
    res.send({"error":"debug mode not enabled"});
    res.end();
    return;
  }
  if (req.body.username && req.body.password) {
    sessions.createBcryptUser(req.body, function(err, data) {
      if (err) {
        res.send({"error":err});
        res.end();
      } else {
        res.send({"username":req.body.username, "status":"ok"});
        res.end();
      }
    });
  } else {
    res.send({"error":"Username/password not provided"});
    res.end();
  }
});

module.exports = router;
