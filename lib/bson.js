/* Mongolian DeadBeef by Marcello Bastea-Forte - zlib license */

var bson = require('mongodb').BSONPure
module.exports = {
    ObjectID: bson.ObjectID,
    Long: bson.Long,
    Binary: bson.Binary
}