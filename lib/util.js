/* Mongolian DeadBeef by Marcello Bastea-Forte - zlib license */

var util = require('util')

/**
 * Used to represent asynchronous MongoDB errors
 * Note: this is NOT used for synchronous/"programmer" errors
 * For some reason when using Error.apply in the constructor the object created was just a blank object (ie: {})
 * Manually putting in the arguments seemed to fix the problem
 * @param message the message to send
 * @param obj optional object, can be a database reply, record, etc
 */
function MongolianError(message, obj) {
    this.message = message
	if(obj)
		this.obj = obj
}
MongolianError.prototype = new Error

module.exports.MongolianError = MongolianError

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
                body.apply(this, [].slice.call(arguments,1))
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
