
var express = require('express');
var sessions = require('../lib/sessions.js');
var router = express.Router();
var debug = true;

router.get('/', function(req, res) {
  if (sessions.isValidSession(req) || debug) {
    var data = {"cards":[{"name":"temp1", "value":23},
                         {"name":"temp2", "value":42},
                         {"name":"Power Usage", "value":82}]};
    res.render('index', data);
  } else {
    res.render('login');
  }
});

module.exports = router;
