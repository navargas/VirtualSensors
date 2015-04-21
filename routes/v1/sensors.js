var express = require('express');
var sessions = require('../../lib/sessions.js');
var router = express.Router();

router.get('/', sessions.verify, function(req, res) {
  res.send([ {
    "name":"exampleSensor1",
    "id":"uid1237324982374983274",
    "value":3
  }]);
  res.end();
});

module.exports = router;
