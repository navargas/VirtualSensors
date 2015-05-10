var fs = require("fs");

var values;

exports.read = function(filepath) {
  if (!fs.existsSync(filepath)) return null;
  var data = fs.readFileSync(filepath);
  values = JSON.parse(data.toString());
  return values;
};

exports.expect = function() {
  if (!values) return false;
  for (var property = 0; property < arguments.length; property++) {
    if (!values.hasOwnProperty(arguments[property])) return false;
  }
  return true;
};
