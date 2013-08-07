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

    
    "isCapped": function(test) {
        db.eval(
            function() {
                return db.createCollection("test3",{capped:true,size:10})
            },
            function(error, result) {
                test.ifError(error)
                collection = db.collection("test3")
                collection.isCapped(function(error, capped, size) {
                    test.ifError(error)
                    test.equal(capped, true)
                    test.equal(size, 10)
                    test.done()
                })
            }    
        )
    }

    "close connection": function(test) {
        db.server.close()
        test.done()
    }
}
