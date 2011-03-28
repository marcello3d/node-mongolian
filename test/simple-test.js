var vows = require('vows'),
    assert = require('assert'),
    util = require('util'),
    Mongolian = require('../mongolian.js')

vows.describe('Mongolian DeadBeef, I choose you!').addBatch({
    "with a clean DB (mongolian_test),": {
        topic: function () {
            var db = new Mongolian({ keepAlive: 1 }).db('mongolian_test')
            var callback = this.callback
            db.drop(function(err) { callback(err, !err && db) })
        },
        "is not null": function (db) {
            assert.isObject(db)
        },
        "its name is right": function (db) {
            assert.equal(db.name, "mongolian_test")
        },
        "its collectionNames": {
            topic: function (db) {
                db.collectionNames(this.callback)
            },
            "are empty": function(names) {
                assert.equal(names.length,0)
            }
        },
        "and inserting into 'test',": {
            topic: function (db) {
                db.collection('test').insert({ name:'hello world' }, this.callback)
            },
            "it succeeds": function(insertedRow) {
                assert.equal(insertedRow.name, "hello world")
            },
            "has _id": function(insertedRow) {
                assert.isObject(insertedRow._id)
            },
            "we can find it again": {
                topic: function(insertedRow, db) {
                    insertedRow.original = "hi mom"
                    db.collection('test').findOne(this.callback)
                },
//                // Wish I knew a clean way to access the insertedRow from the parent scope
//                "has same _id": function(foundRow) {
//                    assert.equals(foundRow._id, inserted._id)
//                },
                "has _id": function(foundRow) {
                    assert.isObject(foundRow._id)
                },
                "name matches insert": function(foundRow) {
                    assert.equal(foundRow.name, "hello world")
                }
            },
            "its collectionNames": {
                topic: function (insertedRow, db) {
                    db.collectionNames(this.callback)
                },
                "should contain 'test'": function(names) {
                    assert.include(names,"test")
                },
                "should contain 'system.indexes'": function(names) {
                    assert.include(names,"system.indexes")
                }
            }
        }
    }
}).export(module)