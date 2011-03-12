/* Mongolian DeadBeef by Marcello Bastea-Forte - zlib license */
var safetyNet = require('./util').safetyNet,
    stream = require('stream'),
    util = require('util'),
    crypto = require('crypto'),
    mongo = require('mongodb'),
    Long = mongo.Long


var MongolianGridFile = module.exports = function(gridfs, document) {
    this.gridfs = gridfs
    this._id = document._id
    this.chunkSize = flattenLong(document.chunkSize || 256 * 1024)
    this.length = flattenLong(document.length)
    this.filename = document.filename
    this.aliases = document.aliases
    this.md5 = document.md5
    this.contentType = document.contentType
    this.uploadDate = document.uploadDate
    this.metadata = document.metadata || {}
}
/**
 * Saves all the metadata associated with this file
 */
MongolianGridFile.prototype.save = function(callback) {
    this.gridfs.files.save({
        _id: this._id,
        chunkSize: this.chunkSize,
        length: this.length,
        filename: this.filename,
        aliases: this.aliases,
        md5: this.md5,
        contentType: this.contentType,
        uploadDate: this.uploadDate,
        metadata: this.metadata
    }, callback)
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
    if (!this._id) throw new Error("Can only read files in the db")
    this.gridfs.chunks.findOne({ files_id:this._id, n:chunkIndex }, { data:true }, callback)
}
/**
 * Returns the number of chunks this file *should* have
 */
MongolianGridFile.prototype.chunkCount = function() {
    var chunkCount = divideCeilLongs(this.length, this.chunkSize)
    if (chunkCount instanceof Long) throw new Error("More chunks than we can handle!")
    return chunkCount
}

/**
 * Returns a Readable Stream for this file (bind to the 'data' 'error', and 'done' events)
 */
MongolianGridFile.prototype.readStream = function() {
    return new MongolianGridFileReadStream(this)
}

/**
 * Remove this file from the gridfs
 */
MongolianGridFile.prototype.remove = function() {
    this.gridfs.files.remove({ _id:this._id })
    this.gridfs.chunks.remove({ files_id:this._id })
}

MongolianGridFile.prototype.toString = function() {
    return this.gridfs + ":" + this.document
}

//////////////////////////////////////////////////////////////////////////////////
// Internal

/** Converts Numbers to Longs */
function toLong(l) {
    return l instanceof Long ? l : Long.fromNumber(l)
}
/** Converts a Long to a Number if possible */
function flattenLong(l) {
    return l instanceof Long && !l.high_ ? l.low_ : l
}
function addLongs(a,b) {
    return flattenLong(toLong(a).add(toLong(b)))

}
function divideCeilLongs(a,b) {
    if (a instanceof Long || b instanceof Long) {
        var r = toLong(a).div(toLong(b))
        return flattenLong(r.multiply(b).lessThan(a) ? r.add(Long.ONE) : r)
    }
    return Math.ceil(a / b)
}


/**
 * Treats a MongolianGridFile as a node.js Writeable Stream
 */
function MongolianGridFileWriteStream(file) {
    if (file.chunkSize instanceof Long) throw new Error("Long (64bit) chunkSize unsupported")
    if (file.chunkSize <= 0) throw new Error("File has invalid chunkSize: "+file.chunkSize)
    stream.Stream.call(this)
    this.file = file
    this.writable = true
    this.encoding = 'binary'
    this._hash = crypto.createHash('md5')
    this._chunkIndex = 0
    file.length = 0
    this._chunkSize = file.chunkSize
    this.file.remove()
}
util.inherits(MongolianGridFileWriteStream,stream.Stream)

MongolianGridFileWriteStream.prototype.write = function(data, encoding, callback) {
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

        this._partialIndex += copySize
        index += copySize
        doc.length = addLongs(doc.length, copySize)

        delete doc.md5
        doc.uploadDate = new Date

        if (this._partialIndex == this._partialChunk.length) {
            this.flush()
        }
    }
}
MongolianGridFileWriteStream.prototype.flush = function() {
    this.file.save()
    if (!this._partialIndex) return

    this.file.gridfs.chunks.update({
        files_id:this.file._id,
        n:this._chunkIndex
    },{
        data:new mongo.BSONPure.Binary(this._partialChunk.slice(0, this._partialIndex)),
        files_id:this.file._id,
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
    if (data instanceof Function) {
        callback = data
        data = undefined
    }
    if (data) {
        this.write(data)
    }
    this.file.md5 = this._hash.digest('hex')
    this.flush()
    this.emit('close')
}
MongolianGridFileWriteStream.prototype.destroy = function(cb) {
    if (this.writable) {
        this.writable = false
        this.emit('close')
    }
}

/**
 * Treats a MongolianGridFile as a node.js Readable Stream
 */
function MongolianGridFileReadStream(file) {
    if (!file._id) throw new Error("Can only read db files")
    if (file.chunkSize instanceof Long) throw new Error("Long (64bit) chunkSize unsupported")
    if (file.chunkSize <= 0) throw new Error("File has invalid chunkSize: "+file.chunkSize)

    stream.Stream.call(this)

    this.file = file
    this.readable = true
    this._chunkCount = file.chunkCount()
    this._chunkIndex = 0

    process.nextTick(this._read.bind(this))
}
util.inherits(MongolianGridFileReadStream,stream.Stream)

MongolianGridFileReadStream.prototype._read = function() {
    var self = this;
    if (self._chunkIndex < self._chunkCount) {
        self.file.getChunk(this._chunkIndex++, function (err, chunk) {
            if (err || !chunk) {
                self.emit('error', err || new Error("Chunk not found"))
                self.readable = false
            } else if (self.paused) {
                self._pauseData = chunk.data.buffer
            } else if (self.readable) {
                self.emit('data', chunk.data.buffer)
                self._read()
            }
        })
    } else {
        this.readable = false
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