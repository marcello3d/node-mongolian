/* Mongolian DeadBeef by Marcello Bastea-Forte - zlib license */

var tls = require('tls')
var net = require('net')
var events = require('events')
var util = require('util')

function Connection(options) {
    var initialBufferSize = options && options.initialBufferSize || 1024*10
    var maxMessageSize = options && options.maxMessageSize || 1024*1024*32

    var thiz = this

    var socket = new net.Socket

    // Dynamicly sized buffer
    var buffer = new Buffer(initialBufferSize)
    var readIndex = 0
    var writeIndex = 0

    function grow(minAmount) {
        var buffer2 = new Buffer(buffer.length + Math.max(minAmount, buffer.length))
        buffer.copy(buffer2, 0, readIndex)
        writeIndex -= readIndex
        readIndex = 0
        buffer = buffer2
    }

    function append(data) {
        var bytesNeeded = (writeIndex + data.length) - buffer.length
        if (bytesNeeded > 0) grow(bytesNeeded)
        data.copy(buffer, writeIndex)
        writeIndex += data.length
    }
    var expectedMessageSize = 4
    var readMessageLength = false

    // Configure socket
    socket.setNoDelay(false)

    // SSL support
    var readWriteStream = socket
    if (options && options.ssl) {
        var pair = tls.createSecurePair(options.tlsCredentials)
        pair.encrypted.pipe(socket)
        socket.pipe(pair.encrypted)

        readWriteStream = pair.cleartext
    }

    // Setup write command
    this.write = function(buffer, callback) {
        readWriteStream.write(buffer, callback)
    }

    // Setup data listener
    readWriteStream.on('data', function(data) {
        append(data)
        while (writeIndex - readIndex >= expectedMessageSize) {
            if (readMessageLength) {
                thiz.emit('message', buffer.slice(readIndex, readIndex += expectedMessageSize))
                if (readIndex == writeIndex) {
                    readIndex = writeIndex = 0
                }
                expectedMessageSize = 4
                readMessageLength = false
            } else {
                expectedMessageSize = (buffer[readIndex]) |
                                      (buffer[readIndex+1] << 8) |
                                      (buffer[readIndex+2] << 16) |
                                      (buffer[readIndex+3] << 24)
                readMessageLength = true
                if (expectedMessageSize > maxMessageSize) {
                    thiz.emit('error', 'message too large: ' + expectedMessageSize + ' (max=' + maxMessageSize + ')')
                    thiz.close()
                    return
                }
            }
        }
    })
    socket.on('connect', function() { thiz.emit('connect') })
    socket.on('error', function(message) { thiz.emit('error', message) })
    socket.on('close', function() { thiz.emit('close') })
    this.connect = function(port,host) { socket.connect(port,host) }
    this.close = function() { socket.end() }
    this.destroy = function() { socket.destroy() }
}
util.inherits(Connection, events.EventEmitter)

module.exports = Connection
