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

const EventEmitter = require('events').EventEmitter;
const net = require('net');
const tls = require('tls');
const util = require('util');
const Frame = require('./Frame');
const reallyDefined = require('./StompUtils').reallyDefined;
const StompLogging = require('./StompUtils').StompLogging;

const EOL = '\n';
const BODY_SEPARATOR = EOL + EOL;
const FRAMES_SEPARATOR_REGEXP = /\u0000[\n]*/;

//
// ## Stomp - Client API
//

class Stomp extends EventEmitter {

  constructor(args) {

    super();

    this._subscribed_to = {};
    this.log = new StompLogging(args.debug);

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


// **Begin connection**
  connect() {

    this.log.debug(`connecting to server: ${this.connectConfig.host}:${this.connectConfig.port}`);

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

  };

  setupListeners() {

    this.socket.on('connect', () => {
      this.log.debug('ON CONNECT');

      if (this.socket.connectCallbackInvoked) {
        return;
      }

      this.socket.connectCallbackInvoked = true;

      this.emit('socketConnected');

      this.log.debug('Connected to Server');

      this.sendConnectFrame();

    });

    this.socket.on('secureConnect', () => {
      this.log.debug('ON secureConnect');

      if (this.socket.connectCallbackInvoked) {
        return;
      }

      this.socket.connectCallbackInvoked = true;

      this.log.debug('Connected to Server');

      if (this.socket.authorized) {

        this.log.debug('Authorized');
        this.emit('socketConnected');
        this.sendConnectFrame();

      } else {
        this.log.debug('Usnauthorized');
      }
    });

    this.socket.on('drain', () => {
      this.log.debug('on drain');
    });

    this.socket.on('data', (chunk) => {
      this.onData(chunk);
    });

    this.socket.on('error', (error) => {
      this.log.debug('ON ERROR');
      this.log.error(error.stack + 'error name: ' + error.name);
      this.emit('error', error);
      this.disconnect();
    });

    this.socket.on('close', (error) => {
      this.log.debug('disconnected');
      if (error) {
        this.log.error('Disconnected with error: ' + error);
      }
      this.emit("disconnected", error);
    });

    this.socket.on('timeout', () => {
      this.log.debug('ON TIMEOUT');
      this.disconnect();
    });
  };

  sendConnectFrame() {

    this.log.debug('Send CONNECT Frame');

    let headers = {};

    if (reallyDefined(this.connectConfig.login) &&  reallyDefined(this.connectConfig.passcode)) {
      headers.login = this.connectConfig.login;
      headers.passcode = this.connectConfig.passcode;
    }

    if (reallyDefined(this.connectConfig["client-id"])) {
      headers["client-id"] = this.connectConfig["client-id"];
    }
    if (reallyDefined(this.connectConfig.vhost)) {
      headers.host = this.connectConfig.vhost;
    }

    if (reallyDefined(this.connectConfig.heartBeat)
      && this.connectConfig.heartBeat instanceof Array && this.connectConfig.heartBeat.length == 2) {
      headers["heart-beat"] = this.connectConfig.heartBeat.join(',');
    }

    const _frame = new Frame();

    const args = {
      command: 'CONNECT',
      headers
    };

    const frame_to_send = _frame.buildFrame(args);

    this.sendFrame(frame_to_send);
  };

// ## Stomp.isMessage(frame)
//
// **Test that `Frame` is a message**
//
// Takes a `Frame` object
//
  isMessage(this_frame) {
    return (this_frame.headers !== null && reallyDefined(this_frame.headers['message-id']));
  };

// ## Stomp.shouldRunMessageCallback
//
// **Handle any registered message callbacks**
//
// Takes a `Frame` object
//
  shouldRunMessageCallback(this_frame) {
    const subscription = this._subscribed_to[this_frame.headers.destination];
    if (this_frame.headers.destination !== null && subscription !== null) {
      if (subscription.enabled && subscription.callback !== null && typeof(subscription.callback) == 'function') {
        subscription.callback(this_frame.body, this_frame.headers);
      }
    }
  };

// ## Stomp.handleNewFrame(frame)
//
// **Handle frame based on type. Emit events when needed.**
//
// Takes a `Frame` object
//
  handleNewFrame(this_frame) {
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

        const serverHeartBeat = this.parseServerHeartBeat(this_frame.headers);

        const timeout = serverHeartBeat * this.waitHeartbeatsNumber;
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
        const isErrorFrame = true;
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
  disconnect() {
    const socket = this.socket;
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
  subscribe(headers, callback) {
    const destination = headers.destination;

    headers.session = this.session;

    this.sendCommand('SUBSCRIBE', headers);

    this._subscribed_to[destination] = { enabled: true, callback: callback };

    this.log.debug('subscribed to: ' + destination + ' with headers ' + util.inspect(headers));
  };

//
// ## Stomp.unSubscribe(headers)
//
// **Unsubscribe from destination (queue or topic)**
//
// Takes a header object
//
  unSubscribe(headers) {
    const destination = headers.destination;
    headers.session = this.session;
    this.sendCommand('UNSUBSCRIBE', headers);
    this._subscribed_to[destination].enabled = false;
    this.log.debug(`no longer subscribed to: ${destination}`);
  };

//
// ## Stomp.ack(message_id)
//
// **Acknowledge received message**
//
// Takes a string representing the message id to ack
//
  ack(message_id) {
    this.sendCommand('ACK', {'id': message_id});
    this.log.debug(`acknowledged message: ${message_id}`);
  };

//
// ## Stomp.begin()
//
// **Begin transaction**
//
// Return a string representing the generated transaction id
//
  begin() {
    const transaction_id = Math.floor(Math.random() * 99999999999).toString();
    this.sendCommand('BEGIN', {'transaction': transaction_id});
    this.log.debug(`begin transaction: ${transaction_id}`);
    return transaction_id;
  };

//
// ## Stomp.commit(transaction_id)
//
// **Commit transaction**
//
// Takes a string representing the transaction id generated by stomp.Stomp.begin()
//
  commit(transaction_id) {
    this.sendCommand('COMMIT', {'transaction': transaction_id});
    this.log.debug(`commit transaction: ${transaction_id}`);
  };

//
// ## Stomp.abort(transaction_id)
//
// **Abort transaction**
//
// Takes a string representing the transaction id generated by stomp.Stomp.begin()
//
  abort(transaction_id) {
    this.sendCommand('ABORT', {'transaction': transaction_id});
    this.log.debug(`abort transaction: ${transaction_id}`);
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
  send(headers, want_receipt) {
    const destination = headers.destination;
    const body = headers.body || null;

    delete headers.body;
    headers.session = this.session;
    return this.sendCommand('SEND', headers, body, want_receipt)
  };

  setSocketTimeout(timeout) {
    this.socket.setTimeout(timeout);
  };

  parseServerHeartBeat(headers) {

    if (headers['heart-beat']) {
      const heartBeats = headers['heart-beat'].split(',');
      return parseInt(heartBeats[0]);
    } else {
      return false;
    }
  };

  isHeartBeat(chunk) {
    return chunk == EOL;
  };

  onData(chunk) {
    this.log.debug('ON DATA');

    chunk = chunk.toString();
    this.log.debug('chunk:');
    this.log.debug(util.inspect(chunk));

    if (this.isHeartBeat(chunk)) {
      this.log.debug('heart-beat');
      return;
    }

    let frames = this.parseStompFrames(chunk);

    if (!frames) {
      this.log.debug('no frames parsed');
      return;
    }

    let _frame;

    while (_frame = frames.shift()) {
      let parsed_frame = this.parseFrame(_frame);
      this.handleNewFrame(parsed_frame);
    }
  };

  parseStompFrames(chunk) {

    this.buffer += chunk;

    if (this.hasCompleteFrames(this.buffer)) {

      let frames = this.buffer.split(FRAMES_SEPARATOR_REGEXP);

      this.log.debug('frames:');
      this.log.debug(util.inspect(frames));

      this.buffer = frames.pop();

      return frames;
    }

  }

  sendCommand(command, headers, body, want_receipt) {
    want_receipt = want_receipt || false;

    if (!reallyDefined(headers)) {
      headers = {};
    }

    const args = {
      command,
      headers,
      body
    };

    const _frame = new Frame();

    _frame.buildFrame(args, want_receipt);


    const result = this.sendFrame(_frame);

    return _frame;
  }


  sendFrame(_frame) {

    const socket = this.socket;
    const frameStr = _frame.asString();

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

  hasCompleteFrames(str) {
    return FRAMES_SEPARATOR_REGEXP.test(str);
  }


  parseCommand(data) {
    const this_string = data.toString('utf8', 0, data.length);
    const command = this_string.split(EOL);
    return command[0];
  }

  parseHeaders(raw_headers) {

    let headers = {};

    raw_headers.split(EOL).forEach(headerStr => {

      const header = headerStr.split(':');

      if (header.length > 1) {
        const header_key = header.shift().trim();
        headers[header_key] = header.join(':').trim();
      }
    });

    return headers;
  }

  parseFrame(chunk) {

    if (!reallyDefined(chunk)) {
      return null;
    }

    const command = this.parseCommand(chunk);
    let data = chunk.slice(command.length + 1, chunk.length);
    data = data.toString('utf8', 0, data.length);

    const the_rest = data.split(BODY_SEPARATOR);
    const headers = this.parseHeaders(the_rest[0]);
    const body = the_rest.slice(1, the_rest.length);

    if (headers.hasOwnProperty('content-length')) {
      headers.bytes_message = true;
    }

    const args = {
      command,
      headers,
      body
    };

    const this_frame = new Frame();

    return this_frame.buildFrame(args);

  }

}

module.exports = Stomp;
