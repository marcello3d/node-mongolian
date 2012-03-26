/* Mongolian DeadBeef by Marcello Bastea-Forte - zlib license */

var Mongolian = require('../mongolian')

var db,collection

function testRandomFile(numberOfBytes, writeChunkSize, chunkSize) {
    return function (test) {
        // Delete any previous file
        gridfs.findOne('random',function(error,oldFile) {
            test.ifError(error)
            if (oldFile) oldFile.remove()

            // Generate random buffer
            var fileBuffer = new Buffer(numberOfBytes)
            for (var i=0; i<numberOfBytes; i++) {
                fileBuffer[i] = i & 0xFF
            }

            // Create grid file
            var gridFile = gridfs.create('random')
            if (chunkSize) {
                gridFile.chunkSize = chunkSize
            }
            // Get write stream and write out buffer
            var writeStream = gridFile.writeStream()
            writeStream.once('error',function(error) {
                test.ifError(error)
            })
            // After the stream finishes...
            writeStream.once('close',function() {
                test.ok(!writeStream.writable)
                // Find the file again
                gridfs.findOne('random', function(error, file) {
                    test.ifError(error)
                    test.ok(file)

                    // Read it in again
                    var readStream = file.readStream()
                    test.ok(readStream)
                    var bytesRead = 0

                    // Check the bytes match
                    readStream.on('data',function(chunk) {
                        test.equal(chunk.toString(),
                            fileBuffer.slice(bytesRead,bytesRead+=chunk.length).toString())
                    })
                    readStream.on('error', function(error) {
                        test.ifError(error)
                    })
                    readStream.on('end',function() {
                        test.equal(bytesRead, numberOfBytes)
                        test.done()
                    })
                })
            })

            // Write out the buffer to the stream using the write chunk size specified
            for (var i=0; i<numberOfBytes; i+=writeChunkSize) {
                writeStream.write(fileBuffer.slice(i,i+writeChunkSize))
            }
            writeStream.end()
        })
    }
}

module.exports = {
    "create connection": function(test) {
        db = new Mongolian('mongo://localhost/mongolian_test', { log:false })
        gridfs = db.gridfs('testfs')
        db.dropDatabase(function(error) {
            test.ifError(error)
            test.done()
        })
    },

    "create small file": function(test) {
        var stream = gridfs.create('foo').writeStream()
        stream.once('error',function(error) {
            test.ifError(error)
        })
        stream.once('close',function() {
            test.ok(!stream.writable)
            test.done()
        })
        stream.end("Hello world!")
    },

    "count files": function(test) {
        gridfs.find().count(function(error, count) {
            test.ifError(error)
            test.equal(count, 1)
            test.done()
        })
    },

    "find file": function(test) {
        gridfs.findOne('foo', function(error, file) {
            test.ifError(error)
            test.ok(file)
            test.equal(file.length, 12)
            test.done()
        })
    },

    "read file": function(test) {
        gridfs.findOne('foo', function(error, file) {
            test.ifError(error)
            test.ok(file)
            var stream = file.readStream()
            test.ok(stream)
            var text = ''
            stream.on('data',function(chunk) { text += chunk.toString() })
            stream.on('error', function(error) {
                test.ifError(error)
            })
            stream.on('end',function() {
                test.equal(text, 'Hello world!')
                test.done()
            })
        })
    },

    "create file with same name": function(test) {
        var stream = gridfs.create('foo').writeStream()
        stream.once('error',function(error) {
            test.ifError(error)
        })
        stream.once('close',function() {
            test.ok(!stream.writable)
            test.done()
        })
        stream.end("Adios, space cowboy!")
    },

    "check file count is now 2": function(test) {
        gridfs.find().count(function(error, count) {
            test.ifError(error)
            test.equal(count, 2)
            test.done()
        })
    },

    "remove first file": function(test) {
        gridfs.findOne({
            filename:'foo',
            length:12
        }, function(error, file) {
            test.ifError(error)
            test.ok(file)
            test.equal(file.length, 12)
            file.remove(function(error) {
                test.ifError(error)
                test.done()
            })
        })
    },

    "check file count is 1 again": function(test) {
        gridfs.find().count(function(error, count) {
            test.ifError(error)
            test.equal(count, 1)
            test.done()
        })
    },

    "find file again": function(test) {
        gridfs.findOne('foo', function(error, file) {
            test.ifError(error)
            test.ok(file)
            test.equal(file.length, 20)
            test.done()
        })
    },

    "read file again": function(test) {
        gridfs.findOne('foo', function(error, file) {
            test.ifError(error)
            test.ok(file)
            var stream = file.readStream()
            test.ok(stream)
            var text = ''
            stream.on('data',function(chunk) { text += chunk.toString() })
            stream.on('error', function(error) {
                test.ifError(error)
            })
            stream.on('end',function() {
                test.equal(text, 'Adios, space cowboy!')
                test.done()
            })
        })
    },
    "test random 10 byte file written in 10 byte blocks":testRandomFile(10, 10),
    "test random 1000 byte file written in 1000 byte blocks":testRandomFile(1000, 1000),
    "test random 100000 byte file written in 100000 byte blocks":testRandomFile(100000, 100000),
    "test random 1000000 byte file written in 1000000 byte blocks":testRandomFile(1000000, 1000000),
    "test random 1000 byte file written in 10 byte blocks":testRandomFile(1000, 10),
    "test random 100000 byte file written in 10 byte blocks":testRandomFile(100000, 10),
    "test random 1000000 byte file written in 10 byte blocks":testRandomFile(1000000, 10),
    "test random 100000 byte file written in 1000 byte blocks":testRandomFile(100000, 1000),
    "test random 1000000 byte file written in 1000 byte blocks":testRandomFile(1000000, 1000),
    "test random 1000000 byte file written in 100000 byte blocks":testRandomFile(1000000, 100000),
    "test random 10 byte file written in 10 byte blocks with chunksize 12345":testRandomFile(10, 10, 12345),
    "test random 1000 byte file written in 1000 byte blocks with chunksize 12345":testRandomFile(1000, 1000, 12345),
    "test random 100000 byte file written in 100000 byte blocks with chunksize 12345":testRandomFile(100000, 100000, 12345),
    "test random 1000000 byte file written in 1000000 byte blocks with chunksize 12345":testRandomFile(1000000, 1000000, 12345),
    "test random 1000 byte file written in 10 byte blocks with chunksize 12345":testRandomFile(1000, 10, 12345),
    "test random 100000 byte file written in 10 byte blocks with chunksize 12345":testRandomFile(100000, 10, 12345),
    "test random 1000000 byte file written in 10 byte blocks with chunksize 12345":testRandomFile(1000000, 10, 12345),
    "test random 100000 byte file written in 1000 byte blocks with chunksize 12345":testRandomFile(100000, 1000, 12345),
    "test random 1000000 byte file written in 1000 byte blocks with chunksize 12345":testRandomFile(1000000, 1000, 12345),
    "test random 1000000 byte file written in 100000 byte blocks with chunksize 12345":testRandomFile(1000000, 100000, 12345),

    "close connection": function(test) {
        db.server.close()
        test.done()
    }
}