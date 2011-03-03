/* Mongolian DeadBeef by Marcello Bastea-Forte - zlib license */

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
            callback(err)
        } else {
            try {
                body.apply(this, Array.prototype.slice.call(arguments,1))
            } catch (ex) {
                callback(ex)
            }
        }
    }
}
