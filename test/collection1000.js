/* Mongolian DeadBeef by Marcello Bastea-Forte - zlib license */

var Mongolian = require('../mongolian')

var db,collection

module.exports = {
    "create connection": function(test) {
        db = new Mongolian('mongo://localhost/mongolian_test', { log:false })
        collection = db.collection('test_1000')
        db.dropDatabase(function(error) {
            test.ifError(error)
            test.done()
        })
    },

    "insert 1000 documents": function(test) {
        var array = []
        for (var i=0; i<1000; i++) {
            array.push({
                i:i,
                even:(i%2) == 0
            })
        }
        collection.insert(array, function(error,insertedRows) {
            test.ifError(error)
            test.equal(insertedRows.length, 1000)
            test.done()
        })
    },
    "count": function(test) {
        collection.find().count(function(error, count) {
            test.ifError(error)
            test.equal(count, 1000)
            test.done()
        })
    },
    "size": function(test) {
        collection.find().size(function(error, count) {
            test.ifError(error)
            test.equal(count, 1000)
            test.done()
        })
    },
    "forEach counter": function(test) {
        var counter = 0
        collection.find().forEach(function(item) {
            counter++
        }, function(error) {
            test.ifError(error)
            test.equal(counter, 1000)
            test.done()
        })
    },
    "group check": function (test) {
        collection.group({
            'ns': 'test_1000',
            'key':'even',
            'initial': {evenCount:0, oddCount: 0, total:0},
            '$reduce': function (doc, out) {
                ++out[doc.even ? 'evenCount' : 'oddCount'];
                ++out.total;
            },
            finalize: function (out) {}
        }, function (error,group) {
            var ret = group.retval[0];
            test.ifError(error);
            test.equal(ret.total, 1000);
            test.equal(ret.evenCount, 500);
            test.equal(ret.oddCount,500);
            test.done();
        });
    },
    "mapped forEach": function(test) {
        var counter = 0
        collection.find().map(function(item) {
            return item.i
        }).forEach(function(item) {
            counter += item
        }, function(error) {
            test.ifError(error)
            test.equal(counter, 499500)
            test.done()
        })
    },
    "sort({i:-1}).count": function(test) {
        collection.find().sort({i:-1}).count(function(error, count) {
            test.ifError(error)
            test.equal(count, 1000)
            test.done()
        })
    },
    "sort({i:-1}).size": function(test) {
        collection.find().sort({i:-1}).size(function(error, count) {
            test.ifError(error)
            test.equal(count, 1000)
            test.done()
        })
    },
    "limit(50).count": function(test) {
        collection.find().limit(50).count(function(error, count) {
            test.ifError(error)
            test.equal(count, 1000)
            test.done()
        })
    },
    "limit(50).size": function(test) {
        collection.find().limit(50).size(function(error, count) {
            test.ifError(error)
            test.equal(count, 50)
            test.done()
        })
    },
    "limit(50).skip(50).count": function(test) {
        collection.find().limit(50).skip(50).count(function(error, count) {
            test.ifError(error)
            test.equal(count, 1000)
            test.done()
        })
    },
    "limit(50).skip(50).size": function(test) {
        collection.find().limit(50).skip(50).size(function(error, count) {
            test.ifError(error)
            test.equal(count, 50)
            test.done()
        })
    },
    "limit(50).skip(990).count": function(test) {
        collection.find().limit(50).skip(990).count(function(error, count) {
            test.ifError(error)
            test.equal(count, 1000)
            test.done()
        })
    },
    "limit(50).skip(990).size": function(test) {
        collection.find().limit(50).skip(990).size(function(error, count) {
            test.ifError(error)
            test.equal(count, 10)
            test.done()
        })
    },
    "sort({i:-1}).limit(1000).size": function(test) {
        collection.find().sort({i:-1}).limit(1000).toArray(function(error, array) {
            test.ifError(error)
            test.equal(array.length, 1000)
            test.done()
        })
    },

    "close connection": function(test) {
        db.server.close()
        test.done()
    }
}