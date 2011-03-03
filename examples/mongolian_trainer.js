/* Mongolian DeadBeef by Marcello Bastea-Forte - zlib license */

var Mongolian = require('mongolian')

var server = new Mongolian

var db = server.db("mongolian_trainer"),
    small = db.collection("small"),
    medium = db.collection("medium"),
    large = db.collection("large")

function fillCollection(collection, max) {
    collection.count(function(err,count) {
        console.log(collection+" count = "+count)
        while (count < max) {
            var toInsert = []
            while (count < max) {
                toInsert.push({ foo: Math.random(), index: count++ })
                if (toInsert.length > 500) {
                    break
                }
            }
            collection.insert(toInsert)
        }
    })
}

fillCollection(small, 50)
fillCollection(medium, 500)
fillCollection(large, 50000)

function asyncLog(prefix) {
    return function(err,value) {
        if (err) {
            console.warn("Error getting "+prefix+':',err, err.stack)
        } else {
            console.log(prefix+':',value)
        }
    }
}

server.dbNames(asyncLog("db names"))
db.collectionNames(asyncLog("collection names"))

small.find({foo:{$lte:0.5}},{foo:true,_id:false}).limit(49).toArray(asyncLog('small find limit 49'))
small.find().limit(100).sort({foo:1}).toArray(asyncLog('small find sorted limit 50'))
small.find().batchSize(10).toArray(asyncLog('medium find all'))
medium.findOne(asyncLog('medium findOne'))

