
var express = require('express');
var sessions = require('../lib/sessions.js');
var router = express.Router();

router.get('/', function(req, res) {
  res.render('login');
});

module.exports = router;
