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
        "and collection 'test'": {
            topic: function(db) {
                return db.collection('test')
            },
            "and inserting into 'test',": {
                topic: function (collection,db) {
                    collection.insert({ name:'hello world' }, this.callback)
                },
                "it succeeds": function(insertedRow) {
                    assert.equal(insertedRow.name, "hello world")
                },
                "has _id": function(insertedRow) {
                    assert.isObject(insertedRow._id)
                },
                "we can find it again": {
                    topic: function(insertedRow, collection, db) {
                        insertedRow.original = "hi mom"
                        collection.findOne(this.callback)
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
                    topic: function (insertedRow, collection, db) {
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
        },
        "and collection 'test2'": {
            topic: function(db) {
                return db.collection('test2')
            },
            "with 5 inserted documents,": {
                topic: function (collection, db) {
                    collection.insert([
                        { i:1, j:true },
                        { i:2, j:true },
                        { i:3, j:false },
                        { i:4, j:false },
                        { i:5, j:true }
                    ], this.callback)
                },
                "it succeeds": function(insertedRows) {
                    assert.equal(insertedRows.length, 5)
                },
                "and searching for one": {
                    topic: function(insertedRows, collection, db) {
                        collection.findOne(this.callback)
                    },
                    "has i": function(foundRow) {
                        assert.isNumber(foundRow.i)
                    }
                },
                "and finding all": {
                    topic: function(insertedRows, collection, db) {
                        collection.find().toArray(this.callback)
                    },
                    "has 5 elements": function(array) {
                        assert.length(array, 5)
                    },
                    "has correct elements": function(array) {
                        assert.equal(array[0].i,1)
                        assert.equal(array[1].i,2)
                        assert.equal(array[2].i,3)
                        assert.equal(array[3].i,4)
                        assert.equal(array[4].i,5)
                    }
                },
                "and sorting": {
                    topic: function(insertedRows, collection, db) {
                        collection.find().sort({i:1}).toArray(this.callback)
                    },
                    "has 5 elements": function(array) {
                        assert.length(array, 5)
                    },
                    "has correct elements": function(array) {
                        assert.equal(array[0].i,1)
                        assert.equal(array[1].i,2)
                        assert.equal(array[2].i,3)
                        assert.equal(array[3].i,4)
                        assert.equal(array[4].i,5)
                    }
                },
                "and sorting in reverse": {
                    topic: function(insertedRows, collection, db) {
                        collection.find().sort({i:-1}).toArray(this.callback)
                    },
                    "has 5 elements": function(array) {
                        assert.length(array, 5)
                    },
                    "has correct elements": function(array) {
                        assert.equal(array[0].i,5)
                        assert.equal(array[1].i,4)
                        assert.equal(array[2].i,3)
                        assert.equal(array[3].i,2)
                        assert.equal(array[4].i,1)
                    }
                },
                "and limiting to 3": {
                    topic: function(insertedRows, collection, db) {
                        collection.find().limit(3).sort({i:1}).toArray(this.callback)
                    },
                    "has 3 elements": function(array) {
                        assert.length(array, 3)
                    },
                    "has correct elements": function(array) {
                        assert.equal(array[0].i,1)
                        assert.equal(array[1].i,2)
                        assert.equal(array[2].i,3)
                    }
                },
                "and skipping 1, limiting to 3": {
                    topic: function(insertedRows, collection, db) {
                        collection.find().skip(1).limit(3).sort({i:1}).toArray(this.callback)
                    },
                    "has 3 elements": function(array) {
                        assert.length(array, 3)
                    },
                    "has correct elements": function(array) {
                        assert.equal(array[0].i,2)
                        assert.equal(array[1].i,3)
                        assert.equal(array[2].i,4)
                    }
                }
            }
        },
        "and collection 'test3'": {
            topic: function(db) {
                return db.collection('test3')
            },
            "with 1000 inserted documents,": {
                topic: function (collection, db) {
                    var array = []
                    for (var i=0; i<1000; i++) {
                        array.push({
                            i:i,
                            even:(i%2) == 0
                        })
                    }
                    collection.insert(array, this.callback)
                },
                "it succeeds": function(err,insertedRows) {
                    assert.equal(err, null)
                },
                "and count": {
                    topic: function(insertedRows, collection, db) {
                        collection.find().count(this.callback)
                    },
                    "is 1000": function(count) {
                        assert.equal(count, 1000)
                    }
                },
                "and size": {
                    topic: function(insertedRows, collection, db) {
                        collection.find().size(this.callback)
                    },
                    "is 1000": function(count) {
                        assert.equal(count, 1000)
                    }
                },
                "and sorted count": {
                    topic: function(insertedRows, collection, db) {
                        collection.find().sort({i:-1}).count(this.callback)
                    },
                    "is 1000": function(count) {
                        assert.equal(count, 1000)
                    }
                },
                "and sorted size": {
                    topic: function(insertedRows, collection, db) {
                        collection.find().sort({i:-1}).size(this.callback)
                    },
                    "is 1000": function(count) {
                        assert.equal(count, 1000)
                    }
                },
                "and limit(50) count": {
                    topic: function(insertedRows, collection, db) {
                        collection.find().limit(50).count(this.callback)
                    },
                    "is 1000": function(count) {
                        assert.equal(count, 1000)
                    }
                },
                "and limit(50) size": {
                    topic: function(insertedRows, collection, db) {
                        collection.find().limit(50).size(this.callback)
                    },
                    "is 50": function(count) {
                        assert.equal(count, 50)
                    }
                },
                "and limit(50).skip(50) count": {
                    topic: function(insertedRows, collection, db) {
                        collection.find().limit(50).skip(50).count(this.callback)
                    },
                    "is 1000": function(count) {
                        assert.equal(count, 1000)
                    }
                },
                "and limit(50).skip(50) size": {
                    topic: function(insertedRows, collection, db) {
                        collection.find().limit(50).skip(50).size(this.callback)
                    },
                    "is 50": function(count) {
                        assert.equal(count, 50)
                    }
                },
                "and limit(50).skip(990) count": {
                    topic: function(insertedRows, collection, db) {
                        collection.find().limit(50).skip(990).count(this.callback)
                    },
                    "is 1000": function(count) {
                        assert.equal(count, 1000)
                    }
                },
                "and limit(50).skip(990) size": {
                    topic: function(insertedRows, collection, db) {
                        collection.find().limit(50).skip(990).size(this.callback)
                    },
                    "is 10": function(count) {
                        assert.equal(count, 10)
                    }
                },
                "and sorted": {
                    topic: function(insertedRows, collection, db) {
                        collection.find().sort({i:-1}).limit(1000).toArray(this.callback)
                    },
                    "length is 1000": function(count) {
                        assert.length(count, 1000)
                    }
                }
            }
        },
        "and collection 'test4'": {
            topic: function(db) {
                return db.collection('test4')
            },
            "with 10000 inserted documents,": {
                topic: function (collection, db) {
                    var array = []
                    for (var i=0; i<10000; i++) {
                        array.push({
                            i:i,
                            even:(i%2) == 0
                        })
                    }
                    collection.insert(array, this.callback)
                },
                "it succeeds": function(err,insertedRows) {
                    assert.equal(err, null)
                },
                "and count": {
                    topic: function(insertedRows, collection, db) {
                        collection.find().count(this.callback)
                    },
                    "is 10000": function(count) {
                        assert.equal(count, 10000)
                    }
                },
                "and array": {
                    topic: function(insertedRows, collection, db) {
                        collection.find().toArray(this.callback)
                    },
                    "length is 10000": function(count) {
                        assert.length(count, 10000)
                    }
                },
                "and sorted": {
                    topic: function(insertedRows, collection, db) {
                        collection.find().sort({i:-1}).limit(10000).toArray(this.callback)
                    },
                    "length is 10000": function(count) {
                        assert.length(count, 10000)
                    }
                }
            }
        }
    }
}).export(module)