Mongolian DeadBeef
==================
Mongolian DeadBeef is an awesome Mongo DB node.js driver that sits on top of node-mongodb-native and attempts to closely
approximate the [mongodb shell][1].

Introduction
------------
Mongolian DeadBeef and its documentation is super under construction! Go check out [examples/mongolian_trainer.js][2]
and the rest of the source!

Installation
------------
**WARNING! The API is super experimental, and will be adding, removing, and changing the API regularly. Use at your own
risk**

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
are fast and synchronous. Currently there is one connection per server. You can have multiple queries simultaneously on
a single mongodb connection, so I'm not sure how important pooling is at this point.

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
        pageId: "hallo"
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

Extended Examples
-----------------
    // Create a server with a specific host/port
    var server = new Mongolian({
        host:"mongo.example.com",
        port:12345
    })

    // Create a server with a 15 second connection keep-alive
    var server = new Mongolian({ keepAlive:15000 })


    // Authenticate a database
    db.auth(username, password)


    // GridFS
    var gridfs = db.gridfs()

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

Mongodb Shell Command Support
-----------------------------

Nearly all commands are identical in syntax to the mongodb shell. However, asynchronous commands that go to the server
will have an _optional_ node.js style callback parameter.

Currently most commands starting with `get` are named without the `get`. Some of the getters are implemented as values
instead of functions.

+ <span style="color:green">Green functions</span> are supported
+ <span style="color:orange">Orange functions</span> are supported with different syntax
+ Black functions are not yet supported

There will likely be methods below that are never supported by Mongolian DeadBeef, since I'm targetting a slightly
different use case.

### Databases
From http://api.mongodb.org/js/1.8.1/symbols/src/shell_db.js.html

+ <code><span style="color:green">db.addUser</span>(username, password[, readOnly=false][, callback])</code>
+ <code><span style="color:green">db.auth</span>(username, password)</code>
+ <code>db.cloneDatabase(fromhost)</code>
+ <code>db.commandHelp(name)</code> returns the help for the command
+ <code>db.copyDatabase(fromdb, todb, fromhost)</code>
+ <code>db.createCollection(name, { size : ..., capped : ..., max : ... } )</code>
+ <code>db.currentOp()</code> displays the current operation in the db
+ <code><span style="color:green">db.dropDatabase</span>()</code> - see callback note below
+ <code><span style="color:green">db.eval</span>(func, args[, callback])</code> run code server-side - see callback note below
+ <code><span style="color:orange">db.getCollection</span>(cname)</code> implemented as <code><span style="color:green">db.collection</span>(cname)</code>
+ <code><span style="color:orange">db.getCollectionNames</span>()</code> implemented as <code><span style="color:green">db.collectionNames</span>(callback)</code>
+ <code>db.getLastError()</code> - just returns the err msg string
+ <code><span style="color:orange">db.getLastErrorObj</span>()</code> implemented as <code><span style="color:green">db.lastError</span>(callback)</code> - return full status object
+ <code><span style="color:orange">db.getMongo</span>()</code> get the server connection object implemented as <code><span style="color:green">db.server</span></code>
+ <code>db.getMongo().setSlaveOk()</code> allow this connection to read from the nonmaster member of a replica pair
+ <code><span style="color:orange">db.getName</span>()</code> implemented as <code><span style="color:green">db.name</span></code>
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
+ <code><span style="color:green">db.removeUser</span>(username[, callback])</code> - see callback note below
+ <code>db.repairDatabase()</code>
+ <code>db.resetError()</code>
+ <code><span style="color:green">db.runCommand</span>(cmdObj[, callback])</code> run a database command. <strike>if cmdObj is a string, turns it into { cmdObj : 1 }</strike>
+ <code>db.serverStatus()</code>
+ <code>db.setProfilingLevel(level,<slowms>)</code> 0=off 1=slow 2=all
+ <code>db.shutdownServer()</code>
+ <code>db.stats()</code>
+ <code>db.version()</code> current version of the server

### Collections
From http://api.mongodb.org/js/1.8.1/symbols/src/shell_collection.js.html

+ <code>collection.find().help()</code> - show DBCursor help
+ <code><span style="color:green">collection.count</span>(callback)</code>
+ <code>collection.dataSize()</code>
+ <code>collection.distinct( key )</code> - eg. collection.distinct( 'x' )</code>
+ <code><span style="color:green">collection.drop</span>([callback])</code> drop the collection - see callback note below
+ <code><span style="color:green">collection.dropIndex</span>(name[, callback])</code> - see callback note below
+ <code>collection.dropIndexes()</code>
+ <code><span style="color:green">collection.ensureIndex</span>(keypattern[,options][, callback])</code> - options is an object with these possible fields: name, unique, dropDups - see callback note below
+ <code>collection.reIndex()</code>
+ <code><span style="color:green">collection.find</span>([query],[fields])</code> - query is an optional query filter. fields is optional set of fields to return.
                                          e.g. <code>collection.find( {x:77} , {name:1, x:1} )</code> - returns a cursor object
