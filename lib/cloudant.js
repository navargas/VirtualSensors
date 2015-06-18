var nano = require('nano');
var db = null;
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

var rcaDB = null;
var metaDB = null;

exports.init = function(apiUrl, username, password, optional_callback) {
  nano(apiUrl).auth(username, password, function(err, body, headers) {
    if (err) {
      console.log(err);
    }
    var auth = headers['set-cookie'][0].split(';')[0];
    var repo = nano({
      url: apiUrl,
      cookie: auth
    });
    console.log('Authentication complete');

    db = repo.use('problem_tickets');
    rcaDB = repo.use('rca');
    metaDB = repo.use('virtualsensors');
    if (optional_callback) optional_callback();
  });
};

exports.write = function(object, callback) {
  db.insert(object, callback);
};

exports.getTicket = function(incident_number, callback) {
  var query = 'id:' + incident_number.toString();
  db.search('tickets', 'incident_number', { q: query }, function(err, doc) {
    if (doc.total_rows === 0) {
      callback("Object does not exist", {});
    } else {
      db.get(doc.rows[0].id, callback);
    }
  });
};

exports.removeTicket = function(incident_number, callback) {
  exports.getTicket(incident_number, function(err, doc) {
    if (err) {
      callback(err, {});
    } else {
      db.destroy(doc._id, doc._rev, callback);
    }
  });
};

exports.updateTicket = function(incident_number, property, value, callback) {
  exports.getTicket(incident_number, function(err, doc) {
    if (!err) {
      doc[property] = value;
      exports.write(doc, callback);
    } else {
      callback(err, {});
    }
  });
};

exports.getRCADB = function() {
  return rcaDB;
};
exports.getMetaDB = function() {
  return metaDB;
};
