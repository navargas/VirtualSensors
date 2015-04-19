var sessions = require('../../lib/sessions.js');
var express = require('express');

var router = express.Router();

//  if (!sessions.verify(req.body.token)) res.end('noauth');
//var route = function(
router.get('/', function(req, res) {
  res.end('POST {username:..., password:..} to /v1/auth/session');
});

router.post('/sessions', function(req, res) {
  if (req.body.username && req.body.password) {
    var token = sessions.authenticate(req.body.username, req.body.password);
    res.send({"token":token});
  } else {
    res.send({"error":"Username or password not provided. Post JSON data"});
  }
  res.end();
});

router.post('/accounts', function(req, res) {
  res.send(sessions.data);
});

module.exports = router;
