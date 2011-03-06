/* Mongolian DeadBeef by Marcello Bastea-Forte - zlib license */
var safetyNet = require('./util').safetyNet,
    mongo = require('mongodb'),
    MongolianCursor = require('./cursor')

var MongolianCollection = module.exports = function(db, name) {
    this.server = db.server
    this.db = db
    this.name = name
    this.fullName = db.name + "." + name
}

/**
 * Returns a new MonglianCursor object
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
    if (!callback) {
        callback = fields
        fields = undefined
    }
    if (!callback) {
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
    var isArray = Array.isArray(objects)
    var objects = isArray ? object : [object]

    // Assign ids
    objects.forEach(function(object) {
        if (!object._id) {
            object._id = mongo.ObjectID.createPk()
        }
    })
    var insertCommand = new mongo.InsertCommand(this.fullName)
    insertCommand.documents = objects
    this.server.sendCommand(insertCommand,safetyNet(callback, function (result) {
        callback(err, isArray ? objects : object)
    }))
}

/**
 * Update an existing object
 * function(criteria, objNew, callback)
 * function(criteria, objNew, upsert, callback)
 * function(criteria, objNew, upsert, multi, callback)
 */
MongolianCollection.prototype.update = function(criteria, objNew, upsert, multi, callback) {
    if (!callback && multi instanceof Function) {
        callback = multi
        multi = false
    }
    if (!callback && upsert instanceof Function) {
        callback = upsert
        upsert = false
    }
    var updateCommand = new mongo.UpdateCommand(this.fullName, criteria, objNew, { upsert:upsert, multi:multi })
    this.server.sendCommand(updateCommand, callback)
}

/**
 * Convenience method that calls update if object has an _id, otherwise calls insert
 */
MongolianCollection.prototype.save = function(object, callback) {
    if (object._id) {
        this.update({_id:object._id}, object, true, false, callback)
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
    if (!callback) {
        callback = criteria
        criteria = {}
    }
    var deleteCommand = new mongo.DeleteCommand(this.fullName, criteria)
    this.server.sendCommand(deleteCommand, callback)
}

/**
 * Creates a new index on this collection (can be slow)
 */
MongolianCollection.prototype.createIndex = function(keys, options, callback) {
    if (!callback && options instanceof Function) {
        callback = options
        options = undefined
    }
    var self = this
    this.db.collection("system.indexes").insert(this._indexSpec(keys, options), safetyNet(callback, function() {
        self._indexCache[name] = true
        callback()
    }))
}

/**
 * Creates a new index on this collection (uses a local cache to avoid multiple creates)
 *
 * Possible options:
 *  name
 *  unique
 */
MongolianCollection.prototype.ensureIndex = function(keys, options, callback) {
    var name = this._indexSpec(keys).name
    this._indexCache = {}
    if (this._indexCache[name]) {
        callback(null)
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

    this.db.queryCommand({
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