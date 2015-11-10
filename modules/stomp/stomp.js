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
//
// ### stomp.Stomp
//
// An instance of the `Stomp` object.  Initialized like so:
//
//     var stomp_args = {
//         port: 61613,
//         host: 'localhost',
//         debug: false,
//         login: 'guest',
//         passcode: 'guest',
//     };
//
//     var client = new stomp.Stomp(stomp_args);
//
// If debug is set to true, extra output will be printed to the console.

// ## Helpers to handle frames, and do parsing

'use strict';
var events = require('events'),
  net = require('net'),
  tls = require('tls'),
  util = require('util'),
  frame = require('./frame'),
  stomp_utils = require('./stomp-utils'),
  exceptions = require('./stomp-exceptions'),
  stompUtils = new stomp_utils.StompUtils();


function parse_command(data) {
  var command,
    this_string = data.toString('utf8', 0, data.length);
  command = this_string.split('\n');
  return command[0];
}

function parse_headers(raw_headers) {
  var headers = {},
    headers_split = raw_headers.split('\n'),
    i;

  for (i = 0; i < headers_split.length; i++) {
    var header = headers_split[i].split(':');
    if (header.length > 1) {
      var header_key = header.shift().trim();
      headers[header_key] = header.join(':').trim();
    }
  }
  return headers;
}

function parse_frame(chunk) {
  var args = {},
    data,
    command,
    headers,
    body;

  if (!stompUtils.really_defined(chunk)) {
      return null;
  }

  command = parse_command(chunk);
  data = chunk.slice(command.length + 1, chunk.length);
  data = data.toString('utf8', 0, data.length);

  var the_rest = data.split('\n\n');
  headers = parse_headers(the_rest[0]);
  body = the_rest.slice(1, the_rest.length);

  if (headers.hasOwnProperty('content-length')) {
    headers.bytes_message = true;
  }

  args = {
    command: command,
    headers: headers,
    body: body
  };

  var this_frame = new frame.Frame();
  return this_frame.build_frame(args);

}

function send_command(stomp, command, headers, body, want_receipt) {
  want_receipt = want_receipt || false;

  if (!stompUtils.really_defined(headers)) {
    headers = {};
  }

  var args = {
    'command': command,
    'headers': headers,
    'body': body
  };

  var _frame = new frame.Frame();
  var this_frame = _frame.build_frame(args, want_receipt);
  send_frame(stomp, this_frame);

  return this_frame;
}

function send_frame(stomp, _frame) {
  var socket = stomp.socket;
  var frame_str = _frame.as_string();

  try {
    if (socket.write(frame_str) === false) {
      stomp.log.debug('Write buffered');
    }
    return true;

  } catch (e) {
    stomp.log.error('Socket write error:');
    stomp.log.error(e);
    return false;
  }
}

//
// ## Stomp - Client API
//
// Takes an argument object
//
function Stomp(args) {

  events.EventEmitter.call(this);
  this._subscribed_to = {};
  this.log = new stomp_utils.StompLogging(args.debug);

  this.waitHeartbeatsNumber = 3;

  this.connectConfig = {};
  this.connectConfig.port = args.port || 61613;
  this.connectConfig.host = args.host || '127.0.0.1';
  this.connectConfig.debug = args.debug;
  this.connectConfig.login = args.login || null;
  this.connectConfig.passcode = args.passcode || null;
  this.connectConfig.session = null;
  this.connectConfig.ssl = args.ssl ? true : false;
  this.connectConfig.ssl_validate = args.ssl_validate ? true : false;
  this.connectConfig.ssl_options = args.ssl_options || {};
  this.connectConfig['client-id'] = args.client_id || null;
  this.connectConfig.heartBeat = args.heartBeat || null;

  if (typeof args.vhost !== 'undefined') {
    this.vhost = args.vhost;
  }

  this.connectConfig.timeout = args.timeout || 50000;
  this.connectConfig.keepAlive = args.keepAlive || false;
}

// ## Stomp is an EventEmitter
util.inherits(Stomp, events.EventEmitter);

