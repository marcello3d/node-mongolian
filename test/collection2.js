/* Mongolian DeadBeef by Marcello Bastea-Forte - zlib license */

var Mongolian = require('../mongolian')

var db,collection

module.exports = {
    "create connection": function(test) {
        db = new Mongolian('mongo://localhost/mongolian_test', { log:false })
        collection = db.collection('test2')
        db.dropDatabase(function(error) {
            test.ifError(error)
            test.done()
        })
    },

    "insert multiple documents": function(test) {
        collection.insert([
            { i:1, j:true },
            { i:2, j:true },
            { i:3, j:false },
            { i:4, j:false },
            { i:5, j:true }
        ], function(error, insertedRows) {
            test.ifError(error)
            test.equal(insertedRows.length, 5)
            collection.findOne(function(error, foundRow) {
                test.ifError(error)
                test.ok(foundRow.i > 0)

                collection.find().toArray(function(error, array) {
                    test.ifError(error)
                    test.equal(array.length, 5)
                    test.equal(array[0].i, 1)
                    test.equal(array[1].i, 2)
                    test.equal(array[2].i, 3)
                    test.equal(array[3].i, 4)
                    test.equal(array[4].i, 5)
                    test.done()
                })
            })
        })
    },
    "sorted find": function(test) {
        collection.find().sort({i:1}).toArray(function(error, array) {
            test.ifError(error)
            test.equal(array.length, 5)
            test.equal(array[0].i, 1)
            test.equal(array[1].i, 2)
            test.equal(array[2].i, 3)
            test.equal(array[3].i, 4)
            test.equal(array[4].i, 5)
            test.done()
        })
    },
    "reverse sorted find": function(test) {
        collection.find().sort({i:-1}).toArray(function(error, array) {
            test.ifError(error)
            test.equal(array.length, 5)
            test.equal(array[0].i, 5)
            test.equal(array[1].i, 4)
            test.equal(array[2].i, 3)
            test.equal(array[3].i, 2)
            test.equal(array[4].i, 1)
            test.done()
        })
    },
    "find().limit(3).sort({i:1})": function(test) {
        collection.find().limit(3).sort({i:1}).toArray(function(error, array) {
            test.ifError(error)
            test.equal(array.length, 3)
            test.equal(array[0].i, 1)
            test.equal(array[1].i, 2)
            test.equal(array[2].i, 3)
            test.done()
        })
    },
    "find().skip(1).limit(3).sort({i:1})": function(test) {
        collection.find().skip(1).limit(3).sort({i:1}).toArray(function(error, array) {
            test.ifError(error)
            test.equal(array.length, 3)
            test.equal(array[0].i, 2)
            test.equal(array[1].i, 3)
            test.equal(array[2].i, 4)
            test.done()
        })
    },
    "query failure": function(test) {
        collection.find([undefined]).toArray(function(error, array) {
            test.ok(error)
            test.equal(array, undefined)
            test.equal(error.message, "Query failure: can't have undefined in a query expression")
            test.done()
        })
    },

    "close connection": function(test) {
        db.server.close()
        test.done()
    }
}