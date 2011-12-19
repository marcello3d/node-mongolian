/* Mongolian DeadBeef by Marcello Bastea-Forte - zlib license */

var Mongolian = require('../mongolian')

var db,collection

module.exports = {
    "create connection": function(test) {
        db = new Mongolian('mongo://localhost/mongolian_test', { log:false })
        collection = db.collection('test_10000')
        db.dropDatabase(function(error) {
            test.ifError(error)
            test.done()
        })
    },


    "insert 10000 documents": function(test) {
        var array = []
        for (var i=0; i<10000; i++) {
            array.push({
                i:i,
                even:(i%2) == 0
            })
        }
        collection.insert(array, function(error,insertedRows) {
            test.ifError(error)
            test.equal(insertedRows.length, 10000)
            test.done()
        })
    },
    "count": function(test) {
        collection.find().count(function(error, count) {
            test.ifError(error)
            test.equal(count, 10000)
            test.done()
        })
    },
    "size": function(test) {
        collection.find().size(function(error, count) {
            test.ifError(error)
            test.equal(count, 10000)
            test.done()
        })
    },
    "find().sort({i:-1}).limit(10000)": function(test) {
        collection.find().sort({i:-1}).limit(10000).toArray(function(error, array) {
            test.ifError(error)
            test.equal(array.length, 10000)
            test.done()
        })
    },
    "forEach counter": function(test) {
        var counter = 0
        collection.find().forEach(function(item) {
            counter++
        }, function(error) {
            test.ifError(error)
            test.equal(counter, 10000)
            test.done()
        })
    },

    "close connection": function(test) {
        db.server.close()
        test.done()
    }
}