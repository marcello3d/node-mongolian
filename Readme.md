Mongolian DeadBeef
==================
Mongolian DeadBeef is an awesome Mongo DB node.js driver that attempts to closely approximate the [mongodb shell][1].

[![Build Status](https://secure.travis-ci.org/marcello3d/node-mongolian.png)](http://travis-ci.org/marcello3d/node-mongolian)

Introduction
------------
Mongolian DeadBeef and its documentation is super under construction! Go check out [examples/mongolian_trainer.js][2]
and the rest of the source!

Unlike other MongoDB node.js drivers, Mongolian DeadBeef is built from the ground up for node.js, using
[node-buffalo][3] for BSON/message serialization.

v0.1.15 Upgrade notes
---------------------
0.1.15 uses [node-buffalo][3] instead of mongodb-native for serialization, this means a few incompatibilities:

+ The helper methods on `ObjectId` are removed, use the `ObjectId` constructor to parse hex strings
+ `Code` type is removed, use vanilla function instances instead
+ `DBRef` is not supported
+ Error messages may be different

Installation
------------
**DISCLAIMER: The API is experimental (but stabilizing). I will be adding, removing, and changing the API in the
interest of a solid API. Use at your own risk**

You can either clone the source and install with `npm link`, or install the latest published version from npm with
`npm install mongolian`.

Running Tests
-------------
Run the tests with `npm test`.

Motivation
----------
Not a fan of existing asynchronous mongodb apis for node.js, I set out to write my own. To avoid completely reinventing
the wheel, much of the Mongolian DeadBeef API is inspired by the [mongodb shell][1].

High level principles:

* Less is more
  * Nothing is added without careful consideration
  * Remove everything but the essentials
  * Each refactor should remove as much unnecessary lines of code as possible
* Fail early and often
  * If I can easily detect a programmer error, an exception will be thrown

Notes:

* mongodb is pretty simple, much of its functionality is defined as queries on special databases
  * This allows for lots of code reuse
* Avoid callbacks unless they are absolutely necessary

Basics
------
Most of the work in MongolianDeadBeef doesn't occur until a query is actually made. This means that simple operations
are fast and synchronous. Currently there is one connection per server.

Examples
--------

    var Mongolian = require("mongolian")

    // Create a server instance with default host and port
    var server = new Mongolian

    // Get database
    var db = server.db("awesome_blog")

    // Get some collections
    var posts = db.collection("posts")
    var comments = db.collection("comments")

    // Insert some data
    posts.insert({
        pageId: "hallo",
        title: "Hallo",
        created: new Date,
        body: "Welcome to my new blog!"
    })

    // Get a single document
    posts.findOne({ pageId: "hallo" }, function(err, post) {
        ...
    })

    // Document cursors
    posts.find().limit(5).sort({ created: 1 }).toArray(function (err, array) {
        // do something with the array
    })
    posts.find({ title: /^hal/ }).forEach(function (post) {
        // do something with a single post
    }, function(err) {
        // handle errors/completion
    })

Connections and Authentication
------------------------------
    // Create a server with a specific host/port
    var server = new Mongolian("mongo.example.com:12345")


    // Authenticate a database
    db.auth(username, password)


    // Supported connection url format: [mongo://][username:password@]hostname[:port][/databasename]
    // Use uri-encoding for special characters in the username/password/database name

    // Database/auth shorthand (equivalent to calling db() and auth() on the resulting server)
    var db = new Mongolian("mongo://username:password@mongo.example.com:12345/database")

    // Connecting to replicasets:
    var server = new Monglian(
        "server1.local",
        "server2.local",
        "server3.local:27018"
    )

Logging
-------
By default, Mongolian logs to console.log, but you can override this by specifying your own log object (any object that
provides `debug`, `info`, `warn`, and `error` methods):

    var server = new Mongolian({
        log: {
            debug: function(message) { ... },
            info: function(message) { ... },
            warn: function(message) { ... },
            error: function(message) { ... }
        }
    })

    var server = new Mongolian('server1.local', 'server2.local', {
        log: { ... }
    })

BSON Data Types
---------------
Mongolian DeadBeef uses [node-buffalo][3]'s BSON serialization code. Most BSON types map directly to JavaScript types,
here are the ones that don't:

    var Long =      require('mongolian').Long       // goog.math.Long - http://closure-library.googlecode.com/svn/docs/class_goog_math_Long.html
    var ObjectId =  require('mongolian').ObjectId   // new ObjectId(byteBuffer or hexString)
    var Timestamp = require('mongolian').Timestamp  // == Long
    var DBRef =     require('mongolian').DBRef      // not supported yet

GridFS
------
The Mongo shell doesn't support gridfs, so Mongolian DeadBeef provides a custom Stream-based GridFS implementation.
It consists of two main classes, `MongolianGridFS` and `MongolianGridFile`. You can get a MongolianGridFS object from a
database with the `gridfs([gridfs name])` function.

    // Get a GridFS from a database
    var gridfs = db.gridfs() // name defaults to 'fs'

    // Writing to GridFS consists of creating a GridFS file:
    var file = gridfs.create({
        filename:"License",
        contentType:"text/plain"
    })
    // And getting writable Stream (see http://nodejs.org/docs/v0.4/api/streams.html#writable_Stream )
    var stream = file.writeStream()

    // You can then pipe a local file to that stream easily with:
    fs.createReadStream('LICENSE').pipe(stream)

    // Reading a file from GridFS is similar:
    gridfs.findOne("License", function (err, file) {
        if (!err && file) {
            // Get the read stream:
            var stream = file.readStream()

            // You could then pipe the file out to a http response, for example:
            stream.pipe(httpResponse)
        }
    })

    // You can access metadata fields from the file object:
    file.length // might be a Long
    file.chunkSize
    file.md5
    file.filename
    file.contentType // mime-type
    file.uploadDate
    // These two are optional and may not be defined:
    file.metadata
    file.aliases

    // If you make any changes, save them:
    file.save()

Mongodb Shell Command Support
-----------------------------

Nearly all commands are identical in syntax to the mongodb shell. However, asynchronous commands that go to the server
will have an _optional_ node.js style callback parameter.

Currently most commands starting with `get` are named without the `get`. Some of the getters are implemented as values
instead of functions.

+ <strong>Bold functions</strong> are supported
+ <strong><em>Italicized functions</em></strong> are supported with different syntax
+ Everything else is currently unsupported

There will likely be methods below that are never supported by Mongolian DeadBeef, since I'm targetting a slightly
different use case.

### Databases
From http://api.mongodb.org/js/1.8.1/symbols/src/shell_db.js.html

+ <code><strong>db.addUser</strong>(username, password[, readOnly=false][, callback])</code>
+ <code><strong>db.auth</strong>(username, password)</code>
+ <code>db.cloneDatabase(fromhost)</code>
+ <code>db.commandHelp(name)</code> returns the help for the command
+ <code>db.copyDatabase(fromdb, todb, fromhost)</code>
+ <code>db.createCollection(name, { size : ..., capped : ..., max : ... } )</code>
+ <code>db.currentOp()</code> displays the current operation in the db
+ <code><strong>db.dropDatabase</strong>()</code> - see callback note below
+ <code><strong>db.eval</strong>(func[, arg1, arg2, ...][, callback])</code> run code server-side - see callback note below
+ <code><strong><em>db.getCollection</em></strong>(cname)</code> implemented as <code><strong>db.collection</strong>(cname)</code>
+ <code><strong><em>db.getCollectionNames</em></strong>()</code> implemented as <code><strong>db.collectionNames</strong>(callback)</code>
+ <code>db.getLastError()</code> - just returns the err msg string
+ <code><strong><em>db.getLastErrorObj</em></strong>()</code> implemented as <code><strong>db.lastError</strong>(callback)</code> - return full status object
+ <code><strong><em>db.getMongo</em></strong>()</code> get the server connection object implemented as <code><strong>db.server</strong></code>
+ <code>db.getMongo().setSlaveOk()</code> allow this connection to read from the nonmaster member of a replica pair
+ <code><strong><em>db.getName</em></strong>()</code> implemented as <code><strong>db.name</strong></code>
+ <code>db.getPrevError()</code> _(deprecated?)_
+ <code>db.getProfilingStatus()</code> - returns if profiling is on and slow threshold
+ <code>db.getReplicationInfo()</code>
+ <code>db.getSiblingDB(name)</code> get the db at the same server as this one
+ <code>db.isMaster()</code> check replica primary status
+ <code>db.killOp(opid)</code> kills the current operation in the db
+ <code>db.listCommands()</code> lists all the db commands
+ <code>db.printCollectionStats()</code>
+ <code>db.printReplicationInfo()</code>
+ <code>db.printSlaveReplicationInfo()</code>
+ <code>db.printShardingStatus()</code>
+ <code><strong>db.removeUser</strong>(username[, callback])</code> - see callback note below
+ <code>db.repairDatabase()</code>
+ <code>db.resetError()</code>
+ <code><strong>db.runCommand</strong>(cmdObj[, callback])</code> run a database command. if cmdObj is a string, turns it into { cmdObj : 1 }
+ <code>db.serverStatus()</code>
+ <code>db.setProfilingLevel(level,<slowms>)</code> 0=off 1=slow 2=all
+ <code>db.shutdownServer()</code>
+ <code>db.stats()</code>
+ <code>db.version()</code> current version of the server

### Collections
From http://api.mongodb.org/js/1.8.1/symbols/src/shell_collection.js.html

+ <code>collection.find().help()</code> - show DBCursor help
+ <code><strong>collection.count</strong>(callback)</code>
+ <code>collection.dataSize()</code>
+ <code><strong>collection.distinct</strong>(key[, query], callback)</code> - eg. collection.distinct( 'x' )</code>
+ <code><strong>collection.drop</strong>([callback])</code> drop the collection - see callback note below
+ <code><strong>collection.dropIndex</strong>(name[, callback])</code> - see callback note below
+ <code>collection.dropIndexes()</code>
+ <code><strong>collection.ensureIndex</strong>(keypattern[,options][, callback])</code> - options is an object with these possible fields: name, unique, dropDups - see callback note below
+ <code>collection.reIndex()</code>
+ <code><strong>collection.find</strong>([query],[fields])</code> - query is an optional query filter. fields is optional set of fields to return.
                                          e.g. <code>collection.find( {x:77} , {name:1, x:1} )</code> - returns a cursor object
+ <code><strong>collection.find(...).count</strong>()</code>
+ <code><strong>collection.find(...).limit</strong>(n)</code>
+ <code><strong>collection.find(...).skip</strong>(n)</code>
+ <code><strong>collection.find(...).sort</strong>(...)</code>
+ <code><strong>collection.findOne</strong>([query][callback])</code>
+ <code><strong>collection.findAndModify</strong>( { update : ... , remove : bool [, query: {}, sort: {}, 'new': false] } )</code>
  ex: finds document with comment value 0, increase its 'count' field by 1, and return the updated document.
  <code>collection.findAndModify( {query: {comment:'0'}, update : {"$inc":{"count":1}}, 'new': true}, function (err, doc) {
  console.log(doc)
})</code>
+ <code><strong><em>collection.getDB</em></strong>()</code> get DB object associated with collection implemented as <code><strong>collection.db</strong></code>
+ <code><strong><em>collection.getIndexes</em></strong>()</code> implemented as <code><strong>collection.indexes</strong>(callback)</code>
+ <code>collection.group( { key : ..., initial: ..., reduce : ...[, cond: ...] } )</code>
+ <code><strong>collection.mapReduce</strong>( mapFunction , reduceFunction , [optional params][, callback])</code>
+ <code><strong>collection.remove</strong>(query[, callback])</code> - see callback note below
+ <code>collection.renameCollection( newName , [dropTarget] )</code> renames the collection.
+ <code><strong>collection.runCommand</strong>( name , [options][, callback])</code> runs a db command with the given name where the first param is the collection name
+ <code><strong>collection.save</strong>(obj[, callback])</code> - see callback note below
+ <code>collection.stats()</code>
+ <code>collection.storageSize()</code> - includes free space allocated to this collection
+ <code>collection.totalIndexSize()</code> - size in bytes of all the indexes
+ <code>collection.totalSize()</code> - storage allocated for all data and indexes
+ <code><strong>collection.update</strong>(query, object[, upsert\_bool, multi\_bool][, callback])</code> - see callback note below
+ <code>collection.validate()</code> - SLOW
+ <code>collection.getShardVersion()</code> - only for use with sharding

### Cursors
From http://api.mongodb.org/js/1.8.1/symbols/src/shell_query.js.html

+ <code><strong>cursor.sort</strong>( {...} )</code>
+ <code><strong>cursor.limit</strong>( n )</code>
+ <code><strong>cursor.skip</strong>( n )</code>
+ <code><strong>cursor.count</strong>()</code> - total # of objects matching query, ignores skip,limit
+ <code><strong>cursor.size</strong>()</code> - total # of objects cursor would return, honors skip,limit
+ <code><strong>cursor.explain</strong>([verbose])</code>
+ <code><strong>cursor.hint</strong>(...)</code>
+ <code>cursor.showDiskLoc()</code> - adds a $diskLoc field to each returned object
+ <code><strong>cursor.toArray</strong>(callback)</code> - unique to Mongolian DeadBeef
+ <code><strong>cursor.forEach</strong>(func, callback)</code> - calls func for each document, and callback upon completion or error
+ <code>cursor.print()</code> - output to console in full pretty format
+ <code><strong>cursor.map</strong>( func )</code> - map documents before they're returned in next, toArray, forEach
+ <code>cursor.hasNext()</code>
+ <code><strong>cursor.next</strong>([callback])</code> - returns the next document or null if there are no more


### Callbacks
Callbacks take the standard node.js format: `function(error, value)`

Mongodb handles write operations (insert, update, save, drop, etc.) asynchronously. If you pass a callback into one of
these methods, this is equivalent to immediately calling `db.lastError(callback)` on the same server/connection. Passing
a null value will not send a getLastError command to the server.

Currently there is no way to specify the write concern on these inlined callbacks.

Todo
----

* Connection pooling
* Various utility methods
* More unit tests
* Documentation
* Cleanup

Contributing
------------
Try it out and send me feedback! That's the best help I could use right now. Unit tests are good, too.

License
-------
Mongolian DeadBeef is open source software under the [zlib license][4].

[1]: http://www.mongodb.org/display/DOCS/dbshell+Reference
[2]: https://github.com/marcello3d/node-mongolian/blob/master/examples/mongolian_trainer.js
[3]: https://github.com/marcello3d/node-buffalo
[4]: https://github.com/marcello3d/node-mongolian/blob/master/LICENSE
