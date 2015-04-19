var express = require('express');
var sessions = require('../../lib/sessions.js');
var router = express.Router();

router.get('/', sessions.verify, function(req, res) {
   res.end('ok sensors');
});

module.exports = router;
