'use strict';

var util = require('util');
var Rx = require('rx');
var stomp = require('./stomp/stomp');
var frame = require('./stomp/frame');
var specialChars = require('./specialChars');
var Promise = require('promise');
var _ = require('underscore');
var Agent = require('agentkeepalive');
var HttpsAgent = require('agentkeepalive').HttpsAgent;
var url = require('url');


var http = require('http');
var https = require('https');

function Client(options) {
  this.url =  process.env.EVENTUATE_URL || process.env.EVENT_STORE_URL || 'https://api.eventuate.io';
  this.stompHost = process.env.EVENTUATE_STOMP_SERVER_HOST || process.env.EVENT_STORE_STOMP_SERVER_HOST || 'api.eventuate.io';
  this.stompPort = process.env.EVENTUATE_STOMP_SERVER_PORT || process.env.EVENT_STORE_STOMP_SERVER_PORT || 61614;

  this.apiKey = options.apiKey;
  this.spaceName = options.spaceName || false;

  this.urlObj = url.parse(this.url);
  this.baseUrlPath = '/entity';
  this.debug = options.debug;

  if (this.urlObj.protocol == 'https:') {
    this.httpClient = https;
  } else {
    this.httpClient = http;
  }

  if (typeof options.httpKeepAlive === 'undefined') {
    this.httpKeepAlive = true;
  } else {
    this.httpKeepAlive = isTrue(options.httpKeepAlive);
  }

  if (this.httpKeepAlive ) {

    var keepAliveOptions = {
      maxSockets: 100,
      maxFreeSockets: 10,
      keepAlive: true,
      keepAliveMsecs: 60000 // keep-alive for 60 seconds
    };

    if (this.urlObj.protocol == 'https:') {
      this.keepAliveAgent = new HttpsAgent(keepAliveOptions);
    } else {
      this.keepAliveAgent = new Agent(keepAliveOptions);
    }

  }

  this.subscriptions = {};
  this.receipts = {};

  this.reconnectInterval = 500;
  this.reconnectIntervalStart = 500;

  this.stompClient = null;

  this.connectionCount = 0;
  this._connPromise = null;
}


Client.prototype.create = function (entityTypeName, _events, options, callback) {

  callback = callback || options;

  //check input params
  if (entityTypeName && _events && (_events instanceof Array) && (_events.length > 0) && _checkEvents(_events)) {

    var events = _prepareEvents(_events);
    var jsonData = {
      entityTypeName: entityTypeName,
      events: events
    };

    addBodyOptions(jsonData, options);

    var path = this.baseUrlPath;
    path = this.urlSpaceName(path);

    return _request(path, 'POST', this.apiKey, jsonData, this, function (err, httpResponse, body) {

      if (err) {

        callback(err);

      } else {

        if (httpResponse.statusCode === 200) {

          _toJSON(body, function (err, jsonBody) {

            if (!err) {
              var entityAndEventInfo = {
                entityIdTypeAndVersion: {
                  entityId     : jsonBody.entityId,
                  entityVersion: jsonBody.entityVersion
                },
                eventIds       : jsonBody.eventIds
              };

              callback(null, entityAndEventInfo);
            } else {
              callback(err);
            }


          });
        } else {

          var error = new EsServerError({
            error  : 'Server returned status code ' + httpResponse.statusCode,
            statusCode: httpResponse.statusCode,
            message: body
          });

          callback(error);
        }
      }
    });

  } else {

    callback(new Error('Incorrect input parameters'));

  }
};

Client.prototype.loadEvents = function (entityTypeName, entityId, options, callback) {

  callback = callback || options;

  //check input params
  if (entityTypeName && entityId) {

    var path = this.baseUrlPath + '/' + entityTypeName + '/' + entityId;

    path = this.urlSpaceName(path);

    if (typeof  options == 'object') {
      path += '?' + serialiseObject(options);
    }

    _request(path, 'GET', this.apiKey, null, this, function (err, httpResponse, body) {

      if (!err) {
        if (httpResponse.statusCode == 200) {
          _toJSON(body, function (err, jsonBody) {

            if (!err) {
              var events = _eventDataToObject(jsonBody.events);
              callback(null, events);
            } else {
              callback(err);
            }
          });
        } else {

          var error = new EsServerError({
            error: 'Server returned status code ' + httpResponse.statusCode,
            message: body
          });
          callback(error);
        }
      } else {
        callback(err);
      }

    });
  } else {
    callback(new Error('Incorrect input parameters'));
  }
};

