/* Mongolian DeadBeef by Marcello Bastea-Forte - zlib license */

var Mongolian = require('../mongolian')

var Waiter = require('waiter')

var db,collection

module.exports = {
    "create connection": function(test) {
        db = new Mongolian('mongo://localhost/mongolian_test', { log:false })
        collection = db.collection('test_async')
        db.dropDatabase(function(error) {
            test.ifError(error)
            test.done()
        })
    },

    "insert 1000 documents": function(test) {
        var array = []
        var data = ''
        for (var i=0; i<1000; i++) {
            array.push({
                i:i,
                even:(i%2) == 0,
                data:data+='1234567890'
            })
        }
        collection.insert(array, function(error,insertedRows) {
            test.ifError(error)
            test.equal(insertedRows.length, 1000)
            test.done()
        })
    },
    "async 10": function(test) {
        var waiter = new Waiter
        for (var i=0; i<10; i++) {
            collection.find({i:{$lt:i}}).toArray(waiter())
        }
        waiter.waitForAll(function() {
            test.done()
        })
    },
    "async 100": function(test) {
        var waiter = new Waiter
        for (var i=0; i<100; i++) {
            collection.find({i:{$lt:i}}).toArray(waiter())
        }
        waiter.waitForAll(function() {
            test.done()
        })
    },

    "close connection": function(test) {
        db.server.close()
        test.done()
    }
}