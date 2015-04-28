var express = require('express');
var sessions = require('../../lib/sessions.js');
var router = express.Router();

router.get('/', sessions.verify, function(req, res) {
  var devs = sessions.getDevices(req);
  console.log("Devices", devs);
  res.send(devs);
  res.end();
});

router.post('/', sessions.verify, function(req, res) {
  console.log("Adding device:", req.body);
  if (!req.body.device) {
    res.send({"error":"Missing or invalid device"});
  }
  var info = sessions.addDevice(req, req.body.device);
  res.send(info);
  res.end();
});

router.delete('/:sensor', sessions.verify, function(req, res) {
  //get sensor info
  var uid = req.params.sensor;
  var info = sessions.removeDevice(req, uid);
  res.send(info);
  res.end();
});

module.exports = router;