Client.prototype.update = function (entityTypeName, entityId, entityVersion, _events, options, callback) {


  callback = callback || options;

  //check input params
  if (entityTypeName && entityId && entityVersion
    && _events && _events instanceof Array && _events.length > 0  && _checkEvents(_events)) {


    var events = _prepareEvents(_events);
    var jsonData = { entityId: entityId, entityVersion: entityVersion, events: events };


    addBodyOptions(jsonData, options);

    var path = this.baseUrlPath + '/' + entityTypeName + '/' + entityId;
    path = this.urlSpaceName(path);

    _request(path, 'POST', this.apiKey, jsonData, this, function (err, httpResponse, body) {

      if (!err) {
        if (httpResponse.statusCode == 200) {
          _toJSON(body, function (err, jsonBody) {
            if (err) {
              callback(err);
            } else {
              var entityAndEventInfo = {
                entityIdTypeAndVersion: {
                  entityId: jsonBody.entityId,
                  entityVersion: jsonBody.entityVersion
                },
                eventIds: jsonBody.eventIds
              };

              callback(null, entityAndEventInfo);

            }
          });
        } else {
          var error = new EsServerError({
            error: 'Server returned status code ' + httpResponse.statusCode,
            statusCode: httpResponse.statusCode,
            message: body
          });
          callback(error);
        }

      } else {
        callback(err);
      }
    });
  } else {
    callback(new Error('Incorrect input parameters'));
  }
};

Client.prototype.urlSpaceName = function (path) {

  if (this.spaceName) {

    return path.replace(new RegExp('^' + this.baseUrlPath.replace('/', '\/')), this.baseUrlPath + '/' + this.spaceName);

  } else {
    return path;
  }

};

Client.prototype.subscribe = function (subscriberId, entityTypesAndEvents, callback) {
  if (subscriberId && Object.keys(entityTypesAndEvents).length !== 0) {
    var self = this;

    var createFn = function (observer) {

      var messageCallback = function (body, headers) {

        try {
          var ack = JSON.parse(specialChars.unescape(headers.ack));
        } catch (error) {
          observer.onError(error);
        }

        body.forEach(function (eventStr) {

          var result = self.makeEvent(eventStr, ack);

          if (result.error) {
            observer.onError(result.error);
            return;
          }

          observer.onNext(result.event);
        });
      };

      self.addSubscription(subscriberId, entityTypesAndEvents, messageCallback, callback);

      self.connectToStompServer().then(
        function () {
          self.doClientSubscribe(subscriberId);
        },
        function (error) {
          callback(error);
        }
      );
    };

    var obs = Rx.Observable.create(createFn);

    var acknowledge = function (ack) {
      if (typeof (ack) == 'object') {
        ack = JSON.stringify(ack);
        ack = specialChars.escape(ack);
      }

      self.stompClient.ack(ack);

    };

    return {
      acknowledge: acknowledge,
      observable: obs
    };
  } else {
    callback(new Error('Incorrect input parameters'));
  }
};


Client.prototype.disconnect = function () {
  var self = this;
  self.closed = true;

  if (self._connPromise) {
    self._connPromise.then(function (conn) {
      conn.disconnect();
      if (self.stompClient) {
        try {
          self.stompClient.disconnect();
        } catch (e) {}
      }
    });
  } else {
    console.log('Debug info: Client::disconnect without connection promise spotted.');
  }
};

