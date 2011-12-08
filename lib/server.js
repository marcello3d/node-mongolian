/* Mongolian DeadBeef by Marcello Bastea-Forte - zlib license */
var mongo = require('mongodb')
var Waiter = require('waiter')
var taxman = require('taxman')
var EventEmitter = require('events').EventEmitter

var safetyNet = require('./util').safetyNet
var extend = require('./util').extend
var MongolianDB = require('./db')
var bson = require('./bson')

var MongoConnection = require('mongodb/lib/mongodb/connection/connection').Connection


// [mongo://][username:password@]hostname[:port][/databasename]

var UrlMatcher = /^(?:mongo(?:db)?:\/\/)?(?:([^:]+):([^@]+)@)?(.+?)(?::([0-9]+))?(?:\/(.*))?$/

function parseUrl(url) {
    var match = UrlMatcher.exec(url)
    if (!match || !match[3]) throw new Error("Invalid connection string: " + url)
    url = {}
    if (match[1]) url.user = decodeURIComponent(match[1])
    if (match[2]) url.password = decodeURIComponent(match[2])
    url.host = match[3] || 'localhost'
    url.port = (+match[4]) || 27017
    if (match[5]) url.database = decodeURIComponent(match[5])
    return url
}

/**
 * Constructs a new MongolianServer object
 */
var Mongolian = module.exports = function(serversOrOptions) {
    var inlineDatabase

    this._replicaSet = new EventEmitter
    this._servers = []
    this._serverNames = {}
    this._dbs = {}
    this._callbacks = {}
    this._callbackCount = 0

    var self = this
    var waitingServers = 0
    var scanErrors = []

    function scanServer(server) {
        waitingServers++
        // Swap out the send command method temporarily
        self.sendCommand = function(command,callback) {
            delete self.sendCommand
            server.sendCommand(command,callback)
        }
        self.db('admin').runCommand({ ismaster:1 }, function(error, result) {
            if (error) {
                scanErrors.push(error)
            } else {
                server._type = result.ismaster ? 'primary' :
                        result.secondary ? 'secondary' :
                        result.arbiterOnly ? 'arbiter' : 'unknown'

                self.log.debug(server+": Initialized as "+server._type)
                result.primary && addServer(parseUrl(result.primary))
                result.hosts && result.hosts.map(parseUrl).forEach(addServer)

                if (result.ismaster) {
                    self._primary = server
                    self.log.info(server+": Connected to primary")
                    self._replicaSet.emit('primary',server)
                } else {
                    server.close()
                }
            }
            waitingServers--
            if (!waitingServers) {
                self.log.debug("Finished scanning... primary? " + (self._primary || 'no'))
                self._replicaSet.emit('scanned', scanErrors)
                scanErrors = []
            }
        })
    }

    this._replicaSet.on('lost',function(server) {
        if (server != self._primary) return
        self.log.warn(server+": Lost primary")
        delete self._primary
    })
    this._replicaSet.setMaxListeners(0)

    function addServer(url) {
        var key = url.host+':'+url.port
        if (!self._serverNames[key]) {
            self._serverNames[key] = true
            var server = new MongolianServer(self, url)
            self._servers.push(server)
            scanServer(server)
        }
    }

    // Browse the constructor arguments
    for (var i=0; i<arguments.length; i++) {
        var arg = arguments[i]
        if (typeof arg === 'string') {
            var url = parseUrl(arg)
            addServer(url)
            if (url.database) inlineDatabase = url
        } else if (typeof arg === 'object') {
            if (typeof arg.log !== 'undefined') {
                for (var logLevel in this.log) {
                    this.log[logLevel] = (arg.log && arg.log[logLevel]) || function() {}
                }
            }
            if (arg.host) addServer(arg)
        }
    }
    if (!this._servers.length) {
        addServer(parseUrl('localhost'))
    }
    this._getPrimary = function(callback) {
        if (self._primary) return callback(null, self._primary)
        if (!waitingServers) self._servers.forEach(scanServer)
        self._replicaSet.once('scanned', function(errors) {
            if (!self._primary) return callback(errors.length == 1 ? errors[0] : new Error("Could not connect to primary: "+errors))
            // Re-authorize previously authorized databases
            for (var name in self._dbs) {
                var db = self._dbs[name]
                if (db._authorized) {
                    db._authorized = false
                    db._authorize()
                }
            }
            callback(null, self._primary)
        })
    }

    // Urls of the format mongo://auth@server/dbname are equivalent to writing:
    //    var db = new Mongolian("mongo://server").db("dbname")
    //    db.auth(...)

    if (inlineDatabase) {
        var db = this.db(inlineDatabase.database)
        if (inlineDatabase.user) db.auth(inlineDatabase.user, inlineDatabase.password)
        return db
    }
}

