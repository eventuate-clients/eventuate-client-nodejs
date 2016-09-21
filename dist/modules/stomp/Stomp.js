/*
* The original module https://github.com/benjaminws/stomp-js
Copyright (c) 2010, Benjamin W. Smith
All rights reserved.

Redistribution and use in source and binary forms, with or without modification, are permitted provided that the following conditions are met:

* Redistributions of source code must retain the above copyright notice, this list of conditions and the following disclaimer.
* Redistributions in binary form must reproduce the above copyright notice, this list of conditions and the following disclaimer in the documentation and/or 
  other materials provided with the distribution.
* Neither the name of the author nor the names of its contributors may be used to endorse or promote products derived from this software
  without specific prior written permission.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT 
LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE 
COPYRIGHT OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
(INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION)
HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE)
ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
* */

// ## stomp
//
// The `Stomp` module provides you with a client interface for interacting with STOMP messaging brokers


'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var EventEmitter = require('events').EventEmitter;
var net = require('net');
var tls = require('tls');
var util = require('util');
var Frame = require('./Frame');
var reallyDefined = require('./StompUtils').reallyDefined;
var StompLogging = require('./StompUtils').StompLogging;

var EOL = '\n';
var BODY_SEPARATOR = EOL + EOL;
var FRAMES_SEPARATOR_REGEXP = /\u0000[\n]*/;

//
// ## Stomp - Client API
//

