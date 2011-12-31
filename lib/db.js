/* Mongolian DeadBeef by Marcello Bastea-Forte - zlib license */
var crypto = require('crypto')
var util = require('util')

var safetyNet = require('./util').safetyNet
var MongolianCollection = require('./collection')
var MongolianGridFS = require('./gridfs')

var MongolianDB = module.exports = function(server, name) {
    this.server = server
    this.name = name
    this._collections = {}
    this._gridfss = {}
}

/**
 * Get a collection
 */
MongolianDB.prototype.collection = function(name) {
    return this._collections[name] ||
          (this._collections[name] = new MongolianCollection(this, name))
}

/**
 * Get a gridfs
 */
MongolianDB.prototype.gridfs = function(name) {
    name = name || "fs"
    return this._gridfss[name] ||
          (this._gridfss[name] = new MongolianGridFS(this, name))
}

/**
 * Get list of collection names
 */
MongolianDB.prototype.collectionNames = function(callback) {
    if (typeof callback !== 'function') throw new Error("callback is not a function!")
    // Remove "dbname." from front
    var prefixLength = this.name.length+1
    this.collection("system.namespaces").find().toArray(safetyNet(callback, function(namespaces) {
        callback(
            null,
            // Extract name from namespace object
            namespaces.map(function(namespace) {
                return namespace.name.substring(prefixLength)
            // Filter out internal collections
            }).filter(function (name) {
                return !/\$/.test(name)
            })
        )
    }))
}

/**
 * Executes a command (equivalent to db.collection("$cmd").findOne(query, callback))
 */
MongolianDB.prototype.runCommand = function(query, callback) {
     if (typeof query === 'string') {
         var n = {}
         n[query] = 1
         query = n
     }
    this.collection('$cmd').findOne(query, safetyNet(callback, function(result) {
        if (!result.ok || result.err || result.$err) {
            var error = new Error("Server Error: " + (result.err || result.$err || util.inspect(result)))
            error.result = result
            callback && callback(error)
        } else {
            callback && callback(null, result)
        }
    }))
}

/**
 * Sends a command to the server with authentication queueing
 */
MongolianDB.prototype.sendCommand = function(command, callback) {
    if (!this._authorize || this._authorized || (command.query && (command.query.getnonce || command.query.authenticate))) {
        this.server.sendCommand(command,callback)
    } else if (this._authorizeError) {
        callback(this._authorizeError)
    } else {
        this._authorizeQueue.push([command,callback])
    }
}

function md5hash(string) {
    return crypto.createHash('md5').update(string).digest('hex')
}

/**
 * Adds user authentication to this database
 */
MongolianDB.prototype.addUser = function(username, password, readOnly, callback) {
    if (!callback && typeof readOnly === 'function') {
        callback = readOnly
        readOnly = false
    }
    readOnly = readOnly || false
    var users = this.collection("system.users")

    users.findOne({ user:username }, safetyNet(callback, function(user) {
        user = user || { user:username }
        user.readOnly = readOnly
        user.pwd = md5hash(username + ":mongo:" + password)
        console.log("saving user: ",user)
        users.save(user, callback)
    }))
}

/**
 * Removes a user (you'll need to be authenticated first)
 */
MongolianDB.prototype.removeUser = function(username, callback) {
    this.collection("system.users").remove({ user:username }, callback)
}

/**
 * Authenticate the database
 */
MongolianDB.prototype.auth = function(username, password, callback) {
    var self = this
    self._authorize = function(callback) {
        if (!self._authorizeQueue) self._authorizeQueue = []
        delete self._authorizeError
        self.runCommand({ getnonce:1 }, safetyNet(callback, function(nonceResult) {
            self.runCommand({
                authenticate:1,
                user:username,
                nonce:nonceResult.nonce,
                key:md5hash(nonceResult.nonce + username + md5hash(username + ":mongo:" + password))
            }, function (error) {
                var queue = self._authorizeQueue
                delete self._authorizeQueue
                if (error) {
                    self._authorizeError = error
                    self.server.log.warn("Authentication failed for `"+username+"` @ "+self+": "+error)
                } else {
                    self._authorized = true
                    self.server.log.info("Authenticated `"+username+"` @ "+self)
                }
                if (callback) callback(error)
                queue && queue.forEach(function(queued) {
                    if (error) {
                        queued[1] && queued[1](error)
                    } else {
                        self.server.sendCommand(queued[0], queued[1])
                    }
                })
            })
        }))
    }
    self._authorize(callback)
}

/**
 * !!! Removes the entire database !!!
 */
MongolianDB.prototype.dropDatabase = function(callback) {
    this.runCommand({ dropDatabase:1 }, callback)
}

MongolianDB.prototype.eval = function(execFunction, args, callback) {
    var command = { $eval:execFunction }
    if (arguments.length > 1) {
        if (typeof arguments[arguments.length-1] === 'function') {
            command.args = Array.prototype.slice.call(arguments, 1, arguments.length-1)
            callback = arguments[arguments.length-1]
        } else {
            command.args = Array.prototype.slice.call(arguments, 1)
            callback = undefined
        }
    }
    this.runCommand(command, safetyNet(callback,function(result) {
        callback(null, result.retval)
    }))
}

/**
 * Gets the last error message from the server on this connection
 *
 * Note: this will return an async style error - i.e. an error in the *first* callback function argument
 */
MongolianDB.prototype.lastError = function(replicants, timeout, callback) {
    if (!callback && typeof timeout === 'function') {
        callback = timeout
        timeout = undefined
    }
    if (!callback && typeof replicants === 'function') {
        callback = replicants
        replicants = undefined
    }
    if (typeof callback !== 'function') throw new Error("callback is not a function!")

    var command = { getlasterror:1 }
    if (replicants) command.w = replicants
    if (timeout)  command.wtimeout = timeout

    this.runCommand(command, callback)
}

MongolianDB.prototype.toString = function() {
    return this.server + "/" + this.name
}