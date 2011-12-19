/* Mongolian DeadBeef by Marcello Bastea-Forte - zlib license */

var Mongolian = require('../mongolian')

var db,collection

module.exports = {
    "create connection": function(test) {
        db = new Mongolian('mongo://localhost/mongolian_test', { log:false })
        collection = db.collection('testindex')
        db.dropDatabase(function(error) {
            test.ifError(error)
            test.done()
        })
    },

    "createIndex": function(test) {
        collection.createIndex({foo: 1}, function(error,index) {
            test.ifError(error)
            test.deepEqual(index.key,{foo: 1})
            test.done()
        })
    },
    "createIndex with options": function(test) {
        collection.createIndex({foo2: 1}, {background: 1}, function(error,index) {
            test.ifError(error)
            test.deepEqual(index.key,{foo2: 1})
            test.done()
        })
    },

    "createIndex with dot type": function(test) {
        collection.createIndex({"foo3.bar": 1}, function(error,index) {
            test.ifError(error)
            test.deepEqual(index.key,{"foo3.bar": 1})
            test.done()
        })
    },
    "createIndex with dot type and options": function(test) {
        collection.createIndex({"foo4.bar": 1}, {background: 1}, function(error,index) {
            test.ifError(error)
            test.deepEqual(index.key,{"foo4.bar": 1})
            test.done()
        })
    },
    "ensureIndex": function(test) {
        collection.ensureIndex({foo5: 1}, function(error,index) {
            test.ifError(error)
            test.deepEqual(index.key,{foo5: 1})
            test.done()
        })
    },
    "ensureIndex with options": function(test) {
        collection.ensureIndex({foo6: 1}, {background: 1}, function(error,index) {
            test.ifError(error)
            test.deepEqual(index.key,{foo6: 1})
            test.done()
        })
    },

    "ensureIndex with dot type": function(test) {
        collection.ensureIndex({"foo7.bar": 1}, function(error,index) {
            test.ifError(error)
            test.deepEqual(index.key,{"foo7.bar": 1})
            test.done()
        })
    },
    "ensureIndex with dot type and options": function(test) {
        collection.ensureIndex({"foo8.bar": 1}, {background: 1}, function(error,index) {
            test.ifError(error)
            test.deepEqual(index.key,{"foo8.bar": 1})
            test.done()
        })
    },
    "retry ensureIndex": function(test) {
        collection.ensureIndex({foo5: 1}, function(error,index) {
            test.ifError(error)
            test.deepEqual(index.key,{foo5: 1})
            test.done()
        })
    },
    "retry ensureIndex with options": function(test) {
        collection.ensureIndex({foo6: 1}, {background: 1}, function(error,index) {
            test.ifError(error)
            test.deepEqual(index.key,{foo6: 1})
            test.done()
        })
    },

    "retry ensureIndex with dot type": function(test) {
        collection.ensureIndex({"foo7.bar": 1}, function(error,index) {
            test.ifError(error)
            test.deepEqual(index.key,{"foo7.bar": 1})
            test.done()
        })
    },
    "retry ensureIndex with dot type and options": function(test) {
        collection.ensureIndex({"foo8.bar": 1}, {background: 1}, function(error,index) {
            test.ifError(error)
            test.deepEqual(index.key,{"foo8.bar": 1})
            test.done()
        })
    },
    
    "close connection": function(test) {
        db.server.close()
        test.done()
    }
}