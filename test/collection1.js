/* Mongolian DeadBeef by Marcello Bastea-Forte - zlib license */

var Mongolian = require('../mongolian')

var db,collection

module.exports = {
    "create connection": function(test) {
        db = new Mongolian('mongo://localhost/mongolian_test', { log:false })
        collection = db.collection('test')
        db.dropDatabase(function(error) {
            test.ifError(error)
            test.done()
        })
    },

    "can insert into 'test'": function (test) {
        collection.insert({ name:'hello world' }, function(error, insertedRow) {
            test.ifError(error)
            test.equal(insertedRow.name, "hello world")
            test.ok(insertedRow._id)

            collection.findOne(function(error, foundRow) {
                test.ifError(error)
                test.equal(foundRow._id.toString(), insertedRow._id.toString())
                test.equal(foundRow.name, "hello world")

                collection.findOne({
                    _id:new Mongolian.ObjectId(insertedRow._id.toString())
                }, function(error, foundRow) {
                    test.ifError(error)
                    test.equal(foundRow._id.toString(), insertedRow._id.toString())
                    test.equal(foundRow.name, "hello world")

                    test.done()
                })

            })
        })
    },
    "can insert and find by _id": function (test) {
        collection.insert({ name:'hello world' }, function(error, insertedRow) {
            test.ifError(error)
            collection.findOne({
                _id:new Mongolian.ObjectId(insertedRow._id.toString())
            }, function(error, foundRow) {
                test.ifError(error)
                test.equal(foundRow._id.toString(), insertedRow._id.toString())
                test.equal(foundRow.name, "hello world")

                test.done()
            })
        })
    },
    "can insert and update by _id": function (test) {
        collection.insert({ name:'hello sun' }, function(error, insertedRow) {
            test.ifError(error)
            test.ok(insertedRow)

            collection.update({name:'hello sun'}, {age:45}, function(error, rowsUpdated) {
                test.ifError(error)
                test.equal(rowsUpdated, 1)

                collection.findOne({
                    _id:new Mongolian.ObjectId(insertedRow._id.toString())
                }, function(error, row) {
                    test.ifError(error)
                    test.equal(row.age, 45)
                    test.equal(row.name, undefined)
                    test.done()
                })
            })
        })
    },
    "can insert and remove by _id": function (test) {
        collection.insert({ name:'hello moon' }, function(error, insertedRow) {
            test.ifError(error)
            test.ok(insertedRow)

            collection.remove({name:'hello moon'}, function(error, rowsDeleted) {
                test.ifError(error)
                test.equal(rowsDeleted, 1)

                collection.findOne({
                    _id:new Mongolian.ObjectId(insertedRow._id.toString())
                }, function(error, row) {
                    test.ifError(error)
                    test.equal(row, undefined)
                    test.done()
                })
            })
        })
    },
    "can insert and remove multiple by _id": function (test) {
        collection.insert([
                { name:'hello sky' },
                { name:'hello sky' },
                { name:'hello sky' },
                { name:'hello sky' },
                { name:'hello sky' }
            ], function(error, insertedRow) {
            test.ifError(error)
            test.ok(insertedRow)

            collection.remove({name:'hello sky'}, function(error, rowsDeleted) {
                test.ifError(error)
                test.equal(rowsDeleted, 5)

                collection.find({name:'hello sky'}).count(function(error, count) {
                    test.ifError(error)
                    test.equal(count, 0)
                    test.done()
                })
            })
        })
    },
    "test updateAll({name:'hello world'}, {age:45}) fails": function(test) {
         collection.updateAll({}, {age:45}, function(error) {
            test.ok(error)
            test.equal(error.message, "Server Error: multi update only works with $ operators")
            test.done()
         })
    },
    "saving into 'test'": function(test) {
        collection.save({ name:'hello there' }, function(error, insertedRow) {
            test.ifError(error)
            test.equal(insertedRow.name, "hello there")
            test.ok(insertedRow._id)

            insertedRow.name = "awesome sauce"
            collection.save(insertedRow, function(error, savedRow) {
                test.ifError(error)
                test.ok(insertedRow._id)
                test.equal(insertedRow.name, "awesome sauce")
                test.equal(insertedRow, savedRow)
                collection.findOne({_id:insertedRow._id}, function(error, foundRow) {
                    test.equal(foundRow.name, "awesome sauce")
                    foundRow.name = "awesome hot sauce"
                    collection.save(foundRow)
                    test.equal(foundRow.name, "awesome hot sauce")
                    test.done()
                })
            })
        })
    },
    "saving with bad id": function(test) {
        var id = new Mongolian.ObjectId("AAAAAAAAAAAAAAAAAAAAAAAA")
        collection.save({ _id:id, name:'hello there' }, function(error, insertedRow) {
            test.ifError(error)
            test.equal(insertedRow.name, "hello there")
            test.equal(insertedRow._id.toString(), id.toString())
            collection.findOne({_id:insertedRow._id}, function(error, foundRow) {
                test.equal(foundRow.name, "hello there")
                test.equal(foundRow._id.toString(), id.toString())
                test.done()
            })
        })
    },

    "db.collectionNames contains 'test'": function(test) {
        db.collectionNames(function(error,names) {
            test.ifError(error)
            test.ok(names.some(function(name) {
                return name == "test"
            }), "'test' found")
            test.ok(names.some(function(name) {
                return name == "system.indexes"
            }), "'system.indexes' found")
            test.done()
        })
    },

    "close connection": function(test) {
        db.server.close()
        test.done()
    }
}