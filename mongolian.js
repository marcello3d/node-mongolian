/* Mongolian DeadBeef by Marcello Bastea-Forte - zlib license */

var Mongolian = require('./lib/server')

/**
 *  DBRef fetching like the mongodb shell
 *  http://www.mongodb.org/display/DOCS/Database+References
 *  This prototype extends the native drivers DBRef class.
 *  it has to be here so we can use a mongolian instance.
 *  @author Jarrad Seers <jarrad@jarradseers.com>
 *  @param callback {Function} callback function
 */

Mongolian.DBRef.prototype.fetch = function(callback) {
  var mongolian = new Mongolian()
  var server = mongolian.db(this.db)
  var collection = server.collection([this.namespace])
  collection.findOne({'_id': this.oid}, function(err, data) {
    if (typeof callback === 'function') {
      callback(err, data)
    }
  })
}

module.exports = Mongolian;

