Mongolian DeadBeef Changelog
----------------------------

v0.1.18

+ GH-90 gridfs now allows multiple files with the same name
+ GH-96 cursor.forEach ignores cursor.map()

v0.1.17

+ major bugfix release
+ GH-77,GH-86 fixed authentication regression from 0.1.15
+ GH-82 unit tests
+ GH-83 avoid buffer reuse bug with updated buffalo
+ GH-84 pass number of updated/deleted rows to update() and remove() methods
+ GH-87 catch Query Failure and Cursor Not Found errors and return them as errors

v0.1.16

+ GH-72 - fixes Buffer is not large enough exception

v0.1.15

+ removed mongodb-native dependency, now using node-buffalo (https://github.com/marcello3d/node-buffalo)
+ GH-69 - exceptions in user callbacks should now bubble up correctly
+ GH-59 - fixes ensureIndex throws error about key name

v0.1.14

+ GH-28 - tweak for mongos support from yosefd (I haven't personally tested a sharded setup yet)
+ GH-61 - getLastError -> getlasterror compatibility fix
+ GH-63 GH-64 GH-65 - update to latest mongodb-native socket handling code (thanks to xcoderzach)
+ peg mongodb@0.9.7-2-2 to avoid untested version conflicts

v0.1.13

+ GH-46 - Rewrote cursor.forEach to use nextBatch instead of next, fixes stack overflow
+ GH-60 - upgrade to new mongodb@0.9.7 socket connection code
+ new test framework (using nodeunit instead of vowsjs)
 + new index tests
+ tweaks to ensureIndex/createIndex
+ other code style changes

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