var sessions = require('../../lib/sessions.js');
var express = require('express');

var router = express.Router();

router.get('/', function(req, res) {
  res.end('POST to /api/v1/auth/login');
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
        res.cookie('token',token, { maxAge: 900000 });
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
  if (req.body.username && req.body.password) {
    sessions.createUser(req.body, function(err, data) {
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
