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
    if (this._options.log) {
        this.log = this._options.log
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
    if (callback && !(callback instanceof Function)) throw new Error("callback is not a function!")
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
//        self.log.debug("--->>>",require('util').inspect(command).slice(0,5000))
        connection.send(command)
    }))
}

/**
 * Get a list of databases on this server
 */
MongolianServer.prototype.dbNames = function(callback) {
    if (!(callback instanceof Function)) throw new Error("callback is not a function!")
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
    error = error || new Error("Connection closed")
    if (this._connection) {
        this._connection.close()
        delete this._connection
        for (var requestId in this._callbacks) {
            this._callbacks[requestId](error)
        }
        this._callbacks = {}
        this._callbackCount = 0
    }
    if (this._connectionCallbacks) {
        this._connectionCallbacks.forEach(function(callback) {
            callback(error)
        })
        delete this._connectionCallbacks
    }
}
MongolianServer.prototype.log = {
    debug: console.log,
    info: console.info,
    warn: console.warn,
    error: console.error
}

Object.keys(bson).forEach(function(key) { exports[key] = bson[key] })

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
    if (this._connection && !this._connection.connection.writable) {
        this.log.warn("Connection is not writable! --- Unsatisfied requests: "+Object.keys(this._callbacks).length)
        delete this._connection // don't close
    }
    if (this._connection) {
        callback(null, this._connection)
    } else if (this._connectionCallbacks) {
        this._connectionCallbacks.push(callback)
    } else {
        this._connectionCallbacks = [callback]
        var connection = new mongo.Connection(this.host, this.port)

        var self = this
        connection.on('error', function(error) {
            self.log.error("Connection error on "+self, error.stack)
            self.close(error)
        })
        connection.on('close', function() {
            self.log.info("Connection closed on "+self)
            self.close()
        })
        connection.on('connect',function() {
            self.log.info("Connected to " + self)
            self._connection = connection
            // Re-authorize previously authorized databases
            for (var name in self._dbs) {
                var db = self._dbs[name]
                if (db._authorized) {
                    db._authorized = false
                    db._authorize()
                }
            }
            self._connectionCallbacks.forEach(function(callback) {
                callback(null, connection)
            })
            delete self._connectionCallbacks
        })
        connection.on("data", function(message) {
            var reply = new mongo.MongoReply(self._fakeDb, message)
//            self.log.debug("<<<---",require('util').inspect(reply,false,3).slice(0,5000))
            var requestId = reply.responseTo;
            if (self._callbacks[requestId]) {
                self._callbacks[requestId](null,reply)
                delete self._callbacks[requestId]
                self._callbackCount--
                if (self._callbackCount == 0 && self._options.keepAlive) {
                    clearTimeout(self._connectionCloseTimer)
                    self._connectionCloseTimer = setTimeout(function() {
                        self.log.debug("Automatically closing connection to "+self)
                        self.close()
                    },self._options.keepAlive)
                }
            }
        })
        connection.open()
    }
}
