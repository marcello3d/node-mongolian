Mongolian DeadBeef Changelog
----------------------------

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