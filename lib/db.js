/* Mongolian DeadBeef by Marcello Bastea-Forte - zlib license */
var crypto = require('crypto')

var safetyNet = require('./util').safetyNet,
    MongolianCollection = require('./collection'),
    MongolianGridFS = require('./gridfs')

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
    if (!(callback instanceof Function)) throw new Error("callback is not a function!")
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
MongolianDB.prototype.queryCommand = function(query, callback) {
    this.collection('$cmd').findOne(query, safetyNet(callback, function(result) {
        if (!result.ok) throw new MongolianError("Mongo Result error\n" + require('util').inspect(result))
        callback(null, result)
    }))
}


MongolianDB.prototype.addUser = function(username, password, readOnly, callback) {
    readOnly = readOnly || false;
    var users = this.collection("system.users")

    users.findOne({ user:username }, safetyNet(callback, function(user) {
        user = user || { user:username }
        user.readOnly = readOnly
        user.pwd = crypto.createHash('md5').update(username + ":mongo:" + password).digest('hex')
        users.save(user)
    }))
}

MongolianDB.prototype.removeUser = function(username, callback) {
    this.collection("system.users").remove({ user:username }, callback)
}


/**
 * Authenticate the database
 */
MongolianDB.prototype.auth = function(username, password) {
    this._auth = function(callback) {
        var self = this
        self.queryCommand({ getnonce:1 }, safetyNet(callback, function(nonce) {
            var hash_password = crypto.createHash('md5').update(username + ":mongo:" + password).digest('hex')
            var key = crypto.createHash('md5').update(nonce + username + hash_password).digest('hex')
            self.queryCommand({
                authenticate:1,
                user:username,
                nonce:nonce,
                key:key
            }, callback)
        }))
    }
}

/**
 * !!! Removes the entire database !!!
 */
MongolianDB.prototype.drop = function(callback) {
    this.queryCommand({ dropDatabase:1 }, callback)
}

/**
 * Gets the last error message from the server on this connection
 *
 * Note: this will return an async style error - i.e. an error in the *first* callback function argument
 */
MongolianDB.prototype.lastError = function(replicants, timeout, callback) {
    if (!callback && timeout instanceof Function) {
        callback = timeout
        timeout = undefined
    }
    if (!callback && replicants instanceof Function) {
        callback = replicants
        replicants = undefined
    }
    if (!(callback instanceof Function)) throw new Error("callback is not a function!")

    var command = { getLastError:1 }
    if (replicants) command.w = replicants
    if (timeout)  command.wtimeout = timeout

    this.queryCommand(command, callback)
}

MongolianDB.prototype.toString = function() {
    return this.server + "/" + this.name
}