// ## Stomp.connect()
//
// **Begin connection**
//
Stomp.prototype.connect = function () {

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

};

Stomp.prototype.setupListeners = function () {

  var self = this;

  this.socket.on('connect', function () {
    self.log.debug('ON CONNECT');
    self.emit('socketConnected');

    self.log.debug('Connected to Server');

    self.sendConnectFrame();

  });

  this.socket.on('secureConnect', function () {
    self.log.debug('ON secureConnect');

    if (self.socket.connectCallbackInvoked) {
      return;
    }

    self.socket.connectCallbackInvoked = true;

    if (self.socket.connectCallbackInvoked) {
      return;
    }

    self.socket.connectCallbackInvoked = true;

    if (self.socket.authorized) {

      console.log('Connected to Server');
      self.emit('socketConnected');
      self.sendConnectFrame();

    } else {
      self.log.debug('unauthorized');
    }
  });

  this.socket.on('drain', function () {
    self.log.debug('on drain');
  });

  var buffer = '';
  this.socket.on('data', function (chunk) {

    //heart-beat frame
    if (chunk.toString() == '\n') {
      chunk = '';
    }

    buffer += chunk;
    var frames = buffer.split('\0\n');

    if (frames.length == 1) {
      frames = buffer.split('\0');
    }

    if (frames.length == 1) {
      return;
    }

    buffer = frames.pop();

    var parsed_frame = null;
    var _frame;
    while (_frame = frames.shift()) {
      parsed_frame = parse_frame(_frame);
      self.handle_new_frame(parsed_frame);
    }
  });

  this.socket.on('error', function (error) {
    self.log.debug('ON ERROR');
    self.log.error(error.stack + 'error name: ' + error.name);
    self.emit('error', error);
    self.disconnect();
  });

  this.socket.on('close', function (error) {
    self.log.debug('disconnected');
    if (error) {
      self.log.error('Disconnected with error: ' + error);
    }
    self.emit("disconnected", error);
  });

  this.socket.on('timeout', function () {
    self.log.debug('ON TIMEOUT');
    self.disconnect();
  });
};

Stomp.prototype.sendConnectFrame = function () {

  this.log.debug('Send CONNECT Frame');

  var headers = {};

  if (stompUtils.really_defined(this.connectConfig.login) &&  stompUtils.really_defined(this.connectConfig.passcode)) {
    headers.login = this.connectConfig.login;
    headers.passcode = this.connectConfig.passcode;
  }

  if (stompUtils.really_defined(this.connectConfig["client-id"])) {
    headers["client-id"] = this.connectConfig["client-id"];
  }
  if (stompUtils.really_defined(this.connectConfig.vhost)) {
    headers.host = this.connectConfig.vhost;
  }

  if (stompUtils.really_defined(this.connectConfig.heartBeat)
    && this.connectConfig.heartBeat instanceof Array && this.connectConfig.heartBeat.length == 2) {
    headers["heart-beat"] = this.connectConfig.heartBeat.join(',');
  }

  var _frame = new frame.Frame();
  var args = {};

  args.command = 'CONNECT';
  args.headers = headers;

  var frame_to_send = _frame.build_frame(args);

  send_frame(this, frame_to_send);
};

// ## Stomp.is_a_message(frame)
//
// **Test that `Frame` is a message**
//
// Takes a `Frame` object
//
Stomp.prototype.is_a_message = function (this_frame) {
  return (this_frame.headers !== null && stompUtils.really_defined(this_frame.headers['message-id']));
};

// ## Stomp.should_run_message_callback
//
// **Handle any registered message callbacks**
//
// Takes a `Frame` object
//
Stomp.prototype.should_run_message_callback = function (this_frame) {
  var subscription = this._subscribed_to[this_frame.headers.destination];
  if (this_frame.headers.destination !== null && subscription !== null) {
    if (subscription.enabled && subscription.callback !== null && typeof(subscription.callback) == 'function') {
      subscription.callback(this_frame.body, this_frame.headers);
    }
  }
};

