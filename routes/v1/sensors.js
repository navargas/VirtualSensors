var express = require('express');
var sessions = require('../../lib/sessions.js');
var env = require('../../lib/loadConfig.js').values;
var router = express.Router();

router.get('/', sessions.verify, function(req, res) {
  var devs = sessions.getDevices(req);
  console.log("Devices", devs);
  res.send(devs);
  res.end();
});

router.post('/', sessions.verify, function(req, res) {
  if (!req.body.device) {
    req.body.device = {
      "unit": req.body.unit,
      "name": req.body.name,
      "min": parseInt(req.body.min),
      "max": parseInt(req.body.max),
      "interval": req.body.interval
    };
  }
  var info = sessions.addDevice(req, req.body.device);
  if (req.query.redirect) {
    res.redirect('/');
    res.end();
    return;
  };
  info.status = 'ok';
  res.send(info);
  res.end();
});

router.get('/profiles', sessions.verify, function(req, res) {
  res.send(sessions.getProfiles(req));
  res.end();
});

router.post('/profiles', sessions.verify, function(req, res) {
  console.log(req.body.profile);
  if (req.body.cmd == 'delete')
    res.send(sessions.deleteProfile(req, req.body.profilename));
  else
    res.send(sessions.setProfile(req, req.body.profile));
  res.end();
});

router.get('/delete', sessions.verify, function(req, res) {
  var devName = req.query.device;
  var info = sessions.removeDevice(req, devName);
  res.redirect('/');
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
