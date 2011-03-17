/* Mongolian DeadBeef by Marcello Bastea-Forte - zlib license */
var mongo = require('mongodb')

var safetyNet = require('./util').safetyNet,
    MongolianDB = require('./db')

/**
 * Constructs a new MongolianServer object
 */
var MongolianServer = module.exports = function(host, port) {
    this.host = host || '127.0.0.1'
    this.port = port || 27017
    this._dbs = {}
    this._callbacks = {}
}

/**
 * Send an arbitrary command to the Mongo server
 */
MongolianServer.prototype.sendCommand = function(command, callback) {
    if (callback && !callback instanceof Function) throw new Error("callback is not a function!")
    var self = this
    self._getConnection(safetyNet(callback,function(connection) {
        if (callback) self._callbacks[command.getRequestId()] = callback
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


//////////////////////////////////////////////////////////////////////////////////
// Internal

var bson = require('mongodb').BSONPure
MongolianServer.prototype._fakeDb = {
    bson_serializer: bson,
    bson_deserializer: bson
}

/**
 * Get raw connection to server
 */
MongolianServer.prototype._getConnection = function(callback) {
    var self = this;
    if (self._connection) {
        callback(null, self._connection)
    } else if (self.connectionCallbacks) {
        self.connectionCallbacks.push(callback)
    } else {
        self.connectionCallbacks = [callback]
        var connection = new mongo.Connection(self.host, self.port)
        connection.on('error', function(error) {
            console.warn("Connection error on "+self, error.stack)
            delete self._connection
        })
        connection.on('close', function(error) {
            console.warn("Connection closed on "+self)
            delete self._connection
        })
        connection.on('connect',function(err) {
            if (err) {
                console.warn("Error connecting to " + self, error.stack)
            } else {
                self._connection = connection
                self.connectionCallbacks.forEach(function(callback) { callback(null, connection) })
                delete self.connectionCallbacks
            }
        })
        connection.on("data", function(message) {
            var reply = new mongo.MongoReply(self._fakeDb, message)
//            console.log("<<<---",reply)
            var requestId = reply.responseTo;
            if (self._callbacks[requestId]) {
                self._callbacks[requestId](null,reply)
                delete self._callbacks[requestId]
            }
        })
        connection.open()
    }
}

module.exports.bson = bson
