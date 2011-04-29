/* Mongolian DeadBeef by Marcello Bastea-Forte - zlib license */

var fs = require("fs")

var Mongolian = require('mongolian')

var server = new Mongolian

var db = server.db("mongolian_trainer"),
    small = db.collection("small"),
    medium = db.collection("medium"),
    large = db.collection("large")

//db.dropDatabase(asyncLog("dropped database"))

small.ensureIndex({foo:1},asyncLog("ensuredIndex!"))
medium.ensureIndex({foo:1})
large.ensureIndex({foo:1})

// Adds some junk to the database
function fillCollection(collection, max, callback) {
    collection.count(function(err,count) {
        console.log(collection+" count = "+count)
        while (count < max) {
            var toInsert = []
            while (count < max) {
                toInsert.push({ foo: Math.random(), index: count++ })
                if (toInsert.length == 300) {
                    break
                }
            }
            console.log("inserting "+toInsert.length+" document(s) into "+collection)
            collection.insert(toInsert)
        }
        callback()
    })
}

// Creates function(err,value) that prints out the result to console
function asyncLog(prefix) {
    return function(err,value) {
        if (err) {
            console.warn("Error getting "+prefix+': '+err, err.stack)
        } else {
            console.log(prefix+':',value)
        }
    }
}


fillCollection(small, 50, function() {
    small.find().limit(5).toArray(asyncLog('small find limit 5'))
    small.find({foo:{$lte:0.5}},{foo:true,_id:false}).limit(49).toArray(asyncLog('small find foo<0.5 limit 49'))
    small.find().limit(100).sort({foo:1}).toArray(asyncLog('small find sorted limit 100'))
    small.find().batchSize(10).toArray(asyncLog('small find all, batchsize=10'))
})
fillCollection(medium, 500, function() {
    medium.findOne(asyncLog('medium findOne'))
})
fillCollection(large, 50000, function() {
    large.findOne({foo:{$gt:0.5}}, asyncLog('large foo>0.5 findOne'))

})

// Get a list of databases on this server
server.dbNames(asyncLog("db names"))

// Get a list of collections on this database (should be [ 'system.indexes', 'small', 'medium', 'large' ])
db.collectionNames(asyncLog("collection names"))

////// Map reduce
large.mapReduce(
    function map() {
        emit('count', {
            count:1,
            sum: this.foo
        })
    },
    function reduce(key, values) {
        var count = 0, sum = 0
        values.forEach(function(value) {
          count += value.count
          sum += values.sum
        })
        return {
            count:count,
            sum:sum
        }
    },{
        out: 'periscope'
    },function (error, result) {
        result.find().toArray(asyncLog('map reduce result'))
    }
)



////// Grid FS

var gridfs = db.gridfs()

// Create new file write stream
var stream = gridfs.create({
    filename:"License",
    contentType: "text/plain"
}).writeStream()

// Pipe license file to gridfile
fs.createReadStream(__dirname+'/../LICENSE').pipe(stream)

// Read file back from gridfs
stream.on('close', function() {
    gridfs.findOne("License", function (err, file) {
        if (err) throw err
        console.log("opened file:",file)
        var read = file.readStream()
        read.on('data', function (chunk) {
            console.log("chunk["+chunk.length+"] = <"+chunk+">")
        })
        read.on('end', function() {
            console.log("all done")
        })
    })
})


// Create new file write stream
var stream2 = gridfs.create({
    filename:"License",
    contentType: "text/plain"
}).writeStream()

// Pipe license file to gridfile
fs.createReadStream(__dirname+'/../LICENSE').pipe(stream2)

// Read file back from gridfs
stream2.on('close', function() {
    gridfs.findOne("License", function (err, file) {
        if (err) throw err
        console.log("opened file:",file)
        var read = file.readStream()
        read.on('data', function (chunk) {
            console.log("chunk["+chunk.length+"] = <"+chunk+">")
        })
        read.on('end', function() {
            console.log("all done")
        })
    })
})

// Generates alphabet buffers
function funBuffer(size) {
    var buffer = new Buffer(size)
    for (var i=0; i<size; i++) {
        if (i%1000 == 0) buffer[i++] = 13
        buffer[i] = 97 + (i%26)
    }
    return buffer
}

// Create a new write stream and manually write out data
var stream3 = gridfs.create("not-so-random-text.txt").writeStream()

stream3.on('close', function() {
    // Read the file back in...
    gridfs.findOne("not-so-random-text.txt", function (err, file) {
        if (err) throw err
        console.log("opened file:",file)
        var read = file.readStream()
        read.on('data', function(chunk) {
            console.log("chunk["+chunk.length+"] = <"+(chunk.length > 100 ? chunk.slice(0,100) + "..." : chunk)+">")
        })
        read.on('end', function() {
            console.log("all done")
        })
    })
})

stream3.write(new Buffer("hello world 100"))
stream3.write(funBuffer(100))
stream3.write(new Buffer("hello world 10000"))
stream3.write(funBuffer(10000))
stream3.write(new Buffer("hello world 500000"))
stream3.write(funBuffer(500000))
stream3.write(new Buffer("hello world 500000 again"))
stream3.write(funBuffer(500000))
stream3.end()
