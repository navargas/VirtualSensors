/* 
 *
                            CloudObject
                            -----------
      Local javascript object which asynchronously maintains an
      remote backup using .insert() and .get() database methods     


= Initialization ====================================================

var cloudObj = new CloudObject('remoteName', database);

var cloudObj = new CloudObject('remoteName', database, baseObject);

Where 'remoteName' is the name of the document in the database,
database is the database object and optional baseObject will fill
new cloudObj with properties of baseObject

= Usage =============================================================

When using local data, use cloudObj like any other JS object

cloudObj.newProperty = 'foo';     // backup occurs in background
doAction(cloudObj.newProperty);   // property available immediately
_____________________________________________________________________

Normally you will not need to worry about syncronization at all.
Read and writes to the cloud object will occur in the background
and are accessed directly from memory. HOWEVER, when the program
first starts up, the backup object needs to be downloaded from
the internet. This will take an unknown ammount of time and until
it finishes, your cloud object will contain only the properties in
the optional baseObject. For some applications this will not be an
issue. With a web app for example it is reasonable to assume no
requests will be made the instant that the server starts. In the
case that startup behavior does matter, you will need to consider
the following.

The startup syncronization rules are as follows:

1) The intial (optional) baseObject is seen as the least relevant data.
   If a property exists in the database which matches a property in
   baseObject, the local data will be replaced with the server data.

      Example:
        OBJECT IN DATABASE
          { foo: "I exist online!" }

        ONJECT USED FOR "baseObject":
          { foo: "I exist locally" } 

        CODE
          var o = CloudObject('docname', db, baseObject);
          console.log('While data is downloading', o.foo);
              --- some time later ---
          console.log('After data has downloaded', o.foo);

        OUTPUT
          While data is downloading: I exist locally
          After data has downloaded: I exist online!

        AFTER - OBJECT IN DATABASE
          { foo: "I exist online!" }

2) An assignment will always be considered as having the most
   relevant data.

      Example:
        OBJECT IN DATABASE
          { foo: "I exist online!" }

        CODE
          var o = CloudObject('docname', db);
          o.foo = 'I will always overwrite';
          console.log('After assignment:', o.foo);

        OUTPUT
          After assignment: I will always overwite

        AFTER - OBJECT IN DATABASE
          { foo: "I will always overwite" }
_____________________________________________________________________

If you wish to remove any uncertain startup behavior, you can use a
callback. If the initial download is complete, this callback will be
called immediately.

cloudObj._ready(function () {
  doAction(cloudObj.remoteProperty);
});
_____________________________________________________________________

*/
var util = require('util');

var NULLWRITE = function() {};

var Cloudobj = function(documentName, database, documentObject) {
  this._docName = documentName;
  this._db = database;
  this._docObj = documentObject;
  this._readyCallbacks = [];
  this._updatedProperties = [];
  this._isReady = false;
  this._writing = false;
  this._queue = [];
};

Cloudobj.prototype._toStandardObject = function() {
  return this._docObj;
}

Cloudobj.prototype._ready = function(callback) {
  if (this._isReady) callback();
  else this._readyCallbacks.push(callback);
}

Cloudobj.prototype._merge = function(newObject) {
  /* logic:
   *    move all properties in new to this. */
  for (prop in newObject) {
    if (!newObject.hasOwnProperty(prop)) continue;
    this._docObj[prop] = newObject[prop];
  }
};

Cloudobj.prototype._resolveConflict_overwriteRemote = function(callback) {
  var target = this;
  this._download(function(err, remote) {
    if (!remote) {
      if (callback) callback('remote does not exist');
      return;
    }
    console.log('Remote _rev', remote._rev);
    target._rev = remote._rev;  
    if (callback) callback();
  }, true);
};

