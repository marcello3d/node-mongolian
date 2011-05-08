/* Mongolian DeadBeef by Marcello Bastea-Forte - zlib license */

var bson = require('mongodb').BSONPure
module.exports = {
    Long:bson.Long,
    ObjectId:bson.ObjectID,
    Timestamp:bson.Timestamp,
    Binary:bson.Binary,
    DBRef:bson.DBRef,
    Code:bson.Code
}