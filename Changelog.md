Mongolian DeadBeef Changelog
----------------------------

v0.1.12

+ GH-53 - regression if save has no callback

v0.1.11

+ GH-24 - Remove hack for mongodb-native bug
+ GH-31 - Save callback gets no data
+ GH-34 - updated taxman dependency
+ GH-37 - mapReduce wasn't converting optional finalize function to bson.Code instance
+ GH-41 - Add collection.distinct (Filirom1)
+ GH-51 - support for mongodb://-style url (mschuetz)
+ GH-52 - migrated from x instanceof Function to typeof x === 'function'
+ logging/error tweaks
+ documentation tweaks
+ removed broken/unsupported server.closeWhenDone method
+ error in url parsing error message (the irony!)

v0.1.10

+ added collection.runCommand
+ renamed db.queryCommand -> db.runCommand, matching mongo shell syntax
+ gridfs tweaks
+ fixed collection._indexCache creation (bug caught by dvv) and improved ensureIndex return value consistency
+ GH-21 - collection.drop() and db.dropDatabase() not checking if callback is valid
+ GH-22 - EventEmitter error
+ GH-15/GH-29 - more robust error catching!
+ GH-24 - temporary workaround for (mongodb 0.9.4-4 ~ 0.9.6.1) incompatibility
+ more tests

v0.1.9

+ added replicaset support (automatically finds primary and detects secondaries)
 + removed keepAlive functionality (GH-19)
+ added collection.findAndModify
+ added db.eval (GH-12)
+ renamed db.drop to db.dropDatabase
+ renamed cursor.mapper to cursor.map
+ fixed BSON type exports (GH-18)
+ various documentation/error message tweaks
+ couple more tests