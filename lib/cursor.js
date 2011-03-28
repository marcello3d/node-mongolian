/* Mongolian DeadBeef by Marcello Bastea-Forte - zlib license */
var mongo = require('mongodb'),
    safetyNet = require('./util').safetyNet
    bson = mongo.BSONPure || mongo.BSONNative

var MongolianCursor = module.exports = function(collection, criteria, fields) {
    this.server = collection.db.server
    this.db = collection.db
    this.collection = collection
    this.criteria = criteria
    this.fields = fields
    this._retrieved = 0
    this._batchSize = 100
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
    if (this._currentBatch && this._currentBatch.cursorId) {
        this.server.sendCommand(new mongo.KillCursorCommand(this.server._fakeDb, [this._currentBatch.cursorId]), callback)
        delete this._currentBatch.cursorId
    }
}

/**
 * Adds a special value to this query
 */
MongolianCursor.prototype.addSpecial = function(name, value) {
    if (this._currentBatch) throw new Error("Query already executed")
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
    if (this._currentBatch) throw new Error("Query already executed")
    if (size <= 1) throw new Error("Batch size must be > 1")
    this._batchSize = size
    return this
}
/**
 * Limit the total number of documents to get back from the server
 */
MongolianCursor.prototype.limit = function(limit) {
    if (this._currentBatch) throw new Error("Query already executed")
    this._limit = limit
    return this
}
/**
 * Number of documents to skip before returning values (for paging)
 */
MongolianCursor.prototype.skip = function(skip) {
    if (this._currentBatch) throw new Error("Query already executed")
    this._skip = skip
    return this
}
/**
 * Set document mapper (convert/modify raw BSON to
 */
MongolianCursor.prototype.mapper = function(mapper) {
    if (this._currentBatch) throw new Error("Query already executed")
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
    if (!callback instanceof Function) throw new Error("callback is not a function!")
    var self = this
    if (self._currentIndex && self._currentIndex < self._currentBatch.numberReturned) throw new Error("nextBatch cannot be mixed with next")
    var filterBatch = safetyNet(callback, function(batch) {
        self._currentIndex = 0
        self._currentBatch = batch
        self._retrieved += batch.numberReturned
        if (batch.cursorId && batch.cursorId.isZero()) {
            delete batch.cursorId
        } else if (self._limit && self._retrieved >= self._limit) {
            self.close()
        }
        callback(null, batch)
    })

    if (!self._currentBatch) {
        self.server.sendCommand(self._queryCommand(), filterBatch)
    } else if (self._currentBatch.cursorId) {
        var getMoreCommand = new mongo.GetMoreCommand(
            self.server._fakeDb,
            self.collection.fullName,
            self._getRetrieveCount(),
            self._currentBatch.cursorId
        )
        self.server.sendCommand(getMoreCommand, filterBatch)
    } else {
        callback(null, null)
    }
}

/**
 * Returns the next available document, or undefined if there is none
 */
MongolianCursor.prototype.next = function(callback) {
    if (callback && !callback instanceof Function) throw new Error("callback is not a function!")
    var self = this
    // We have a retrieved batch that hasn't been exhausted
    if (self._currentBatch && self._currentIndex < self._currentBatch.numberReturned) {
        var document = self._currentBatch.documents[self._currentIndex++]
//        console.log("<<<<<<---",document)
        callback(null, self._mapper ? self._mapper(document) : document)
    // We don't have a batch or the cursor hasn't been closed yet
    } else if (!self._currentBatch || self._currentBatch.cursorId) {
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
    var handleNext = safetyNet(finalCallback,function(object) {
        if (object !== undefined) {
            callback(object)
            self.next(handleNext)
        } else {
            finalCallback && finalCallback()
        }
    })
    self.next(handleNext)
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
//            console.log("<<<<<<---",array)
            callback(null, self._mapper ? array.map(self._mapper) : array)
        }
    })
    self.nextBatch(handleNext)
}

/**
 * Returns the number of rows that match this criteria (regardless of any set skips or limits)
 */
MongolianCursor.prototype.count = function(callback) {
    if (!callback instanceof Function) throw new Error("callback is not a function!")
    var self = this
    var query = { count: self.collection.name }
    if (self.criteria) {
        query.query = self.criteria
    }
    self.db.queryCommand(query, safetyNet(callback, function(result) {
        callback(null, result.n)
    }))
}

/**
 * Returns the minimum of cursor.count() and any set limit
 */
MongolianCursor.prototype.size = function(callback) {
    if (!callback instanceof Function) throw new Error("callback is not a function!")
    var self = this
    this.count(!self._limit ? callback : safetyNet(callback, function(count) {
        callback(null, Math.min(count, self._limit))
    }))
}

//////////////////////////////////////////////////////////////////////////////////
// Internal

MongolianCursor.prototype._updateCursor = function(callback) {
    var self = this
    return safetyNet(callback, function(result) {
        var cursor = self._cursor = {
            index: 0,
            documents: result.documents,
            offset: result.startingFrom,
            available: result.numberReturned
        }
        if (self._limit && cursor.offset + cursor.available > self._limit) {
            cursor.available = self._limit - cursor.offset
            cursor.documents = cursor.documents.slice(0, cursor.available)
        }
        if (result.cursorId && !result.cursorId.isZero) {
            cursor.id = result.cursorId
        }
        callback(null, cursor)
    })
}

MongolianCursor.prototype._getRetrieveCount = function() {
    return this._limit ? Math.min(this._batchSize, this._limit - this._retrieved) : this._batchSize
}

MongolianCursor.prototype._queryCommand = function() {
    var query = this._specials || this.criteria || {}
    return new mongo.QueryCommand(
        this.server._fakeDb,
        this.collection.fullName,
        0,
        this._skip,
        this._getRetrieveCount(),
        query,
        this.fields
    )
}