+ <code><span style="color:green">collection.find(...).count</span>()</code>
+ <code><span style="color:green">collection.find(...).limit</span>(n)</code>
+ <code><span style="color:green">collection.find(...).skip</span>(n)</code>
+ <code><span style="color:green">collection.find(...).sort</span>(...)</code>
+ <code><span style="color:green">collection.findOne</span>([query][callback])</code>
+ <code><span style="color:green">collection.findAndModify</span>( { update : ... , remove : bool [, query: {}, sort: {}, 'new': false] } )</code>
+ <code><span style="color:orange">collection.getDB</span>()</code> get DB object associated with collection implemented as <code><span style="color:green">collection.db</span></code>
+ <code><span style="color:orange">collection.getIndexes</span>()</code> implemented as <code><span style="color:green">collection.indexes</span>(callback)</code>
+ <code>collection.group( { key : ..., initial: ..., reduce : ...[, cond: ...] } )</code>
+ <code><span style="color:green">collection.mapReduce</span>( mapFunction , reduceFunction , [optional params][, callback])</code>
+ <code><span style="color:green">collection.remove</span>(query[, callback])</code> - see callback note below
+ <code>collection.renameCollection( newName , [dropTarget] )</code> renames the collection.
+ <code>collection.runCommand( name , [options] )</code> runs a db command with the given name where the first param is the collection name
+ <code><span style="color:green">collection.save</span>(obj[, callback])</code> - see callback note below
+ <code>collection.stats()</code>
+ <code>collection.storageSize()</code> - includes free space allocated to this collection
+ <code>collection.totalIndexSize()</code> - size in bytes of all the indexes
+ <code>collection.totalSize()</code> - storage allocated for all data and indexes
+ <code><span style="color:green">collection.update</span>(query, object[, upsert\_bool, multi\_bool][, callback])</code> - see callback note below
+ <code>collection.validate()</code> - SLOW
+ <code>collection.getShardVersion()</code> - only for use with sharding

### Cursors
From http://api.mongodb.org/js/1.8.1/symbols/src/shell_query.js.html

+ <code><span style="color:green">cursor.sort</span>( {...} )</code>
+ <code><span style="color:green">cursor.limit</span>( n )</code>
+ <code><span style="color:green">cursor.skip</span>( n )</code>
+ <code><span style="color:green">cursor.count</span>()</code> - total # of objects matching query, ignores skip,limit
+ <code><span style="color:green">cursor.size</span>()</code> - total # of objects cursor would return, honors skip,limit
+ <code><span style="color:green">cursor.explain</span>([verbose])</code>
+ <code><span style="color:green">cursor.hint</span>(...)</code>
+ <code>cursor.showDiskLoc()</code> - adds a $diskLoc field to each returned object
+ <code><span style="color:green">cursor.toArray</span>(callback)</code> - unique to Mongolian DeadBeef
+ <code><span style="color:green">cursor.forEach</span>(func, callback)</code> - calls func for each element, and callback upon completion or error
+ <code>cursor.print()</code> - output to console in full pretty format
+ <code>cursor.map( func )</code>
+ <code>cursor.hasNext()</code>
+ <code><span style="color:green">cursor.next</span>([callback])</code> - executes `callback(null)` if there are no more elements


### Callbacks
Callbacks take the standard node.js format: `function(error, value)`

Mongodb handles write operations (insert, update, save, drop, etc.) asynchronously. If you pass a callback into one of
these methods, this is equivalent to immediately calling `db.lastError(callback)` on the same server/connection. Passing
a null value will not send a getLastError command to the server.

Currently there is no way to specify the write concern on these inlined callbacks.

Todo
----

* Various utility methods
* More unit tests
* Documentation
* Connection pooling
* Cleanup

Contributing
------------
Try it out and send me feedback! That's the best help I could use right now. Unit tests are good, too.

License
-------
Mongolian DeadBeef is open source software under the [zlib license][3].

[1]: http://www.mongodb.org/display/DOCS/dbshell+Reference
[2]: https://github.com/marcello3d/node-mongolian/blob/master/examples/mongolian_trainer.js
[3]: https://github.com/marcello3d/node-mongolian/blob/master/LICENSE