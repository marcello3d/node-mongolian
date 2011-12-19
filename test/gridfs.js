/* Mongolian DeadBeef by Marcello Bastea-Forte - zlib license */

var Mongolian = require('../mongolian')

var db,collection

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

    "check file count is still 1": function(test) {
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

    "close connection": function(test) {
        db.server.close()
        test.done()
    }
}