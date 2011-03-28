/* Mongolian DeadBeef by Marcello Bastea-Forte - zlib license */
var mongo = require('mongodb')

var safetyNet = require('./util').safetyNet,
    MongolianDB = require('./db'),
    bson = require('./bson')


/**
 * Constructs a new MongolianServer object
 */
var MongolianServer = module.exports = function(options) {
    this._options = options || {}
    if (this._options.keepAlive === undefined) {
        this._options.keepAlive = 1000
    }
    this.host = this._options.host || '127.0.0.1'
    this.port = this._options.port || 27017
    this._dbs = {}
    this._callbacks = {}
    this._callbackCount = 0
}

/**
 * Send an arbitrary command to the Mongo server
 */
MongolianServer.prototype.sendCommand = function(command, callback) {
    if (callback && !callback instanceof Function) throw new Error("callback is not a function!")
    var self = this
    self._getConnection(safetyNet(callback,function(connection) {
        if (callback) {
            self._callbacks[command.getRequestId()] = callback
            self._callbackCount++
            if (self._connectionCloseTimer) {
                clearTimeout(self._connectionCloseTimer)
                delete self._connectionCloseTimer
            }
        }
//        var db = command.db
//        delete command.db
//        console.log("--->>>",require('util').inspect(command).slice(0,5000))
//        command.db = db
        connection.send(command)
    }))
}

/**
 * Get a list of databases on this server
 */
MongolianServer.prototype.dbNames = function(callback) {
    if (!callback instanceof Function) throw new Error("callback is not a function!")
    this.db("admin").queryCommand({ listDatabases:1 }, safetyNet(callback, function(result) {
        callback(null, result.databases.map(function(database) {
            return database.name
        }))
    }))
}

/**
 * Get a database
 */
MongolianServer.prototype.db = function(name) {
    return this._dbs[name] ||
          (this._dbs[name] = new MongolianDB(this, name))
}

MongolianServer.prototype.toString = function() {
    return "mongo://" + this.host + ":" + this.port
}

/**
 * Closes the current connection, passing the optional error object to any pending request callbacks.
 */
MongolianServer.prototype.close = function(error) {
    var self = this
    if (self._connection) {
        self._connection.close()
        delete self._connection
        error = error || new Error("Connection closed")
        for (var requestId in self._callbacks) {
            self._callbacks[requestId](error)
        }
        self._callbacks = {}
        self._callbackCount = 0
    }
}

module.exports.ObjectID = bson.ObjectID
module.exports.Long = bson.Long
module.exports.Binary = bson.Binary

//////////////////////////////////////////////////////////////////////////////////
// Internal

var bsonSerializer = require('mongodb').BSONPure
MongolianServer.prototype._fakeDb = {
    bson_serializer: bsonSerializer,
    bson_deserializer: bsonSerializer
}

/**
 * Get raw connection to server
 */
MongolianServer.prototype._getConnection = function(callback) {
    var self = this;
    if (self._connection && !self._connection.connection.writable) {
        console.warn("Connection is not writable! --- Unsatisfied requests: "+Object.keys(self._callbacks).length)
        delete self._connection // don't close
    }
    if (self._connection) {
        callback(null, self._connection)
    } else if (self._connectionCallbacks) {
        self._connectionCallbacks.push(callback)
    } else {
        self._connectionCallbacks = [callback]
        var connection = new mongo.Connection(self.host, self.port)
        connection.on('error', function(error) {
            console.warn("Connection error on "+self, error.stack)
            self.close(error)
        })
        connection.on('close', function() {
//            console.log("Connection closed on "+self)
            self.close()
        })
        connection.on('connect',function(err) {
            if (err) {
                console.warn("Error connecting to " + self, error.stack)
            } else {
//                console.log("Connected to " + self)
                self._connection = connection
                self._connectionCallbacks.forEach(function(callback) { callback(null, connection) })
                delete self._connectionCallbacks
            }
        })
        connection.on("data", function(message) {
            var reply = new mongo.MongoReply(self._fakeDb, message)
//            console.log("<<<---",reply)
            var requestId = reply.responseTo;
            if (self._callbacks[requestId]) {
                self._callbacks[requestId](null,reply)
                delete self._callbacks[requestId]
                self._callbackCount--
                if (self._callbackCount == 0 && self._options.keepAlive) {
                    clearTimeout(self._connectionCloseTimer)
                    self._connectionCloseTimer = setTimeout(function() {
//                        console.log("Automatically closing connection to "+self)
                        self.close()
                    },self._options.keepAlive)
                }
            }
        })
        connection.open()
    }
}
