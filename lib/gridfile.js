/* Mongolian DeadBeef by Marcello Bastea-Forte - zlib license */
var mongo = require('mongodb'),
    stream = require('stream'),
    util = require('util'),
    crypto = require('crypto'),
    Waiter = require('waiter')

var safetyNet = require('./util').safetyNet,
    callback = require('./util').callback,
    bson = require('./bson'),
    Long = bson.Long,
    Binary = bson.Binary

var MongolianGridFile = module.exports = function(gridfs, document) {
    this.gridfs = gridfs
    this._id = document._id
    this.chunkSize = flattenLong(document.chunkSize || 256 * 1024)
    this.length = flattenLong(document.length)
    this.filename = document.filename
    this.aliases = document.aliases
    this.md5 = document.md5
    this.contentType = document.contentType
    if (document.uploadDate) this.uploadDate = document.uploadDate
    if (document.metadata) this.metadata = document.metadata
}
/**
 * Saves all the metadata associated with this file
 */
MongolianGridFile.prototype.save = function(callback) {
    var self = this

    var waiter = new Waiter
    if (!self._id) {
        self._id = new bson.ObjectId
        var findCallback = waiter()
        // Remove existing file
        self.gridfs.findOne({
            filename:self.filename,
            id:{ $ne:self._id }
        },safetyNet(callback,function(file) {
            if (file) {
                file.remove(findCallback)
            } else {
                findCallback()
            }
        }))
    }

    var document = {
        _id: self._id,
        chunkSize: self.chunkSize,
        length: self.length,
        filename: self.filename,
        md5: self.md5,
        contentType: self.contentType,
        uploadDate: self.uploadDate
    }
    // Optional fields
    if (self.aliases) document.aliases = self.aliases
    if (self.metadata) document.metadata = self.metadata
    self.gridfs.files.save(document, waiter())

    waiter.waitForAll(callback)
}

/**
 * Creates a Writeable Stream for this file
 */
MongolianGridFile.prototype.writeStream = function() {
    return new MongolianGridFileWriteStream(this)
}
/**
 * Retrieves the nth chunk from this file
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
 * Creates a Readable Stream for this file (bind to the 'data' 'error', and 'done' events)
 */
MongolianGridFile.prototype.readStream = function() {
    return new MongolianGridFileReadStream(this)
}

/**
 * Remove this file from the gridfs
 */
MongolianGridFile.prototype.remove = function(callback) {
    var waiter = new Waiter
    this.gridfs.files.remove({ _id:this._id }, waiter())
    this.gridfs.chunks.remove({ files_id:this._id }, waiter())
    waiter.waitForAll(callback)
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
}
util.inherits(MongolianGridFileWriteStream,stream.Stream)

MongolianGridFileWriteStream.prototype.write = function(data, encoding, callback) {
    if (!this.writable) throw new Error('Stream not writable')
    var file = this.file
    if (this._chunkSize != file.chunkSize) throw new Error("Chunk size changed between writes!")

    if (typeof encoding === 'function') {
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
        file.length = addLongs(file.length, copySize)

        delete file.md5
        file.uploadDate = new Date

        if (this._partialIndex === this._partialChunk.length) {
            this.flush()
        }
    }
}
MongolianGridFileWriteStream.prototype.flush = function(callback) {
    var waiter = new Waiter
    this.file.save(waiter())
    if (this._partialIndex) {
        this.file.gridfs.chunks.upsert({
            files_id:this.file._id,
            n:this._chunkIndex
        },{
            data:new Binary(this._partialChunk.slice(0, this._partialIndex)),
            files_id:this.file._id,
            n:this._chunkIndex
        }, waiter())

        if (this._partialIndex === this._partialChunk.length) {
            this._chunkIndex++
            delete this._partialIndex
            delete this._partialChunk
        }
    }
    waiter.waitForAll(callback)
}
MongolianGridFileWriteStream.prototype.end = function(data, encoding) {
    if (!this.writable) throw new Error("Stream is not writable")
    if (data) this.write(data,encoding)
    this.writable = false
    if (this.file.length) this.file.md5 = this._hash.digest('hex')
    var self = this
    this.flush(function(error) {
        if (self.destroyed) return
        if (error) {
            self.emit('error',error)
            self.destroy()
        } else {
            self.emit('close')
        }
    })
}
/**
 * Destroys the stream, without flushing pending data
 */
MongolianGridFileWriteStream.prototype.destroy = function() {
    this.writable = false
    this.destroyed = true
}

/**
 * Treats a MongolianGridFile as a node.js Readable Stream
 */
function MongolianGridFileReadStream(file) {
    if (!file._id) throw new Error("Can only read files retrieved from the database")
    if (file.chunkSize instanceof Long) throw new Error("Long (64bit) chunkSize unsupported")
    if (file.chunkSize <= 0) throw new Error("File has invalid chunkSize: "+file.chunkSize)

    stream.Stream.call(this)

    this.file = file
    this.readable = true
    this._chunkCount = file.chunkCount()
    this._chunkIndex = 0

    process.nextTick(this._nextChunk.bind(this))
}
util.inherits(MongolianGridFileReadStream,stream.Stream)

MongolianGridFileReadStream.prototype._nextChunk = function() {
    var self = this;
    if (self._chunkIndex < self._chunkCount) {
        var chunkIndex = self._chunkIndex++
        self.file.getChunk(chunkIndex, function(error, chunk) {
            if (!self.readable) return
            if (error || !chunk) {
                self.emit('error', error || new Error("Chunk not found: "+chunkIndex+"/"+self._chunkIndex))
                self.destroy()
            } else {
                // The mongodb-native BSON Binary buffer may be larger than the actual data size
                chunk = chunk.data.buffer.slice(0, chunk.data.position)
                if (self.paused) {
                    self._pauseData = chunk
                } else {
                    self.emit('data', chunk)
                    self._nextChunk()
                }
            }
        })
    } else {
        this.readable = false
        self.emit('end')
    }
}
MongolianGridFileReadStream.prototype.destroy = function() {
    this.readable = false
}
MongolianGridFileReadStream.prototype.pause = function() {
    if (!this.paused) {
        this.paused = true
        this.emit('pause')
    }
}
MongolianGridFileReadStream.prototype.resume = function() {
    if (this.paused) {
        this.paused = false
        this.emit('resume')
        if (this._pauseData) {
            this.emit('data', this._pauseData)
            delete this._pauseData
            this._nextChunk()
        }
    }
}