Client.prototype.connectToStompServer = function (opts) {
  var self = this;
  return self._connPromise || (self._connPromise = new Promise(function (resolve, reject) {

    // Do not reconnect if self-invoked
    if (self.closed) {
      return reject();
    }

    //Create stomp
    var stompArgs = {
      port: self.stompPort,
      host: self.stompHost,
      login: self.apiKey.id,
      passcode: self.apiKey.secret,
      debug: self.debug,
      heartBeat: [5000, 5000],
      timeout: 50000,
      keepAlive: false
    };

    var httpsPatt = /^https/ig;
    if ((typeof(self.url) != 'undefined') && httpsPatt.test(self.url)) {
      stompArgs.ssl = true;
    }

    self.stompClient = new stomp.Stomp(stompArgs);
    self.stompClient.connect();

    self.stompClient.on('socketConnected', function () {

      //reset interval
      self.reconnectInterval = self.reconnectIntervalStart;
    });

    self.stompClient.on('connected', function () {

      resolve(this);
      self.connectionCount++;
    });

    self.stompClient.on('disconnected', function () {
      self.stompClient = null;
      self._connPromise = null;

      if (self.reconnectInterval < 16000) {
        self.reconnectInterval = self.reconnectInterval * 2;
      }

      // Do not reconnect if self-invoked
      if (!self.closed) {
        self.reconnectStompServer(self.reconnectInterval);
      }

    });

    self.stompClient.on('message', function (frame) {

      var headers = frame.headers;
      var body = frame.body;

      var ack = JSON.parse(specialChars.unescape(headers.ack));

      var subscriberId = ack.receiptHandle.subscriberId;

      if (self.subscriptions.hasOwnProperty(subscriberId)) {
        //call message callback;
        self.subscriptions[subscriberId].messageCallback( body, headers);
      } else {
        console.error("Can't find massageCallback for subscriber: " + subscriberId);
      }
    });

    self.stompClient.on('receipt', function (receiptId) {
      //Run the callback function
      if (self.receipts.hasOwnProperty(receiptId)) {
        //call Client.subscribe callback;
        self.receipts[receiptId].clientSubscribeCallback(null, receiptId);
      }
    });

    self.stompClient.on('error', function (error) {
      console.error('stompClient ERROR');
      console.error(error);
    });

  }));
};

Client.prototype.reconnectStompServer = function (interval) {
  console.log('\nReconnecting...');

  console.log(interval);
  var self = this;

  setTimeout(function () {

    self.connectToStompServer().then(
      function () {
        var subscriberId;
        //resubscribe
        for (subscriberId in self.subscriptions) {
          if (self.subscriptions.hasOwnProperty(subscriberId)) {
            self.doClientSubscribe(subscriberId);
          }

        }
      },
      function (error) {
        var receipt;
        //run subscription callback
        for (receipt in self.receipts) {
          if (self.receipts.hasOwnProperty(receipt)) {
            self.receipts[receipt].clientSubscribeCallback(error);
          }
        }

      }
    );
  }, interval);

};

Client.prototype.addSubscription = function (subscriberId, entityTypesAndEvents, messageCallback, clientSubscribeCallback) {

  var timestamp = new Date().getTime();

  //add new subscription if not exists
  if (typeof this.subscriptions[subscriberId] == 'undefined') {
   this.subscriptions[subscriberId] = {};
  }

  var subscription = {};
  subscription.subscriberId = subscriberId;
  subscription.entityTypesAndEvents = entityTypesAndEvents;
  subscription.messageCallback = messageCallback;

  var destination = {
    subscriberId: subscriberId,
    entityTypesAndEvents: subscription.entityTypesAndEvents
  };

  if (this.spaceName) {
    destination.space = this.spaceName;
  }

  destination = specialChars.escape(JSON.stringify(destination));

  var id = 'subscription-id' + timestamp;
  var receipt = 'receipt-id' + timestamp;

  //add to receipts
  this.addReceipt(receipt, clientSubscribeCallback);

  subscription.headers = {
    id: id,
    receipt: receipt,
    destination: destination
  };

  this.subscriptions[subscriberId] = subscription;
};

Client.prototype.addReceipt = function (receipt, clientSubscribeCallback) {
  if (typeof this.receipts[receipt] == 'undefined') {
    this.receipts[receipt] = {};
  }
  this.receipts[receipt].clientSubscribeCallback = clientSubscribeCallback;
};

Client.prototype.doClientSubscribe = function (subscriberId) {

  if (this.subscriptions.hasOwnProperty(subscriberId)) {
    var subscription = this.subscriptions[subscriberId];

    this.stompClient.subscribe(subscription.headers);
  } else {
    console.error(new Error('Can\t find subscription fo subscriber ' + subscriberId));
  }
};

Client.prototype.makeEvent = function (eventStr, ack) {

  try {

    var parsedEvent = JSON.parse(eventStr);

    try {

      var event = {
        eventId: parsedEvent.id,
        eventType: parsedEvent.eventType,
        entityId: parsedEvent.entityId,
        ack: ack
      };

      event.eventData = JSON.parse(parsedEvent.eventData);

      return { event: event };

    } catch (err) {
      return { error: err };
    }
  } catch (err) {
    return { error: err };
  }

};

