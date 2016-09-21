'use strict';

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol ? "symbol" : typeof obj; };

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _util = require('util');

var _util2 = _interopRequireDefault(_util);

var _rx = require('rx');

var _rx2 = _interopRequireDefault(_rx);

var _underscore = require('underscore');

var _underscore2 = _interopRequireDefault(_underscore);

var _agentkeepalive = require('agentkeepalive');

var _agentkeepalive2 = _interopRequireDefault(_agentkeepalive);

var _url = require('url');

var _url2 = _interopRequireDefault(_url);

var _uuid = require('uuid');

var _uuid2 = _interopRequireDefault(_uuid);

var _http = require('http');

var _http2 = _interopRequireDefault(_http);

var _https = require('https');

var _https2 = _interopRequireDefault(_https);

var _path = require('path');

var _path2 = _interopRequireDefault(_path);

var _Stomp = require('./stomp/Stomp');

var _Stomp2 = _interopRequireDefault(_Stomp);

var _specialChars = require('./specialChars');

var _specialChars2 = _interopRequireDefault(_specialChars);

var _EsServerError = require('./EsServerError');

var _EsServerError2 = _interopRequireDefault(_EsServerError);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var EsClient = function () {
  function EsClient(_ref) {
    var apiKey = _ref.apiKey;
    var spaceName = _ref.spaceName;
    var httpKeepAlive = _ref.httpKeepAlive;
    var debug = _ref.debug;

    _classCallCheck(this, EsClient);

    this.url = process.env.EVENTUATE_URL || process.env.EVENT_STORE_URL || 'https://api.eventuate.io';
    this.stompHost = process.env.EVENTUATE_STOMP_SERVER_HOST || process.env.EVENT_STORE_STOMP_SERVER_HOST || 'api.eventuate.io';
    this.stompPort = process.env.EVENTUATE_STOMP_SERVER_PORT || process.env.EVENT_STORE_STOMP_SERVER_PORT || 61614;

    this.apiKey = apiKey;
    this.spaceName = spaceName || false;

    this.urlObj = _url2.default.parse(this.url);

    this.defineHttpProtocol();
    this.setupHttpClient();
    this.setupKeepAliveAgent(httpKeepAlive);

    this.baseUrlPath = '/entity';
    this.debug = debug;

    this.subscriptions = {};
    this.receipts = {};

    this.reconnectInterval = 500;
    this.reconnectIntervalStart = 500;

    this.stompClient = null;

    this.connectionCount = 0;
    this._connPromise = null;
  }

  _createClass(EsClient, [{
    key: 'defineHttpProtocol',
    value: function defineHttpProtocol() {
      this.useHttps = this.urlObj.protocol == 'https:';
    }
  }, {
    key: 'setupHttpClient',
    value: function setupHttpClient() {
      if (this.useHttps) {
        this.httpClient = _https2.default;
      } else {
        this.httpClient = _http2.default;
      }
    }
  }, {
    key: 'setupKeepAliveAgent',
    value: function setupKeepAliveAgent(httpKeepAlive) {

      if (typeof httpKeepAlive === 'undefined') {
        this.httpKeepAlive = true;
      } else {
        this.httpKeepAlive = isTrue(httpKeepAlive);
      }

      if (this.httpKeepAlive) {

        var keepAliveOptions = {
          maxSockets: 100,
          maxFreeSockets: 10,
          keepAlive: true,
          keepAliveMsecs: 60000 // keep-alive for 60 seconds
        };

        if (this.useHttps) {
          this.keepAliveAgent = new _agentkeepalive.HttpsAgent(keepAliveOptions);
        } else {
          this.keepAliveAgent = new _agentkeepalive2.default(keepAliveOptions);
        }
      }
    }
  }, {
    key: 'create',
    value: function create(entityTypeName, _events, options, callback) {

      callback = callback || options;

      //check input params
      if (entityTypeName && _events && _events instanceof Array && _events.length > 0 && _checkEvents(_events)) {

        var events = _prepareEvents(_events);
        var jsonData = {
          entityTypeName: entityTypeName,
          events: events
        };

        addBodyOptions(jsonData, options);

        var urlPath = this.urlSpaceName(this.baseUrlPath);

        return _request(urlPath, 'POST', this.apiKey, jsonData, this, function (err, httpResponse, body) {

          if (err) {
            return callback(err);
          }

          if (httpResponse.statusCode != 200) {
            var error = new _EsServerError2.default({
              error: 'Server returned status code ' + httpResponse.statusCode,
              statusCode: httpResponse.statusCode,
              message: body
            });

            return callback(error);
          }

          _toJSON(body, function (err, jsonBody) {

            if (err) {
              return callback(err);
            }

            var entityAndEventInfo = {
              entityIdTypeAndVersion: {
                entityId: jsonBody.entityId,
                entityVersion: jsonBody.entityVersion
              },
              eventIds: jsonBody.eventIds
            };

            callback(null, entityAndEventInfo);
          });
        });
      } else {
        callback(new Error('Incorrect input parameters'));
      }
    }
  }, {
    key: 'loadEvents',
    value: function loadEvents(entityTypeName, entityId, options, callback) {

      callback = callback || options;

      //check input params
      if (entityTypeName && entityId) {

        var urlPath = this.urlSpaceName(_path2.default.join(this.baseUrlPath, '/', entityTypeName, '/', entityId));

        if ((typeof options === 'undefined' ? 'undefined' : _typeof(options)) == 'object') {
          urlPath += '?' + serialiseObject(options);
        }

        _request(urlPath, 'GET', this.apiKey, null, this, function (err, httpResponse, body) {

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

              var error = new _EsServerError2.default({
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
    }
  }, {
    key: 'update',
    value: function update(entityTypeName, entityId, entityVersion, _events, options, callback) {

      callback = callback || options;

      //check input params
      if (entityTypeName && entityId && entityVersion && _events && _events instanceof Array && _events.length > 0 && _checkEvents(_events)) {

        var events = _prepareEvents(_events);
        var jsonData = {
          entityId: entityId,
          entityVersion: entityVersion,
          events: events
        };

        addBodyOptions(jsonData, options);

        var urlPath = this.urlSpaceName(_path2.default.join(this.baseUrlPath, '/', entityTypeName, '/', entityId));

        _request(urlPath, 'POST', this.apiKey, jsonData, this, function (err, httpResponse, body) {

          if (err) {
            return callback(err);
          }

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

            console.log('body:', body);

            var error = new _EsServerError2.default({
              error: 'Server returned status code ' + httpResponse.statusCode,
              statusCode: httpResponse.statusCode,
              message: body
            });
            callback(error);
          }
        });
      } else {
        callback(new Error('Incorrect input parameters'));
      }
    }
  }, {
    key: 'getObservableCreateFn',
    value: function getObservableCreateFn(subscriberId, entityTypesAndEvents, callback) {
      var _this = this;

      return function (observer) {

        var messageCallback = function messageCallback(body, headers) {

          var ack = void 0;
          try {
            ack = JSON.parse(_specialChars2.default.unescape(headers.ack));
          } catch (error) {
            observer.onError(error);
          }

          body.forEach(function (eventStr) {

            var result = _this.makeEvent(eventStr, ack);

            if (result.error) {
              observer.onError(result.error);
              return;
            }

            observer.onNext(result.event);
          });
        };

        _this.addSubscription(subscriberId, entityTypesAndEvents, messageCallback, callback);

        _this.connectToStompServer().then(function () {
          _this.doClientSubscribe(subscriberId);
        }, function (error) {
          callback(error);
        });
      };
    }
  }, {
    key: 'subscribe',
    value: function subscribe(subscriberId, entityTypesAndEvents, callback) {
      var _this2 = this;

      if (subscriberId && Object.keys(entityTypesAndEvents).length !== 0) {

        var createFn = this.getObservableCreateFn(subscriberId, entityTypesAndEvents, callback);

        var observable = _rx2.default.Observable.create(createFn);

        var acknowledge = function acknowledge(ack) {
          if ((typeof ack === 'undefined' ? 'undefined' : _typeof(ack)) == 'object') {
            ack = JSON.stringify(ack);
            ack = _specialChars2.default.escape(ack);
          }

          _this2.stompClient.ack(ack);
        };

        return {
          acknowledge: acknowledge,
          observable: observable
        };
      } else {
        callback(new Error('Incorrect input parameters'));
      }
    }
  }, {
    key: 'disconnect',
    value: function disconnect() {
      var _this3 = this;

      this.closed = true;

      if (this._connPromise) {

        this._connPromise.then(function (conn) {
          conn.disconnect();
          if (_this3.stompClient) {
            try {
              _this3.stompClient.disconnect();
            } catch (e) {
              console.error(e);
            }
          }
        });
      } else {
        console.log('Debug info: Client::disconnect without connection promise spotted.');
      }
    }
  }, {
    key: 'connectToStompServer',
    value: function connectToStompServer(opts) {
      var _this4 = this;

      return this._connPromise || (this._connPromise = new Promise(function (resolve, reject) {

        // Do not reconnect if self-invoked
        if (_this4.closed) {
          return reject();
        }

        //Create stomp
        var stompArgs = {
          port: _this4.stompPort,
          host: _this4.stompHost,
          login: _this4.apiKey.id,
          passcode: _this4.apiKey.secret,
          debug: _this4.debug,
          heartBeat: [5000, 5000],
          timeout: 50000,
          keepAlive: false
        };

        var httpsPatt = /^https/ig;
        if (typeof _this4.url != 'undefined' && httpsPatt.test(_this4.url)) {
          stompArgs.ssl = true;
        }

        _this4.stompClient = new _Stomp2.default(stompArgs);
        _this4.stompClient.connect();

        _this4.stompClient.on('socketConnected', function () {

          //reset interval
          _this4.reconnectInterval = _this4.reconnectIntervalStart;
        });

        _this4.stompClient.on('connected', function () {

          resolve();
          _this4.connectionCount++;
        });

        _this4.stompClient.on('disconnected', function () {
          _this4.stompClient = null;
          _this4._connPromise = null;

          // Do not reconnect if self-invoked
          if (!_this4.closed) {

            if (_this4.reconnectInterval < 16000) {
              _this4.reconnectInterval = _this4.reconnectInterval * 2;
            }

            _this4.reconnectStompServer(_this4.reconnectInterval);
          }
        });

        _this4.stompClient.on('message', function (frame) {

          var headers = frame.headers;
          var body = frame.body;

          var ack = JSON.parse(_specialChars2.default.unescape(headers.ack));

          var subscriberId = ack.receiptHandle.subscriberId;

          if (_this4.subscriptions.hasOwnProperty(subscriberId)) {
            //call message callback;
            _this4.subscriptions[subscriberId].messageCallback(body, headers);
          } else {
            console.error('Can\'t find massageCallback for subscriber: ' + subscriberId);
          }
        });

        _this4.stompClient.on('receipt', function (receiptId) {
          //Run the callback function
          if (_this4.receipts.hasOwnProperty(receiptId)) {
            //call Client.subscribe callback;
            _this4.receipts[receiptId].clientSubscribeCallback(null, receiptId);
          }
        });

        _this4.stompClient.on('error', function (error) {
          console.error('stompClient ERROR');
          console.error(error);
        });
      }));
    }
  }, {
    key: 'reconnectStompServer',
    value: function reconnectStompServer(interval) {
      var _this5 = this;

      console.log('\nReconnecting...');
      console.log(interval);

      setTimeout(function () {

        _this5.connectToStompServer().then(function () {

          //resubscribe
          for (var subscriberId in _this5.subscriptions) {
            if (_this5.subscriptions.hasOwnProperty(subscriberId)) {
              _this5.doClientSubscribe(subscriberId);
            }
          }
        }, function (error) {

          //run subscription callback
          for (var receipt in _this5.receipts) {
            if (_this5.receipts.hasOwnProperty(receipt)) {
              _this5.receipts[receipt].clientSubscribeCallback(error);
            }
          }
        });
      }, interval);
    }
  }, {
    key: 'addSubscription',
    value: function addSubscription(subscriberId, entityTypesAndEvents, messageCallback, clientSubscribeCallback) {

      //add new subscription if not exists
      if (typeof this.subscriptions[subscriberId] == 'undefined') {
        this.subscriptions[subscriberId] = {};
      }

      var subscription = {
        subscriberId: subscriberId,
        entityTypesAndEvents: entityTypesAndEvents,
        messageCallback: messageCallback
      };

      var destination = {
        entityTypesAndEvents: subscription.entityTypesAndEvents,
        subscriberId: subscriberId
      };

      if (this.spaceName) {
        destination.space = this.spaceName;
      }

      destination = _specialChars2.default.escape(JSON.stringify(destination));

      var uniqueId = _uuid2.default.v1().replace(new RegExp('-', 'g'), '');
      var subscriptionId = 'subscription-id-' + uniqueId;
      var receipt = 'receipt-id-' + uniqueId;

      //add to receipts
      this.addReceipt(receipt, clientSubscribeCallback);

      subscription.headers = {
        id: subscriptionId,
        receipt: receipt,
        destination: destination
      };

      this.subscriptions[subscriberId] = subscription;
    }
  }, {
    key: 'addReceipt',
    value: function addReceipt(receipt, clientSubscribeCallback) {
      if (typeof this.receipts[receipt] == 'undefined') {
        this.receipts[receipt] = {};
      }
      this.receipts[receipt].clientSubscribeCallback = clientSubscribeCallback;
    }
  }, {
    key: 'doClientSubscribe',
    value: function doClientSubscribe(subscriberId) {

      if (this.subscriptions.hasOwnProperty(subscriberId)) {
        var subscription = this.subscriptions[subscriberId];

        this.stompClient.subscribe(subscription.headers);
      } else {
        console.error(new Error('Can\t find subscription fo subscriber ' + subscriberId));
      }
    }
  }, {
    key: 'makeEvent',
    value: function makeEvent(eventStr, ack) {

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
    }
  }, {
    key: 'urlSpaceName',
    value: function urlSpaceName(urlPath) {

      if (this.spaceName) {
        return urlPath.replace(new RegExp('^' + this.baseUrlPath.replace('/', '\/')), this.baseUrlPath + '/' + this.spaceName);
      } else {
        return urlPath;
      }
    }
  }]);

  return EsClient;
}();

exports.default = EsClient;


function _eventDataToObject(events) {

  return events.map(function (e) {

    var event = _underscore2.default.clone(e);

    if (typeof event.eventData == 'string') {
      try {
        event.eventData = JSON.parse(event.eventData);
      } catch (err) {
        console.error('Can not parse eventData');
        console.error(err);
        event.eventData = {};
      }

      return event;
    } else {
      return event;
    }
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
//TODO: write test
function _checkEvents(events) {

  return events.every(function (event) {

    if (!event.hasOwnProperty('eventType')) {
      return false;
    }

    if (!event.hasOwnProperty('eventData')) {
      return false;
    }

    if (_typeof(event.eventData) != 'object') {

      event.eventData = String(event.eventData);
      //parse string
      try {
        event.eventData = JSON.parse(event.eventData);
      } catch (e) {
        return false;
      }
    }

    if (Object.keys(event.eventData).length === 0) {
      return false;
    }

    return true;
  });
}

function isTrue(val) {
  return (/^(?:t(?:rue)?|yes?|1+)$/i.test(val)
  );
}

//TODO: write test
function serialiseObject(obj) {

  return Object.keys(obj).reduce(function (str, key) {
    return '' + str + (str ? '&' : '') + key + '=' + obj[key];
  }, '');
}

//TODO: write test
function addBodyOptions(jsonData, options) {

  if ((typeof options === 'undefined' ? 'undefined' : _typeof(options)) == 'object') {
    Object.keys(options).forEach(function (key) {
      jsonData[key] = options[key];
    });
  }
}

function _prepareEvents(events) {

  return events.map(function (event) {

    var preparedEvent = _underscore2.default.clone(event);

    if (_typeof(event.eventData) == 'object') {
      preparedEvent.eventData = JSON.stringify(preparedEvent.eventData);
    }

    return preparedEvent;
  });
}

function _toJSON(variable, callback) {

  if ((typeof variable === 'undefined' ? 'undefined' : _typeof(variable)) == 'object') {

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

  var auth = 'Basic ' + new Buffer(apiKey.id + ":" + apiKey.secret).toString("base64");

  var headers = {
    'Authorization': auth
  };

  var postData = void 0;
  if (method == 'POST') {
    postData = JSON.stringify(jsonData);
    headers['Content-Type'] = 'application/json';
    headers['Content-Length'] = Buffer.byteLength(postData, 'utf8');
  }

  var options = {
    host: client.urlObj.hostname,
    port: client.urlObj.port,
    path: path,
    method: method,
    headers: headers
  };

  if (client.httpKeepAlive) {
    options.agent = client.keepAliveAgent;
  }

  //console.log('request options:', options);

  var req = client.httpClient.request(options, function (res) {

    res.setEncoding('utf8');

    var responseData = '';

    res.on('data', function (chunk) {

      responseData += chunk;
    });

    res.on('end', function () {
      callback(null, res, responseData);
    });
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
module.exports = exports['default'];