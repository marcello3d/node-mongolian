/* Mongolian DeadBeef by Marcello Bastea-Forte - zlib license */

var util = require('util')

/**
 * Used to represent asynchronous MongoDB errors
 * Note: this is NOT used for synchronous/"programmer" errors
 */
function MongolianError() {
    Error.apply(this, [].slice.call(arguments))
}
MongolianError.prototype = new Error

exports.MongolianError = MongolianError

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
    return function(err) {
        if (err) {
            callback && callback(err)
        } else {
            try {
                body.apply(this, Array.prototype.slice.call(arguments,1))
            } catch (ex) {
                if (ex instanceof MongolianError) {
                    callback && callback(ex)
                } else {
                    throw ex
                }
            }
        }
    }
}
