/* Mongolian DeadBeef by Marcello Bastea-Forte - zlib license */

var Mongolian = require('../mongolian')

var server, db, collection
var hosts = [
  'mongodb://localhost',
  'mongodb://localhost:27018',
  'localhost:27019'
]

module.exports = {
  "create connection in replica set in arguments": function(test) {
    server = new Mongolian(hosts[0], hosts[1], hosts[2], { log:false });
    test.equals(server._servers.length, 3)
    test.ok(server._serverNames['localhost:27017'])
    test.ok(server._serverNames['localhost:27018'])
    test.ok(server._serverNames['localhost:27019'])
    
    db = server.db('mongolian_test')
    collection = db.collection('testindex')
    db.dropDatabase(function(error){
      test.ifError(error)

      server.close()
      test.done()
    })
  },
  "create connection in replica set with Array": function(test) {
    server = new Mongolian(hosts, { log:false });
    test.equals(server._servers.length, 3)
    test.ok(server._serverNames['localhost:27017'])
    test.ok(server._serverNames['localhost:27018'])
    test.ok(server._serverNames['localhost:27019'])
    
    db = server.db('mongolian_test')
    collection = db.collection('testindex')
    db.dropDatabase(function(error){
      test.ifError(error)
      server.close()
      test.done()
    })
  }
};