var Stomp = function (_EventEmitter) {
  _inherits(Stomp, _EventEmitter);

  function Stomp(args) {
    _classCallCheck(this, Stomp);

    var _this = _possibleConstructorReturn(this, Object.getPrototypeOf(Stomp).call(this));

    _this._subscribed_to = {};
    _this.log = new StompLogging(args.debug);

    _this.waitHeartbeatsNumber = 3;

    _this.connectConfig = {};
    _this.connectConfig.port = args.port || 61613;
    _this.connectConfig.host = args.host || '127.0.0.1';
    _this.connectConfig.debug = args.debug;
    _this.connectConfig.login = args.login || null;
    _this.connectConfig.passcode = args.passcode || null;
    _this.connectConfig.session = null;
    _this.connectConfig.ssl = args.ssl ? true : false;
    _this.connectConfig.ssl_validate = args.ssl_validate ? true : false;
    _this.connectConfig.ssl_options = args.ssl_options || {};
    _this.connectConfig['client-id'] = args.client_id || null;
    _this.connectConfig.heartBeat = args.heartBeat || null;

    if (typeof args.vhost !== 'undefined') {
      _this.vhost = args.vhost;
    }

    _this.connectConfig.timeout = args.timeout || 50000;
    _this.connectConfig.keepAlive = args.keepAlive || false;
    return _this;
  }

  // **Begin connection**


  _createClass(Stomp, [{
    key: 'connect',
    value: function connect() {

      this.log.debug('connecting to server: ' + this.connectConfig.host + ':' + this.connectConfig.port);

      if (this.connectConfig.ssl) {
        this.log.debug('Using SSL');
        this.socket = tls.connect(this.connectConfig.port, this.connectConfig.host, {});
      } else {
        this.socket = new net.Socket();
        this.socket.connect(this.connectConfig.port, this.connectConfig.host);
      }

      this.setSocketTimeout(this.connectConfig.timeout);
      this.setupListeners();
      this.buffer = '';
    }
  }, {
    key: 'setupListeners',
    value: function setupListeners() {
      var _this2 = this;

      this.socket.on('connect', function () {
        _this2.log.debug('ON CONNECT');

        if (_this2.socket.connectCallbackInvoked) {
          return;
        }

        _this2.socket.connectCallbackInvoked = true;

        _this2.emit('socketConnected');

        _this2.log.debug('Connected to Server');

        _this2.sendConnectFrame();
      });

      this.socket.on('secureConnect', function () {
        _this2.log.debug('ON secureConnect');

        if (_this2.socket.connectCallbackInvoked) {
          return;
        }

        _this2.socket.connectCallbackInvoked = true;

        _this2.log.debug('Connected to Server');

        if (_this2.socket.authorized) {

          _this2.log.debug('Authorized');
          _this2.emit('socketConnected');
          _this2.sendConnectFrame();
        } else {
          _this2.log.debug('Usnauthorized');
        }
      });

      this.socket.on('drain', function () {
        _this2.log.debug('on drain');
      });

      this.socket.on('data', function (chunk) {
        _this2.onData(chunk);
      });

      this.socket.on('error', function (error) {
        _this2.log.debug('ON ERROR');
        _this2.log.error(error.stack + 'error name: ' + error.name);
        _this2.emit('error', error);
        _this2.disconnect();
      });

      this.socket.on('close', function (error) {
        _this2.log.debug('disconnected');
        if (error) {
          _this2.log.error('Disconnected with error: ' + error);
        }
        _this2.emit("disconnected", error);
      });

      this.socket.on('timeout', function () {
        _this2.log.debug('ON TIMEOUT');
        _this2.disconnect();
      });
    }
  }, {
    key: 'sendConnectFrame',
    value: function sendConnectFrame() {

      this.log.debug('Send CONNECT Frame');

      var headers = {};

      if (reallyDefined(this.connectConfig.login) && reallyDefined(this.connectConfig.passcode)) {
        headers.login = this.connectConfig.login;
        headers.passcode = this.connectConfig.passcode;
      }

      if (reallyDefined(this.connectConfig["client-id"])) {
        headers["client-id"] = this.connectConfig["client-id"];
      }
      if (reallyDefined(this.connectConfig.vhost)) {
        headers.host = this.connectConfig.vhost;
      }

      if (reallyDefined(this.connectConfig.heartBeat) && this.connectConfig.heartBeat instanceof Array && this.connectConfig.heartBeat.length == 2) {
        headers["heart-beat"] = this.connectConfig.heartBeat.join(',');
      }

      var _frame = new Frame();

      var args = {
        command: 'CONNECT',
        headers: headers
      };

      var frame_to_send = _frame.buildFrame(args);

      this.sendFrame(frame_to_send);
    }
  }, {
    key: 'isMessage',


    // ## Stomp.isMessage(frame)
    //
    // **Test that `Frame` is a message**
    //
    // Takes a `Frame` object
    //
    value: function isMessage(this_frame) {
      return this_frame.headers !== null && reallyDefined(this_frame.headers['message-id']);
    }
  }, {
    key: 'shouldRunMessageCallback',


    // ## Stomp.shouldRunMessageCallback
    //
    // **Handle any registered message callbacks**
    //
    // Takes a `Frame` object
    //
    value: function shouldRunMessageCallback(this_frame) {
      var subscription = this._subscribed_to[this_frame.headers.destination];
      if (this_frame.headers.destination !== null && subscription !== null) {
        if (subscription.enabled && subscription.callback !== null && typeof subscription.callback == 'function') {
          subscription.callback(this_frame.body, this_frame.headers);
        }
      }
    }
  }, {
    key: 'handleNewFrame',


    // ## Stomp.handleNewFrame(frame)
    //
    // **Handle frame based on type. Emit events when needed.**
    //
    // Takes a `Frame` object
    //
    value: function handleNewFrame(this_frame) {
      //this.log.debug('handleNewFrame', this_frame);
      switch (this_frame.command) {
        case "MESSAGE":
          if (this.isMessage(this_frame)) {
            /*this.log.debug('MESSAGE');
             this.log.debug(util.inspect(this_frame));*/
            this.shouldRunMessageCallback(this_frame);
            this.emit('message', this_frame);
          }
          break;
        case "CONNECTED":
          this.log.debug('Connected to STOMP');
          this.session = this_frame.headers.session;

          var serverHeartBeat = this.parseServerHeartBeat(this_frame.headers);

          var timeout = serverHeartBeat * this.waitHeartbeatsNumber;
          //parse heart beats
          if (timeout) {
            this.log.debug('Adjust socket timeout using server heart-beat:');
            this.log.debug(timeout);
            this.setSocketTimeout(timeout);
          }

          this.emit('connected');
          break;
        case "RECEIPT":
          this.emit('receipt', this_frame.headers['receipt-id']);
          break;
        case "ERROR":
          var isErrorFrame = true;
          this.emit('error', this_frame, isErrorFrame);
          break;
        default:
          this.log.debug("Could not parse command: " + this_frame.command);
      }
    }
  }, {
    key: 'disconnect',


    //
    // ## Stomp.disconnect()
    //
    // **Disconnect from STOMP broker**
    //
    value: function disconnect() {
      var socket = this.socket;
      socket.end();

      if (socket.readyState == 'readOnly') {
        socket.destroy();
      }

      this.log.debug('disconnect called');
    }
  }, {
    key: 'subscribe',


    //
    // ## Stomp.subscribe(headers, callback)
    //
    // **Subscribe to destination (queue or topic)**
    //
    // Takes a header object
    //
    // Takes a callback function
    //
    value: function subscribe(headers, callback) {
      var destination = headers.destination;

      headers.session = this.session;

      this.sendCommand('SUBSCRIBE', headers);

      this._subscribed_to[destination] = { enabled: true, callback: callback };

      this.log.debug('subscribed to: ' + destination + ' with headers ' + util.inspect(headers));
    }
  }, {
    key: 'unSubscribe',


    //
    // ## Stomp.unSubscribe(headers)
    //
    // **Unsubscribe from destination (queue or topic)**
    //
    // Takes a header object
    //
    value: function unSubscribe(headers) {
      var destination = headers.destination;
      headers.session = this.session;
      this.sendCommand('UNSUBSCRIBE', headers);
      this._subscribed_to[destination].enabled = false;
      this.log.debug('no longer subscribed to: ' + destination);
    }
  }, {
    key: 'ack',


    //
    // ## Stomp.ack(message_id)
    //
    // **Acknowledge received message**
    //
    // Takes a string representing the message id to ack
    //
    value: function ack(message_id) {
      this.sendCommand('ACK', { 'id': message_id });
      this.log.debug('acknowledged message: ' + message_id);
    }
  }, {
    key: 'begin',


    //
    // ## Stomp.begin()
    //
    // **Begin transaction**
    //
    // Return a string representing the generated transaction id
    //
    value: function begin() {
      var transaction_id = Math.floor(Math.random() * 99999999999).toString();
      this.sendCommand('BEGIN', { 'transaction': transaction_id });
      this.log.debug('begin transaction: ' + transaction_id);
      return transaction_id;
    }
  }, {
    key: 'commit',


    //
    // ## Stomp.commit(transaction_id)
    //
    // **Commit transaction**
    //
    // Takes a string representing the transaction id generated by stomp.Stomp.begin()
    //
    value: function commit(transaction_id) {
      this.sendCommand('COMMIT', { 'transaction': transaction_id });
      this.log.debug('commit transaction: ' + transaction_id);
    }
  }, {
    key: 'abort',


    //
    // ## Stomp.abort(transaction_id)
    //
    // **Abort transaction**
    //
    // Takes a string representing the transaction id generated by stomp.Stomp.begin()
    //
    value: function abort(transaction_id) {
      this.sendCommand('ABORT', { 'transaction': transaction_id });
      this.log.debug('abort transaction: ' + transaction_id);
    }
  }, {
    key: 'send',


    //
    // ## Stomp.send(headers, want_receipt)
    //
    // **Send MESSAGE to STOMP broker**
    //
    // Takes a header object (destination is required)
    //
    // Takes a boolean requesting receipt of the sent message
    //
    // Returns a `Frame` object representing the message sent
    //
    value: function send(headers, want_receipt) {
      var destination = headers.destination;
      var body = headers.body || null;

      delete headers.body;
      headers.session = this.session;
      return this.sendCommand('SEND', headers, body, want_receipt);
    }
  }, {
    key: 'setSocketTimeout',
    value: function setSocketTimeout(timeout) {
      this.socket.setTimeout(timeout);
    }
  }, {
    key: 'parseServerHeartBeat',
    value: function parseServerHeartBeat(headers) {

      if (headers['heart-beat']) {
        var heartBeats = headers['heart-beat'].split(',');
        return parseInt(heartBeats[0]);
      } else {
        return false;
      }
    }
  }, {
    key: 'isHeartBeat',
    value: function isHeartBeat(chunk) {
      return chunk == EOL;
    }
  }, {
    key: 'onData',
    value: function onData(chunk) {
      this.log.debug('ON DATA');

      chunk = chunk.toString();
      this.log.debug('chunk:');
      this.log.debug(util.inspect(chunk));

      if (this.isHeartBeat(chunk)) {
        this.log.debug('heart-beat');
        return;
      }

      var frames = this.parseStompFrames(chunk);

      if (!frames) {
        this.log.debug('no frames parsed');
        return;
      }

      var _frame = void 0;

      while (_frame = frames.shift()) {
        var parsed_frame = this.parseFrame(_frame);
        this.handleNewFrame(parsed_frame);
      }
    }
  }, {
    key: 'parseStompFrames',
    value: function parseStompFrames(chunk) {

      this.buffer += chunk;

      if (this.hasCompleteFrames(this.buffer)) {

        var frames = this.buffer.split(FRAMES_SEPARATOR_REGEXP);

        this.log.debug('frames:');
        this.log.debug(util.inspect(frames));

        this.buffer = frames.pop();

        return frames;
      }
    }
  }, {
    key: 'sendCommand',
    value: function sendCommand(command, headers, body, want_receipt) {
      want_receipt = want_receipt || false;

      if (!reallyDefined(headers)) {
        headers = {};
      }

      var args = {
        command: command,
        headers: headers,
        body: body
      };

      var _frame = new Frame();

      _frame.buildFrame(args, want_receipt);

      var result = this.sendFrame(_frame);

      return _frame;
    }
  }, {
    key: 'sendFrame',
    value: function sendFrame(_frame) {
      var socket = this.socket;
      var frameStr = _frame.asString();

      try {
        if (socket.write(frameStr) === false) {
          this.log.debug('Write buffered');
        }
        return true;
      } catch (e) {
        this.log.error('Socket write error:');
        this.log.error(e);
        return false;
      }
    }
  }, {
    key: 'hasCompleteFrames',
    value: function hasCompleteFrames(str) {
      return FRAMES_SEPARATOR_REGEXP.test(str);
    }
  }, {
    key: 'parseCommand',
    value: function parseCommand(data) {
      var this_string = data.toString('utf8', 0, data.length);
      var command = this_string.split(EOL);
      return command[0];
    }
  }, {
    key: 'parseHeaders',
    value: function parseHeaders(raw_headers) {

      var headers = {};

      raw_headers.split(EOL).forEach(function (headerStr) {

        var header = headerStr.split(':');

        if (header.length > 1) {
          var header_key = header.shift().trim();
          headers[header_key] = header.join(':').trim();
        }
      });

      return headers;
    }
  }, {
    key: 'parseFrame',
    value: function parseFrame(chunk) {

      if (!reallyDefined(chunk)) {
        return null;
      }

      var command = this.parseCommand(chunk);
      var data = chunk.slice(command.length + 1, chunk.length);
      data = data.toString('utf8', 0, data.length);

      var the_rest = data.split(BODY_SEPARATOR);
      var headers = this.parseHeaders(the_rest[0]);
      var body = the_rest.slice(1, the_rest.length);

      if (headers.hasOwnProperty('content-length')) {
        headers.bytes_message = true;
      }

      var args = {
        command: command,
        headers: headers,
        body: body
      };

      var this_frame = new Frame();

      return this_frame.buildFrame(args);
    }
  }]);

  return Stomp;
}(EventEmitter);

module.exports = Stomp;