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
    return function(error) {
        if (error) {
            callback && callback(error)
        } else {
            body.apply(this, Array.prototype.slice.call(arguments,1))
        }
    }
}

exports.callback = function(argumentsObject, required, offset) {
    var callback = argumentsObject[argumentsObject.length - (offset || 1)]
    if (typeof callback === 'function') {
        return callback
    } else if (required) {
        throw new Error(required+' callback is required')
    }
    return undefined
}