/**
 * Send an arbitrary command to the Mongo server
 */
Mongolian.prototype.sendCommand = function(command, callback) {
    if (callback && typeof callback !== 'function') throw new Error("callback is not a function!")
    this._getPrimary(safetyNet(callback, function(primary) {
        primary.sendCommand(command,callback)
    }))
}

/**
 * Get a list of databases on this server
 */
Mongolian.prototype.dbNames = function(callback) {
    if (typeof callback !== 'function') throw new Error("callback is not a function!")
    this.db("admin").runCommand({ listDatabases:1 }, safetyNet(callback, function(result) {
        callback(null, result.databases.map(function(database) {
            return database.name
        }))
    }))
}

/**
 * Get a database
 */
Mongolian.prototype.db = function(name) {
    return this._dbs[name] ||
          (this._dbs[name] = new MongolianDB(this, name))
}

Mongolian.prototype.toString = function() {
    return "Mongolian["+this._servers.join(',')+"]"
}

/**
 * Closes all open connections, passing the optional error object to any pending request callbacks.
 */
Mongolian.prototype.close = function(error) {
    this._servers.forEach(function(server) { server.close(error) })
}

Mongolian.prototype.log = {
    debug: function(message){ console.log("[debug] " + message) },
    info: function(message){ console.info("[info] " + message) },
    warn: function(message){ console.warn("[warn] " + message) },
    error: function(message){ console.error("[error] " + message) }
}

extend(Mongolian, bson)

//////////////////////////////////////////////////////////////////////////////////
// Internal

var bsonSerializer = require('mongodb').BSONPure
Mongolian.prototype._fakeDb = {
    bson_serializer: bsonSerializer,
    bson_deserializer: bsonSerializer
}

/**
 * Constructs a new MongolianServer object
 */
function MongolianServer(mongolian, url) {
    var self = this
    this.mongolian = mongolian
    this.url = url
    this._callbacks = []
    this._callbackCount = 0
    this._connection = taxman(function(callback) {
        var connection = new MongoConnection(1, {
            host:url.host,
            port:url.port,
            timeout:0,
            noDelay:true,
            keepAlive:0,
            maxBsonSize:4 * 1024 * 1024 * 4 * 3
        })
        var connected = false
        connection.on('error', function(error) {
            mongolian.log.error(self+": "+require('util').inspect(error))
            if (!connected) callback(error)
            self.close(error)
        })
        connection.on('close', function() {
            mongolian.log.debug(self+": Disconnected")
            self.close()
        })
        connection.on('connect',function() {
            mongolian.log.debug(self+": Connected")
            connected = true
            callback(null, connection)
        })
        connection.on("message", function(message) {
            var reply = new mongo.MongoReply
            reply.parseHeader(message, bsonSerializer)
            if (reply.messageLength != message.length) {
                connection.emit('error', new Error("Unexpected message length"))
            } else {
                var cb = self._callbacks[reply.responseTo]
                if (cb) {
//                    mongolian.log.debug("<<<---",require('util').inspect(reply,undefined,undefined,true).slice(0,5000))
                    delete self._callbacks[reply.responseTo]
                    self._callbackCount--
                    reply.parseBody(message, bsonSerializer)
                    cb(null,reply)
                }
            }
        })
        connection.start()
    })

}

/**
 * Send an arbitrary command to the Mongo server
 */
MongolianServer.prototype.sendCommand = function(command, callback) {
    var self = this
//    var stack = new Error().stack
    self._connection(safetyNet(callback,function(connection) {
        if (callback) {
            self._callbacks[command.getRequestId()] = callback
            self._callbackCount++
        }
//        self.mongolian.log.debug("--->>>",require('util').inspect(command,undefined,undefined,true).slice(0,5000))
        connection.write(command, callback)
    }))
}

MongolianServer.prototype.toString = function() {
    return 'mongo://' + this.url.host + ':' + this.url.port
}

/**
 * Closes the current connection, passing the optional error object to any pending request callbacks.
 */
MongolianServer.prototype.close = function(error) {
    error = error || new Error("Connection closed")
    if (this._connection.value) {
        var callbacks = this._callbacks
        this._callbacks = {}
        this._callbackCount = 0
        this._connection.value.close()
        this._connection.reset()
        delete this._type
        for (var requestId in callbacks) {
            callbacks[requestId](error)
        }
        this.mongolian._replicaSet.emit('lost', this)
    }
}