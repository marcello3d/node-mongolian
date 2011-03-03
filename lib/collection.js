/* Mongolian DeadBeef by Marcello Bastea-Forte - zlib license */
var safetyNet = require('./util').safetyNet,
    MongolianCursor = require('./cursor')

var MongolianCollection = module.exports = function(db, name) {
    this.server = db.server
    this.db = db
    this.name = name
    this.fullName = db.name + "." + name
}

MongolianCollection.prototype.drop = function() {
    throw new Error("Unsupported operation")
}

MongolianCollection.prototype.getIndexKeys = function() {
    throw new Error("Unsupported operation")
}

MongolianCollection.prototype.ensureIndex = function() {
    throw new Error("Unsupported operation")
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
            object._id = db.pkFactory.createPk()
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
    if (!callback) {
        callback = multi
        multi = false
    }
    if (!callback) {
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
    this.server.sendCommand(deleteCommand, callback)}

MongolianCollection.prototype.toString = function() {
    return this.db + "." + this.name
}
