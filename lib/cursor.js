/* Mongolian DeadBeef by Marcello Bastea-Forte - zlib license */
var safetyNet = require('./util').safetyNet
var buffalo = require('buffalo')
var mongo = buffalo.mongo

var MongolianCursor = module.exports = function(collection, criteria, fields) {
    this.server = collection.db.server
    this.db = collection.db
    this.collection = collection
    this.criteria = criteria
    this.fields = fields
    this._retrieved = 0
}
/**
 * Resets the cursor to its initial state (this will cause the query to be executed again)
 */
MongolianCursor.prototype.reset = function() {
    this.close()
    this._retrieved = 0
    delete this._currentBatch
}

/**
 * Closes the cursor
 */
MongolianCursor.prototype.close = function(callback) {
    if (this._currentBatch && this._currentBatch.cursor) {
        this.db.sendCommand(mongo.serializeKillCursors([this._currentBatch.cursor]), callback)
        delete this._currentBatch.cursor
    }
}

/**
 * Adds a special value to this query
 */
MongolianCursor.prototype.addSpecial = function(name, value) {
    if (this._currentBatch) throw new Error("Cannot modify cursor - query already executed")
    if (!this._specials) {
        this._specials = { $query: this.criteria || {} }
    }
    this._specials[name] = value
    return this
}

/**
 * Specify the number of documents to retrieve per network request
 */
MongolianCursor.prototype.batchSize = function(size) {
    if (this._currentBatch) throw new Error("Cannot modify cursor - query already executed")
    if (size <= 1) throw new Error("Batch size must be > 1")
    this._batchSize = size
    return this
}
/**
 * Limit the total number of documents to get back from the server
 */
MongolianCursor.prototype.limit = function(limit) {
    if (this._currentBatch) throw new Error("Cannot modify cursor - query already executed")
    this._limit = limit
    return this
}
/**
 * Number of documents to skip before returning values (for paging)
 */
MongolianCursor.prototype.skip = function(skip) {
    if (this._currentBatch) throw new Error("Cannot modify cursor - query already executed")
    this._skip = skip
    return this
}
/**
 * Set document mapper (convert/modify raw BSON objects to something else)
 */
MongolianCursor.prototype.map = function(mapper) {
    if (this._currentBatch) throw new Error("Cannot modify cursor - query already executed")
    this._mapper = mapper
    return this
}
/**
 * Specify sort using MongoDB's { "ascendingField": 1, "descendingField": -1 } format
 * Shorthand for cursor._addSpecial("orderby", sort)
 */
MongolianCursor.prototype.sort = function(sort) {
    return this.addSpecial("$orderby", sort)
}

/**
 * Shorthand for cursor._addSpecial("$snapshot", true)
 */
MongolianCursor.prototype.snapshot = function() {
    return this.addSpecial("$snapshot", true)
}

/**
 * Shorthand for cursor._addSpecial("$explain", true)
 */
MongolianCursor.prototype.explain = function() {
    return this.addSpecial("$explain", true)
}

/**
 * Returns the next raw BSON result, or null if there are no more. No mapping/transformation is performed.
 */