Cloudobj.prototype._upload = function(callback) {
  var target = this;
  console.log('Attempting to upload', this._docName);
  var db = this._db.getObjectDB();
  db.insert(this._docObj, this._docName, function(err, body) {
    if (err) {
      console.log('got error', err.error);
      if (err.error === 'conflict') {
        console.log('_rev mismatch for', target._docName, 'resolving conflict',
                    'at', target._rev);
        var oldRev = target._rev;
        target._resolveConflict_overwriteRemote(function(err) {
          var newRev = target._rev;
          if (oldRev === newRev) {
            console.log('Error with object', target._docName,
                        'resolution failed at ', newRev);
            if (callback) callback('error rev unchanged');
            return;
          } else {
            target._upload(function(err) {
              if (err) console.log(err);
              else console.log('Upload complete');
            });
          }
        });
      } else if (err.error === 'credentials_expired') {
        target._db.authenticate(target._upload);
      }
      if (callback) callback(err);
      return;
    } else {
      target._rev = body.rev;
      if (callback) callback();
    }
  });
};

Cloudobj.prototype._download = function(callback, nochange) {
  var target = this;
  var db = this._db.getObjectDB();
  db.get(this._docName, function(err, body) {
    if (err) {
      if (callback) callback(err); return;
    } else {
      if (nochange != true) target._merge(body);
      if (callback) callback(null, body);
      return;
    }
  });
};

module.exports = function(documentName, database, documentObject) {
  documentName = documentName;
  if (!documentObject) documentObject = {};
  var p = new Cloudobj(documentName, database, documentObject);
  try {
    var test = Proxy;
  }
  catch(err) {
    console.error('\nProblem: Proxy feature not enabled.');
    console.error('CloudObject will not sync to cloud.');
    console.error('Run again with \'--harmony_proxies\' to enable syncing.\n');
    return documentName;
  }
  var proxy = Proxy.create(handlerMaker(p));
  return proxy;
};




/* ~~~ Javascript ES6 proxy magic ~~~ */
function handlerMaker(obj) {
  return {
    // Fundamental traps
    getOwnPropertyDescriptor: function(name) {
      var desc = Object.getOwnPropertyDescriptor(obj._docObj, name);
      // a trapping proxy's properties must always be configurable
      if (desc !== undefined) { desc.configurable = true; }
      return desc;
    },
    getPropertyDescriptor:  function(name) {
      var desc = Object.getPropertyDescriptor(obj._docObj, name); // not in ES5
      // a trapping proxy's properties must always be configurable
      if (desc !== undefined) { desc.configurable = true; }
      return desc;
    },
    getOwnPropertyNames: function() {
      return Object.getOwnPropertyNames(obj._docObj);
    },
    getPropertyNames: function() {
      return Object.getPropertyNames(obj._docObj);                // not in ES5
    },
    defineProperty: function(name, desc) {
      Object.defineProperty(obj._docObj, name, desc);
    },
    delete:       function(name) { return delete obj._docObj[name]; },   
    fix:          function() {
      if (Object.isFrozen(obj._docObj)) {
        return Object.getOwnPropertyNames(obj._docObj).map(function(name) {
          return Object.getOwnPropertyDescriptor(obj._docObj, name);
        });
      }
      // As long as obj._docObj is not frozen, the proxy won't allow itself to be fixed
      return undefined; // will cause a TypeError to be thrown
    },
   
    // derived traps
    has:          function(name) {
                    return name in obj._docObj;
                  },
    hasOwn:       function(name) {
                    return Object.prototype.hasOwnProperty.call(obj._docObj, name);
                  },
    get:          function(receiver, name) {
                    return obj._docObj[name] || obj[name]; 
                  },
    set:          function(receiver, name, val) {
                    NULLWRITE('Setting', name);
                    if (name == '_rev' || name.indexOf('_') != 0) {
                      if (name != '_rev') {
                        obj._updatedProperties.push(name);
                      }
                      obj._docObj[name] = val;
                      NULLWRITE('Child');
                    } else {
                      obj[name] = val;
                      NULLWRITE('Parent');
                    }
                    return true;
                  }, // bad behavior when set fails in non-strict mode
    enumerate:    function() {
      var result = [];
      for (name in obj._docObj) { result.push(name); };
      return result;
    },
    keys: function() { return Object.keys(obj._docObj) }
  };
}
