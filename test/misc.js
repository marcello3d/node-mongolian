/* Mongolian DeadBeef by Marcello Bastea-Forte - zlib license */

var Mongolian = require('../mongolian')

var db,collection

module.exports = {
    "create connection": function(test) {
        db = new Mongolian('mongo://localhost/mongolian_test', { log:false })
        db.dropDatabase(function(error) {
            test.ifError(error)
            test.done()
        })
    },

    "db is not null": function(test) {
        test.ok(db)
        test.done()
    },
    "its name is right": function(test) {
        test.equal(db.name, "mongolian_test")
        test.done()
    },
    "its collectionNames": function(test) {
        db.collectionNames(function(error, names) {
            test.ifError(error)
            test.equal(names.length, 0)
            test.done()
        })
    },
    "eval": function(test) {
        db.eval(function() {
            return 5
        }, function(error, result) {
            test.ifError(error)
            test.equal(result,5)
            test.done()
        })
    },
    "eval with parameter": function(test) {
        db.eval(
            function(x) {
                return x
            },
            5,
            function(error, result) {
                test.ifError(error)
                test.equal(result,5)
                test.done()
            }
        )
    },
    "eval with two parameters": function(test) {
        db.eval(
            function(x, y) {
                return x + y
            },
            5, 6,
            function(error, result) {
                test.ifError(error)
                test.equal(result,11)
                test.done()
            }
        )
    },
    
    "close connection": function(test) {
        db.server.close()
        test.done()
    }
}