// ## Stomp.handle\_new_frame(frame)
//
// **Handle frame based on type. Emit events when needed.**
//
// Takes a `Frame` object
//
Stomp.prototype.handle_new_frame = function (this_frame) {
  //this.log.debug('handle_new_frame', this_frame);
  switch (this_frame.command) {
    case "MESSAGE":
      if (this.is_a_message(this_frame)) {
        this.should_run_message_callback(this_frame);
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
};

//
// ## Stomp.disconnect()
//
// **Disconnect from STOMP broker**
//
Stomp.prototype.disconnect = function () {
  var socket = this.socket;
  socket.end();

  if (socket.readyState == 'readOnly') {
    socket.destroy();
  }

  this.log.debug('disconnect called');
};

//
// ## Stomp.subscribe(headers, callback)
//
// **Subscribe to destination (queue or topic)**
//
// Takes a header object
//
// Takes a callback function
//
Stomp.prototype.subscribe = function (headers, callback) {
    var destination = headers.destination;
    headers.session = this.session;
    send_command(this, 'SUBSCRIBE', headers);

    /**
    / Maybe we could subscribe to mulitple queues?
    / if (destination instanceof Array) {
    /   for (var = i; i < 0; i++) {
    /     this._subscribed_to[destination[i]] = { enabled: true, callback: callback };
    /   }
    / }
    / else {
    /     this._subscribed_to[destination] = { enabled: true, callback: callback };
    / }
    /
    */

    this._subscribed_to[destination] = { enabled: true, callback: callback };
    this.log.debug('subscribed to: ' + destination + ' with headers ' + util.inspect(headers));
};

//
// ## Stomp.unsubscribe(headers)
//
// **Unsubscribe from destination (queue or topic)**
//
// Takes a header object
//
Stomp.prototype.unsubscribe = function (headers) {
    var destination = headers.destination;
    headers.session = this.session;
    send_command(this, 'UNSUBSCRIBE', headers);
    this._subscribed_to[destination].enabled = false;
    this.log.debug('no longer subscribed to: ' + destination);
};

//
// ## Stomp.ack(message_id)
//
// **Acknowledge received message**
//
// Takes a string representing the message id to ack
//
Stomp.prototype.ack = function (message_id) {
    send_command(this, 'ACK', {'id': message_id});
    this.log.debug('acknowledged message: ' + message_id);
};

//
// ## Stomp.begin()
//
// **Begin transaction**
//
// Return a string representing the generated transaction id
//
Stomp.prototype.begin = function () {
    var transaction_id = Math.floor(Math.random() * 99999999999).toString();
    send_command(this, 'BEGIN', {'transaction': transaction_id});
    this.log.debug('begin transaction: ' + transaction_id);
    return transaction_id;
};

//
// ## Stomp.commit(transaction_id)
//
// **Commit transaction**
//
// Takes a string representing the transaction id generated by stomp.Stomp.begin()
//
Stomp.prototype.commit = function (transaction_id) {
    send_command(this, 'COMMIT', {'transaction': transaction_id});
    this.log.debug('commit transaction: ' + transaction_id);
};

//
// ## Stomp.abort(transaction_id)
//
// **Abort transaction**
//
// Takes a string representing the transaction id generated by stomp.Stomp.begin()
//
Stomp.prototype.abort = function (transaction_id) {
    send_command(this, 'ABORT', {'transaction': transaction_id});
    this.log.debug('abort transaction: ' + transaction_id);
};

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
Stomp.prototype.send = function (headers, want_receipt) {
    var destination = headers.destination,
    body = headers.body || null;
    delete headers.body;
    headers.session = this.session;
    return send_command(this, 'SEND', headers, body, want_receipt)
};

Stomp.prototype.setSocketTimeout = function (timeout) {
  this.socket.setTimeout(timeout);
};

Stomp.prototype.parseServerHeartBeat = function (headers) {

  if (headers['heart-beat']) {
    var heartBeats = headers['heart-beat'].split(',');
    return parseInt(heartBeats[0]);
  } else {
    return false;
  }
};

module.exports.Stomp = Stomp;
