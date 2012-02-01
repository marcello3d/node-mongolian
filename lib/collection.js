/* Mongolian DeadBeef by Marcello Bastea-Forte - zlib license */
var util = require('util')
var buffalo = require('buffalo')
var mongo = buffalo.mongo

var safetyNet = require('./util').safetyNet
var extend = require('./util').extend
var MongolianCursor = require('./cursor')

var MongolianCollection = module.exports = function(db, name) {
    this.server = db.server
    this.db = db
    this.name = name
    this.fullName = db.name + "." + name
    this._indexCache = {}
}

/**
 * Returns a new MongolianCursor object
 */
MongolianCollection.prototype.find = function(criteria, fields) {
    return new MongolianCursor(this, criteria, fields)
}

/**
 * Shorthand for collection.find(criteria).count(callback)
 * function(callback): count all documents
 * function(criteria, callback): count documents matching criteria
 */
MongolianCollection.prototype.count = function(criteria, callback) {
    if (!callback) {
        callback = criteria
        criteria = undefined
    }
    this.find(criteria).count(callback)
}

/**
 * Shorthand for collection.find(criteria,fields).limit(1).next(callback)
 * 
 * function(callback)
 * function(criteria, callback)
 * function(criteria, fields, callback)
 */
MongolianCollection.prototype.findOne = function(criteria, fields, callback) {
    if (!callback && typeof fields === 'function') {
        callback = fields
        fields = undefined
    }
    if (!callback && typeof criteria === 'function') {
        callback = criteria
        criteria = undefined
    }
    this.find(criteria, fields).limit(1).next(callback)
}

/**
 * Insert an object or array of objects
 */
MongolianCollection.prototype.insert = function(object, callback) {
    if (!object) throw new Error("No object to insert!")
    if (callback && typeof callback !== 'function') throw new Error("callback is not a function!")
    var objects = Array.isArray(object) ? object : [object]

    // Assign ids
    objects.forEach(function(object) {
        if (!object._id) object._id = new buffalo.ObjectId
    })
    this.db.sendCommand(mongo.serializeInsert(this.fullName, objects, false))
    if (callback) {
        this.db.lastError(safetyNet(callback, function() {
            callback(null, object)
        }))
    }
}

/**
 * Update an existing object
 * function(criteria, objNew, callback)
 * function(criteria, objNew, upsert, callback)
 * function(criteria, objNew, upsert, multi, callback)
 */
MongolianCollection.prototype.update = function(criteria, objNew, upsert, multi, callback) {
    if (!callback && typeof multi === 'function') {
        callback = multi
        multi = false
    }
    if (!callback && typeof upsert === 'function') {
        callback = upsert
        upsert = false
    }
    if (callback && typeof callback !== 'function') throw new Error("callback is not a function!")

    this.db.sendCommand(mongo.serializeUpdate(this.fullName, criteria, objNew, upsert, multi))
    if (callback) {
        this.db.lastError(safetyNet(callback, function(result) {
            callback(null, result.n)
        }))
    }
}

/**
 * Shorthand update(criteria, objNew, true, false, callback)
 */
MongolianCollection.prototype.upsert = function(criteria, objNew, callback) {
    this.update(criteria, objNew, true, false, callback)
}

/**
 * Shorthand update(criteria, objNew, false, true, callback)
 */
MongolianCollection.prototype.updateAll = function(criteria, objNew, callback) {
    this.update(criteria, objNew, false, true, callback)
}

/**
 * Shorthand for update if object has an _id, otherwise insert
 */
MongolianCollection.prototype.save = function(object, callback) {
    if (object._id) {
        this.upsert({_id:object._id}, object, safetyNet(callback, function(rowsUpdated) {
            if (callback) {
                if (!rowsUpdated) return callback(new Error("No rows updated!"))
                callback(null, object)
            }
        }))
    } else {
        this.insert(object, callback)
    }
}
/**
 * Removes documents from this collection using the given criteria
 * function(callback)
 * function(criteria, callback)
 */
MongolianCollection.prototype.remove = function(criteria, callback) {
    if (!callback && typeof criteria === 'function') {
        callback = criteria
        criteria = {}
    }
    if (callback && typeof callback !== 'function') throw new Error("callback is not a function!")
    this.db.sendCommand(mongo.serializeDelete(this.fullName, criteria))
    if (callback) {
        this.db.lastError(safetyNet(callback, function(result) {
            callback(null, result.n)
        }))
    }
}

