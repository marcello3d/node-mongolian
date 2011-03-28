Forked from https://github.com/marcello3d/node-mongolian/blob/master/lib/db.js by marcello3d

Mongolian DeadBeef
====================
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
    posts.find().limit(5).sort({ created: 1 }).toArray(function (err, array) { })
    posts.find({ title: /^hal/ }).forEach(function (err, post) { })

Todo
----

* Various utility methods
* More unit tests
* Authentication
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