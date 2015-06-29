var nano = require('nano');
var design = {
  "_id": "_design/tickets",
  "views": {},
  "language": "javascript",
  "indexes": {
    "incident_number": {
      "analyzer": "standard",
      "index": "function(doc){\n index(\"id\", doc.incident_number);\n}"
    }
  }
};

var metaDB = null;
var USERNAME;
var PASSWORD;
var APIURL;
var POSTFIX;

exports.init = function(apiUrl, username, password, postfix, optional_callback) {
  USERNAME = username;
  PASSWORD = password;
  APIURL = apiUrl;
  POSTFIX = postfix || '';
  exports.authenticate(optional_callback);
};

exports.authenticate = function(optional_callback) {
  var dbname = 'virtualsensors' + POSTFIX;
  console.log('Connecting to', dbname);
  nano(APIURL).auth(USERNAME, PASSWORD, function(err, body, headers) {
    if (err) {
      console.log(err);
    }
    var auth = headers['set-cookie'][0].split(';')[0];
    var repo = nano({
      url: APIURL,
      cookie: auth
    });
    console.log('Authentication complete');

    metaDB = repo.use(dbname);
    if (optional_callback) optional_callback();
  });
}

exports.getObjectDB = function() {
  return metaDB;
};
