/* Mongolian DeadBeef by Marcello Bastea-Forte - zlib license */

var Mongolian = require('mongolian')

var server = new Mongolian

var db = server.db("mongolian_trainer"),
    small = db.collection("small"),
    medium = db.collection("medium"),
    large = db.collection("large")

small.ensureIndex({foo:1},asyncLog("ensuredIndex!"))
medium.ensureIndex({foo:1},asyncLog("ensuredIndex!"))
large.ensureIndex({foo:1},asyncLog("ensuredIndex!"))

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
            console.warn("Error getting "+prefix+': '+err, err.stack)
        } else {
            console.log(prefix+':',value)
        }
    }
}

server.dbNames(asyncLog("db names"))
db.collectionNames(asyncLog("collection names"))

small.find().limit(5).toArray(asyncLog('small find limit 5'))
small.find({foo:{$lte:0.5}},{foo:true,_id:false}).limit(49).toArray(asyncLog('small find foo<0.5 limit 49'))
small.find().limit(100).sort({foo:1}).toArray(asyncLog('small find sorted limit 100'))
small.find().batchSize(10).toArray(asyncLog('medium find all'))
medium.findOne(asyncLog('medium findOne'))

////// Grid FS

var gridfs = db.gridfs()

var stream = gridfs.create("hello.txt").writeStream()

require("fs").createReadStream(__filename).pipe(stream)

stream.on('close', function() {
    gridfs.findOne("hello.txt", function (err, file) {
        var read = file.readStream()
        read.on('data', function (chunk) {
            console.log("chunk["+chunk.length+"] = <"+chunk+">")
        })
        read.on('end', function() {
            console.log("all done")
        })
    })
})

function funBuffer(size) {
    var buffer = new Buffer(size)
    for (var i=0; i<size; i++) {
        if (i%1000 == 0) buffer[i++] = 13
        buffer[i] = 97 + (i%26)
    }
    return buffer
}
var stream2 = gridfs.create("hello2.txt").writeStream()
stream2.write(new Buffer("hello world 100"))
stream2.write(funBuffer(100))
stream2.write(new Buffer("hello world 10000"))
stream2.write(funBuffer(10000))
stream2.write(new Buffer("hello world 500000"))
stream2.write(funBuffer(500000))
stream2.write(new Buffer("hello world 500000 again"))
stream2.write(funBuffer(500000))
stream2.end()
gridfs.findOne("hello2.txt", function (err, file) {
    var read = file.readStream()
    read.on('data', function(chunk) {
        console.log("chunk["+chunk.length+"] = <"+chunk+">")
    })
    read.on('end', function() {
        console.log("all done")
    })
})