/* Mongolian DeadBeef by Marcello Bastea-Forte - zlib license */
var buffalo = require('buffalo')

var safetyNet = require('./util').safetyNet
var MongolianGridFile = require('./gridfile')

var MongolianGridFS = module.exports = function(db, name) {
    this.server = db.server
    this.db = db
    this.name = name || "fs"
    var files = this.files = db.collection(name+".files")
    var chunks = this.chunks = db.collection(name+".chunks")
    files.count(safetyNet(null, function(count) {
        if (count < 1000) files.ensureIndex({ filename:1, uploadDate:1 })
    }))
    chunks.count(safetyNet(null, function(count) {
        if (count < 1000) chunks.ensureIndex({ files_id:1, n:1 }, { unique: true })
    }))
}

/**
 * Creates a new MongolianGridFile
 */
MongolianGridFS.prototype.create = function(descriptor) {
    if (typeof descriptor === 'string') {
        descriptor = { filename:descriptor }
    }
    return new MongolianGridFile(this, descriptor)
}

/**
 * Returns a MongolianCursor mapped to MongolianGridFile of all grid files matching the searchBy query.
 *
 * find() - all results
 * find(object) - mongodb query on the fs.files collection
 * find(string/regexp) - shorthand for find({ filename: string })
 * find(objectId) - shorthand to find({ _id:objectId })
 */
MongolianGridFS.prototype.find = function(searchBy) {
    var query
    if (typeof searchBy === 'string' || searchBy instanceof RegExp) {
        query = { filename:searchBy }
    } else if (searchBy instanceof buffalo.ObjectId) {
        query = { _id:searchBy }
    } else {
        query = searchBy
    }
    var self = this
    return self.files.find(query).map(function (document) {
        return document && new MongolianGridFile(self, document)
    })
}
/**
 * Returns the first result that matches the searchBy query (see find(searchBy))
 *
 * Shorthand for find(searchBy).limit(1).next(callback)
 */
MongolianGridFS.prototype.findOne = function(searchBy, callback) {
    this.find(searchBy).limit(1).next(callback)
}

MongolianGridFS.prototype.toString = function() {
    return this.db+"/"+this.name+"[gridfs]"
}