function _prepareEvents(events) {

  return events.map(function(event) {
    var preparedEvent = _.clone(event);

    if (typeof event.eventData == 'object') {
      preparedEvent.eventData = JSON.stringify(preparedEvent.eventData);
    }

    return preparedEvent;

  });
}

/**
 * Checks that events have all needed properties
 * Checks eventData
 * @param {Object[]} events - Events
 * @param {string} events[].eventType - The type of event
 * @param {string|Object} events[].eventData - The event data
 * @returns {Boolean}
 */
function _checkEvents (events) {
  var  i;
  for (i in events) {
    if (events.hasOwnProperty(i)) {
      var event = events[i];
      if (!event.hasOwnProperty('eventType')) {
        return false;
      }

      if (!event.hasOwnProperty('eventData')) {
        return false;
      }

      if (typeof event.eventData != 'object') {
        event.eventData = String(event.eventData);
        //parse string
        try {
          event.eventData = JSON.parse(event.eventData);
        } catch(e){
          return false;
        }
      }

      if (Object.keys(event.eventData).length === 0 ) {
        return false;
      }
    }
  }

  return true;
}

function _eventDataToObject(events) {
  return events.map(function (e) {

    var event = _.clone(e);

    if (typeof event.eventData == 'string') {
      try {
        event.eventData = JSON.parse(event.eventData);
      } catch (ex) {
        console.error('Can not parse eventData');
        console.error(ex);
        event.eventData = {};
      }

      return event;
    } else {
      return event;
    }
  });
}

function EsServerError(jsonBody) {
  if (typeof (jsonBody) == 'object') {
    this.timestamp = jsonBody.timestamp;
    this.status = jsonBody.status;
    this.statusCode = jsonBody.statusCode;
    this.error = jsonBody.error;
    this.exception = jsonBody.exception;

    if (typeof jsonBody.message == 'object') {
      jsonBody.message = JSON.stringify(jsonBody.message);
    }

    this.message = jsonBody.message;
    this.path = jsonBody.path;

  } else {

    this.message = jsonBody;
  }

  Error.captureStackTrace(this, EsServerError);
}

util.inherits(EsServerError, Error);
EsServerError.prototype.name = 'ES Server Error';


function _toJSON(variable, callback) {

  if (typeof (variable) == 'object') {

    callback(null, variable);

  } else {

    try {
      callback(null, JSON.parse(variable));
    } catch (err) {
      callback(err);
    }

  }
}

function _request(path, method, apiKey, jsonData, client, callback) {

  var auth = "Basic " + new Buffer(apiKey.id + ":" + apiKey.secret).toString("base64");
  var headers = { 'Authorization' : auth };

  if (method == 'POST') {
    var postData = JSON.stringify(jsonData);
    headers['Content-Type'] = 'application/json';
    headers['Content-Length'] = Buffer.byteLength(postData, 'utf8');
  }

  var options = {
    host: client.urlObj.hostname,
    path: path,
    method: method,
    port: client.urlObj.port,
    headers: headers
  };

  if (client.httpKeepAlive) {
    options.agent = client.keepAliveAgent;
  }


  var req = client.httpClient.request(options, function (res) {

    res.setEncoding('utf8');

    var responseData = '';

    res.on('data', function (chunk) {

      responseData += chunk;
    });

    res.on('end', function () {
      callback(null, res, responseData);
    })


  });

  req.on('error', function (err) {
    callback(err);
  });

  if (method == 'POST') {
    req.write(postData);
  }

  req.end();

  return req;
}

function isTrue(val) {
  return /^(?:t(?:rue)?|yes?|1+)$/i.test(val);
}

function serialiseObject(obj) {
  var pairs = [];
  for (var prop in obj) {
    if (obj.hasOwnProperty(prop)) {
      pairs.push(prop + '=' + obj[prop]);
    }
  }
  return pairs.join('&');
}


function addBodyOptions (jsonData, options) {
  if (typeof options == 'object') {
    for (var option in options) {
      if (options.hasOwnProperty(option)) {
        jsonData[option] = options[option];
      }
    }
  }
}

module.exports.Client = Client;
