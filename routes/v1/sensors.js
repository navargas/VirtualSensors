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
  if (!req.body.device) {
    res.send({"error":"Missing or invalid device"});
  }
  var info = sessions.addDevice(req, req.body.device);
  info.status = 'ok';
  res.send(info);
  res.end();
});

router.delete('/:sensor', sessions.verify, function(req, res) {
  //get sensor info
  var devName = req.params.sensor;
  var info = sessions.removeDevice(req, devName);
  res.send(info);
  res.end();
});

module.exports = router;
