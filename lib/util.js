/* Mongolian DeadBeef by Marcello Bastea-Forte - zlib license */
var util = require('util')

//////////////////////////////////////////////////////////////////////////////////
// Internal

/**
 * Convenience method for handling async value callbacks
 *
 * @param callback the target async callback
 * @param body the body to call
 * @returns an async function(err,value)
 */
exports.safetyNet = function(callback,body) {
    return function(error, result) {
        if (error) {
            callback && callback(error)
        } else {
            body(result)
        }
    }
}

exports.extend = function(destination, source) {
    if (source) for (var key in source) destination[key] = source[key]
    return destination
}

exports.callback = function(argumentsObject, required, offset) {
    var callback = argumentsObject[argumentsObject.length - (offset || 1)]
    if (typeof callback === 'function') return callback
    if (required) throw new Error(required + ' callback is required')
    return undefined
}