/**
 * Creates a new index on this collection (can be slow)
 */
MongolianCollection.prototype.createIndex = function(keys, options, callback) {
    if (!callback && typeof options === 'function') {
        callback = options
        options = undefined
    }
    if (callback && typeof callback !== 'function') throw new Error("callback is not a function!")
    var self = this
    var index = this._indexSpec(keys, options)
    self._indexCache[index.name] = index
    this.db.collection("system.indexes").insert(index, callback)
}

/**
 * Creates a new index on this collection (uses a local cache to avoid multiple creates)
 *
 * Possible options:
 *  name
 *  unique
 */
MongolianCollection.prototype.ensureIndex = function(keys, options, callback) {
    if (!callback && typeof options === 'function') {
        callback = options
        options = undefined
    }
    if (callback && typeof callback !== 'function') throw new Error("callback is not a function!")
    var name = this._indexSpec(keys).name
    if (this._indexCache[name]) {
        callback(null, this._indexCache[name])
        return
    }
    this.createIndex(keys, options, callback)
}

/**
 * Clears the local index cache used by ensureIndex
 */
MongolianCollection.prototype.resetIndexCache = function(){
    this._indexCache = {}
}

/**
 * Removes a given index from the database
 */
MongolianCollection.prototype.dropIndex = function(indexName, callback) {
    this.resetIndexCache()

    this.db.runCommand({
        deleteIndexes: this.name,
        index: indexName
    }, callback)
}

/**
 * Returns all indexes for this collection
 */
MongolianCollection.prototype.indexes = function(callback) {
    this.db.collection("system.indexes").find({ ns:this.fullName }).toArray(callback)
}

/**
 * !!! Removes this collection from the database !!!
 */
MongolianCollection.prototype.drop = function(callback) {
    this.db.runCommand({ drop:this.name }, callback)
}

MongolianCollection.prototype.runCommand = function(commandNameOrCommand, options, callback) {
    if (!callback && typeof options === 'function') {
        callback = options
        options = undefined
    }
    var command = commandNameOrCommand
    if (typeof commandNameOrCommand === 'string') {
        command = {}
        command[commandNameOrCommand] = this.name
        extend(command, options)
    }
    this.db.runCommand(command, callback)
}

MongolianCollection.prototype.mapReduce = function(mapFunction, reduceFunction, options, callback) {
    var command = {
        mapreduce:this.name,
        map:mapFunction,
        reduce:reduceFunction
    }
    if (typeof options === 'string') {
        options = { out:options }
    }
    extend(command, options)

    var self = this
    this.db.runCommand(command, safetyNet(callback, function(result) {
        callback(null, new MapReduceResult(self.db, result))
    }))
}

function MapReduceResult(db, result) {
    if (result.results) this.results = result.results
    this.timeMillis = result.timeMillis
    this.counts = result.counts
    if (result.db) db = db.server.db(result.db)
    if (result.result) this.collection = db.collection(result.result)
}
MapReduceResult.prototype.find = function(criteria, fields) {
    if (!this.collection) throw new Error("Map reduce returned no collection")
    return this.collection.find(criteria, fields)
}
MapReduceResult.prototype.drop = function(){
    this.collection && this.collection.drop()
}

/**
 * 
 */
MongolianCollection.prototype.findAndModify = function(options, callback) {
    var command = {
        findandmodify:this.name
    }
    for (var key in options) command[key] = options[key]
    this.db.runCommand(command, safetyNet(callback, function(result) {
        callback(null, result.value)
    }))
}

MongolianCollection.prototype.distinct = function(key, query, callback) {
    if (!callback && typeof query === 'function') {
        callback = query
        query = undefined
    }
    var command = {
        distinct: this.name,
        query: query,
        key: key
    }
    this.db.runCommand(command, safetyNet(callback, function(result) {
        callback(null, result.values)
    }))
}

MongolianCollection.prototype.toString = function() {
    return this.db + "." + this.name
}

//////////////////////////////////////////////////////////////////////////////////
// Internal

MongolianCollection.prototype._indexSpec = function(keys, options) {
    var index = {
        ns: this.fullName,
        key: keys
    }
    if (options) {
        for (var x in options) {
            index[x] = options[x]
        }
    }
    if (!index.name) {
        index.name = ""
        for (var key in keys) {
            if (index.name.length) {
                index.name += "_"
            }
            index.name += key + "_" + keys[key]
        }
    }
    return index
}