MongolianCursor.prototype.nextBatch = function(callback) {
    if (typeof callback !== 'function') throw new Error("callback is not a function!")
    var self = this
    if (self._currentIndex && self._currentIndex < self._currentBatch.documents.length) throw new Error("nextBatch cannot be mixed with next")
    var filterBatch = safetyNet(callback, function(batch) {
        if ((batch.flags & 2) != 0) {
            var error = new Error("Query failure: "+batch.documents[0].$err)
            error.result = batch.documents[0]
            return callback(error)
        }
        if ((batch.flags & 1) != 0) {
            return callback(new Error("Cursor not found"))
        }
//        self.server.log.debug("<<<<<<---",batch.numberReturned,batch.cursor)
        self._currentIndex = 0
        self._currentBatch = batch
        self._retrieved += batch.documents.length
        if (batch.cursor && batch.cursor.isZero()) {
            delete batch.cursor
        } else if (self._limit && self._retrieved >= self._limit) {
            self.close()
        }
        callback(null, batch)
    })


    var retrieveCount = self._batchSize ?
                Math.min(self._batchSize, self._limit - self._retrieved) :
                self._limit

    if (!self._currentBatch) {
        var query = self._specials || self.criteria || {}
        var queryCommand = mongo.serializeQuery(
            self.collection.fullName,
            0,
            self._skip,
            retrieveCount,
            query,
            self.fields
        )
        queryCommand.query = query
        self.db.sendCommand(queryCommand, filterBatch)
    } else if (self._currentBatch.cursor) {
        var getMoreCommand = mongo.serializeGetMore(
            self.collection.fullName,
            retrieveCount,
            self._currentBatch.cursor
        )
        self.db.sendCommand(getMoreCommand, filterBatch)
    } else {
        callback(null, null)
    }
}

/**
 * Returns the next available document, or undefined if there is none
 */
MongolianCursor.prototype.next = function(callback) {
    if (typeof callback !== 'function') throw new Error("callback is not a function!")
    var self = this
    // We have a retrieved batch that hasn't been exhausted
    if (self._currentBatch && self._currentIndex < self._currentBatch.documents.length) {
        var document = self._currentBatch.documents[self._currentIndex++]
//        self.server.log.debug("<<<<<<---",document)
        callback(null, self._mapper ? self._mapper(document) : document)
    // We don't have a batch or the cursor hasn't been closed yet
    } else if (!self._currentBatch || self._currentBatch.cursor) {
        self.nextBatch(safetyNet(callback,function() {
            self.next(callback)
        }))
    // We have nothing left
    } else {
        callback(null)
    }
}

/**
 * Calls callback(doc) on every document in this cursor. On completion or error, finalCallback([err]) is called.
 */
MongolianCursor.prototype.forEach = function(callback, finalCallback) {
    if (this._retrieved) throw new Error("forEach must be called on an unused cursor or reset cursor")
    var self = this
    var handleNext = safetyNet(finalCallback,function(batch) {
        if (batch) {
            var documents = batch.documents
            var length = documents.length
            for (var i = 0; i < length; i++) {
                callback(self._mapper ? self._mapper(documents[i]) : documents[i])
            }
            self.nextBatch(handleNext)
        } else {
            finalCallback && finalCallback()
        }
    })
    self.nextBatch(handleNext)
}
/**
 * Combines all the documents from this cursor into a single array
 */
MongolianCursor.prototype.toArray = function(callback) {
    if (this._retrieved) throw new Error("toArray must be called on an unused cursor or reset cursor")
    var self = this
    var array = []
    var handleNext = safetyNet(callback,function(batch) {
        if (batch) {
            array.push.apply(array, batch.documents)
            self.nextBatch(handleNext)
        } else {
//            self.server.log.debug("<<<<<<---",array)
            callback(null, self._mapper ? array.map(self._mapper) : array)
        }
    })
    self.nextBatch(handleNext)
}

/**
 * Returns the number of rows that match this criteria, ignoring skip and limits
 */
MongolianCursor.prototype.count = function(callback) {
    _count(this, false, callback)
}

/**
 * Returns the minimum of cursor.count(), honoring skip and limit
 */
MongolianCursor.prototype.size = function(callback) {
    _count(this, true, callback)
}

//////////////////////////////////////////////////////////////////////////////////
// Internal

function _count(self, usingSkipAndLimit, callback) {
    if (typeof callback !== 'function') throw new Error("callback is not a function!")
    var query = { count: self.collection.name }
    if (self.criteria) {
        query.query = self.criteria
    }
    if (usingSkipAndLimit) {
        query.skip = self._skip
        query.limit = self._limit
    }
    self.db.runCommand(query, safetyNet(callback, function(result) {
        callback(null, result.n)
    }))
}
