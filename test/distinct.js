/* Mongolian DeadBeef by Marcello Bastea-Forte - zlib license */

var Mongolian = require('../mongolian')

var db,collection

module.exports = {
    "create connection": function(test) {
        db = new Mongolian('mongo://localhost/mongolian_test', { log:false })
        collection = db.collection('test_distinct')
        db.dropDatabase(function(error) {
            test.ifError(error)
            test.done()
        })
    },


    "insert some rows": function(test) {
        var array = [{
              i: 0,
              color: 'yellow'
            },{
              i:1,
              color: 'white'
            },{
              i:2,
              color: 'red'
            },{
              i:3,
              color: 'red'
            },{
              i:4,
              color: 'green'
            }]

        collection.insert(array, function(error, insertedRows) {
            test.ifError(error)
            test.equal(insertedRows.length, 5)
            test.done()
        })
    },
    "test for distinct colors": function(test) {
        collection.distinct("color", function(error, values) {
            test.deepEqual(values, ['yellow', 'white', 'red', 'green'])
            test.done()
        })
    },
    "test for distinct colors with condition i<4": function(test) {
        collection.distinct("color", {i: { $lt: 4 }}, function(error, values) {
            test.deepEqual(values, ['yellow', 'white', 'red'])
            test.done()
        })
    },

    "close connection": function(test) {
        db.server.close()
        test.done()
    }
}