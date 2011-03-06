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
    var self = this
    self._getConnection(safetyNet(callback,function(connection) {
        self._callbacks[command.getRequestId()] = callback
        connection.send(command)
    }))
}

/**
 * Get a list of databases on this server
 */
MongolianServer.prototype.dbNames = function(callback) {
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
        console.log("Connecting to " + self)
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
                console.log("Connected to " + self)
                self._connection = connection
                self.connectionCallbacks.forEach(function(callback) { callback(null, connection) })
                delete self.connectionCallbacks
            }
        })
        connection.on("data", function(message) {
            var reply = new mongo.MongoReply(message)
            var requestId = reply.responseTo;
            if (self._callbacks[requestId]) {
                self._callbacks[requestId](null,reply)
                delete self._callbacks[requestId]
            }
        })
        connection.open()
    }
}
