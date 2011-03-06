/* Mongolian DeadBeef by Marcello Bastea-Forte - zlib license */
var safetyNet = require('./util').safetyNet,
    stream = require('stream'),
    util = require('util'),
    crypto = require('crypto'),
    mongo = require('mongodb')


var MongolianGridFile = module.exports = function(gridstore, document) {
    this.gridstore = gridstore
    this.document = document
    if (!this.document.chunkSize) {
        this.document.chunkSize = 256 * 1024
    }
}

/**
 * Saves all the metadata associated with this file
 */
MongolianGridFile.prototype.save = function(callback) {
    this.gridstore.files.save(this.document, callback)
}

/**
 * Returns a Writeable Stream for this file
 */
MongolianGridFile.prototype.writeStream = function() {
    return new MongolianGridFileWriteStream(this)
}
/**
 * Returns the nth chunk from this file
 */
MongolianGridFile.prototype.getChunk = function(chunkIndex, callback) {
    if (!this.document._id) throw new Error("Can only read files in the db")
    this.gridstore.chunks.findOne({ files_id:this.document._id, n:chunkIndex }, { data:true }, callback)
}
/**
 * Returns the number of chunks this file *should* have
 */
MongolianGridFile.prototype.chunkCount = function() {
    return Math.ceil(this.document.length / this.document.chunkSize)
}

/**
 * Returns a Readable Stream for this file (bind to the 'data' 'error', and 'done' events)
 */
MongolianGridFile.prototype.readStream = function() {
    return new MongolianGridFileReadStream(this)
}

/**
 * Remove this file from the gridstore
 */
MongolianGridFile.prototype.remove = function() {
    this.gridstore.files.remove({ _id:this.document._id })
    this.gridstore.chunks.remove({ files_id:this.document._id })
}

MongolianGridFile.prototype.toString = function() {
    return this.gridstore + ":" + this.document
}

//////////////////////////////////////////////////////////////////////////////////
// Internal

/**
 * Treats a MongolianGridFile as a node.js Writeable Stream
 */
function MongolianGridFileWriteStream(file) {
    if (file.document.chunkSize <= 0) throw new Error("File has invalid chunkSize: "+file.document.chunkSize)
    stream.Stream.call(this)
    this.file = file
    this.writable = true
    this.encoding = 'binary'
    this._hash = crypto.createHash('md5')
    this._chunkIndex = 0
    file.document.length = 0
    this._chunkSize = file.document.chunkSize
    this.file.remove()
    console.log("Created file write stream")
}
util.inherits(MongolianGridFileWriteStream,stream.Stream)

MongolianGridFileWriteStream.prototype.write = function(data, encoding, callback) {
    console.log("writing...",data.length)
    if (!this.writable) throw new Error('Stream not writable')
    var doc = this.file.document
    if (this._chunkSize != doc.chunkSize) throw new Error("Chunk size changed between writes!")

    if (encoding instanceof Function) {
        callback = encoding
        encoding = "utf8"
    }
    if (!Buffer.isBuffer(data)) {
        data = new Buffer(data, encoding)
    }

    for (var index = 0; index < data.length; ) {
        if (!this._partialChunk) {
            this._partialChunk = new Buffer(this._chunkSize)
            this._partialIndex = 0
        }
        var copySize = Math.min(this._partialChunk.length - this._partialIndex, data.length - index)
        data.copy(this._partialChunk, this._partialIndex, index, index + copySize)
        this._hash.update(data.slice(index, index + copySize))
        console.log("   copied "+copySize+" bytes")

        this._partialIndex += copySize
        index += copySize
        doc.length += copySize

        delete doc.md5
        doc.uploadDate = new Date

        if (this._partialIndex == this._partialChunk.length) {
            this.flush()
        }
    }
}
MongolianGridFileWriteStream.prototype.flush = function() {
    console.log(" flushing... "+this._partialIndex+" bytes")
    this.file.save()
    if (!this._partialIndex) return

    this.file.gridstore.chunks.update({
        files_id:this.file.document._id,
        n:this._chunkIndex
    },{
        data:new mongo.Binary(this._partialChunk.slice(0, this._partialIndex)),
        files_id:this.file.document._id,
        n:this._chunkIndex
    }, true)

    if (this._partialIndex == this._partialChunk.length) {
        this._chunkIndex++
        delete this._partialIndex
        delete this._partialChunk
    }
}
MongolianGridFileWriteStream.prototype.end = function(data, callback) {
    this.writable = false
    console.log("ending...", arguments)
    if (data instanceof Function) {
        callback = data
        data = undefined
    }
    if (data) {
        this.write(data)
    }
    this.file.document.md5 = this._hash.digest('hex')
    this.flush()
    this.emit('close')
}
MongolianGridFileWriteStream.prototype.destroy = function(cb) {
    console.log("destroying...")
    if (this.writable) {
        this.writable = false
        this.emit('close')
    }
}

/**
 * Treats a MongolianGridFile as a node.js Readable Stream
 */
function MongolianGridFileReadStream(file) {
    if (!file.document._id) throw new Error("Can only read db files")
    if (file.document.chunkSize <= 0) throw new Error("File has invalid chunkSize: "+file.document.chunkSize)

    stream.Stream.call(this)
    console.log("new read stream")

    this.file = file
    this.readable = true
    this._chunkCount = file.chunkCount()
    this._chunkIndex = 0

    process.nextTick(this._read.bind(this))
}
util.inherits(MongolianGridFileReadStream,stream.Stream)

MongolianGridFileReadStream.prototype._read = function() {
    console.log("reading...")
    var self = this;
    if (self._chunkIndex < self._chunkCount) {
        self.file.getChunk(this._chunkIndex++, function (err, chunk) {
            if (err || !chunk) {
                self.emit('error', err || new Error("Invalid chunk"))
                self.readable = false
            } else if (self.paused) {
                self._pauseData = chunk.data.value()
            } else if (self.readable) {
                self.emit('data', chunk.data.value())
                self._read()
            }
        })
    } else {
        this.readable = false
        console.log("done reading")
        self.emit('end')
    }
}
MongolianGridFileReadStream.prototype.destroy = function() {
    this.readable = false
    this.emit('close')
}
MongolianGridFileReadStream.prototype.pause = function() {
    this.paused = true
    this.emit('pause')
}
MongolianGridFileReadStream.prototype.resume = function() {
    this.paused = false
    this.emit('resume')
    if (this._pauseData) {
        this.emit('data', this._pauseData)
        delete this._pauseData
        this._read()
    }
}