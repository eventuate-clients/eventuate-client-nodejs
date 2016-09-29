'use strict';

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol ? "symbol" : typeof obj; };

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

Object.defineProperty(exports, "__esModule", {
  value: true
});

require('babel-polyfill');

var _util = require('util');

var _util2 = _interopRequireDefault(_util);

var _rx = require('rx');

var _rx2 = _interopRequireDefault(_rx);

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

var _invariant = require('invariant');

var _invariant2 = _interopRequireDefault(_invariant);

var _Stomp = require('./stomp/Stomp');

var _Stomp2 = _interopRequireDefault(_Stomp);

var _AckOrderTracker = require('./stomp/AckOrderTracker');

var _AckOrderTracker2 = _interopRequireDefault(_AckOrderTracker);

var _specialChars = require('./specialChars');

var _specialChars2 = _interopRequireDefault(_specialChars);

var _EsServerError = require('./EsServerError');

var _EsServerError2 = _interopRequireDefault(_EsServerError);

var _utils = require('./utils');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _objectWithoutProperties(obj, keys) { var target = {}; for (var i in obj) { if (keys.indexOf(i) >= 0) continue; if (!Object.prototype.hasOwnProperty.call(obj, i)) continue; target[i] = obj[i]; } return target; }

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

    this.determineIfSecure();
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
    key: 'determineIfSecure',
    value: function determineIfSecure() {
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
        this.httpKeepAlive = (0, _utils.parseIsTrue)(httpKeepAlive);
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
      if (!entityTypeName || !this.checkEvents(_events)) {
        return callback(new Error('Incorrect input parameters'));
      }

      var events = this.prepareEvents(_events);
      var jsonData = {
        entityTypeName: entityTypeName,
        events: events
      };

      this.addBodyOptions(jsonData, options);

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

        (0, _utils.toJSON)(body, function (err, jsonBody) {

          if (err) {
            return callback(err);
          }

          var entityId = jsonBody.entityId;
          var entityVersion = jsonBody.entityVersion;
          var eventIds = jsonBody.eventIds;


          if (!entityId || !entityVersion || !eventIds) {
            return callback(new _EsServerError2.default({
              error: 'Bad server response',
              statusCode: httpResponse.statusCode,
              message: body
            }));
          }

          callback(null, {
            entityIdTypeAndVersion: { entityId: entityId, entityVersion: entityVersion },
            eventIds: eventIds
          });
        });
      });
    }
  }, {
    key: 'loadEvents',
    value: function loadEvents(entityTypeName, entityId, options, callback) {
      var _this = this;

      callback = callback || options;

      //check input params
      if (!entityTypeName || !entityId) {
        return callback(new Error('Incorrect input parameters'));
      }

      var urlPath = this.urlSpaceName(_path2.default.join(this.baseUrlPath, '/', entityTypeName, '/', entityId));

      if ((typeof options === 'undefined' ? 'undefined' : _typeof(options)) == 'object') {
        urlPath += '?' + this.serialiseObject(options);
      }

      _request(urlPath, 'GET', this.apiKey, null, this, function (err, httpResponse, body) {

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

        (0, _utils.toJSON)(body, function (err, jsonBody) {

          if (err) {
            return callback(err);
          }

          var events = _this.eventDataToObject(jsonBody.events);
          callback(null, events);
        });
      });
    }
  }, {
    key: 'update',
    value: function update(entityTypeName, entityId, entityVersion, _events, options, callback) {

      callback = callback || options;

      //check input params
      if (!entityTypeName || !entityId || !entityVersion || !this.checkEvents(_events)) {
        return callback(new Error('Incorrect input parameters'));
      }

      var events = this.prepareEvents(_events);
      var jsonData = {
        entityId: entityId,
        entityVersion: entityVersion,
        events: events
      };

      this.addBodyOptions(jsonData, options);

      var urlPath = this.urlSpaceName(_path2.default.join(this.baseUrlPath, '/', entityTypeName, '/', entityId));

      _request(urlPath, 'POST', this.apiKey, jsonData, this, function (err, httpResponse, body) {

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

        (0, _utils.toJSON)(body, function (err, jsonBody) {
          if (err) {
            return callback(err);
          }

          var entityId = jsonBody.entityId;
          var entityVersion = jsonBody.entityVersion;
          var eventIds = jsonBody.eventIds;


          if (!entityId || !entityVersion || !eventIds) {
            return callback(new _EsServerError2.default({
              error: 'Bad server response',
              statusCode: httpResponse.statusCode,
              message: body
            }));
          }

          callback(null, {
            entityIdTypeAndVersion: { entityId: entityId, entityVersion: entityVersion },
            eventIds: eventIds
          });
        });
      });
    }
  }, {
    key: 'subscribe',
    value: function subscribe(subscriberId, entityTypesAndEvents, options, callback) {
      var _this2 = this;

      callback = callback || options;

      var ackOrderTracker = new _AckOrderTracker2.default();

      if (!subscriberId || !Object.keys(entityTypesAndEvents).length) {
        return callback(new Error('Incorrect input parameters'));
      }

      var createFn = this.observableCreateAndSubscribe(subscriberId, entityTypesAndEvents, ackOrderTracker, options, callback);

      var observable = _rx2.default.Observable.create(createFn);

      var acknowledge = function acknowledge(ack) {
        ackOrderTracker.ack(ack).forEach(_this2.stompClient.ack.bind(_this2.stompClient));
      };

      return {
        acknowledge: acknowledge,
        observable: observable
      };
    }
  }, {
    key: 'observableCreateAndSubscribe',
    value: function observableCreateAndSubscribe(subscriberId, entityTypesAndEvents, ackOrderTracker, options, callback) {
      var _this3 = this;

      callback = callback || options;

      return function (observer) {

        var messageCallback = function messageCallback(body, headers) {

          ackOrderTracker.add(headers.ack);

          body.forEach(function (eventStr) {

            var result = _this3.makeEvent(eventStr, headers.ack);

            if (result.error) {
              return observer.onError(result.error);
            }

            observer.onNext(result.event);
          });
        };

        _this3.addSubscription(subscriberId, entityTypesAndEvents, messageCallback, options, callback);

        _this3.connectToStompServer().then(function () {
          _this3.doClientSubscribe(subscriberId);
        }, callback);
      };
    }
  }, {
    key: 'addSubscription',
    value: function addSubscription(subscriberId, entityTypesAndEvents, messageCallback, options, clientSubscribeCallback) {

      clientSubscribeCallback = clientSubscribeCallback || options;

      //add new subscription if not exists
      if (typeof this.subscriptions[subscriberId] == 'undefined') {
        this.subscriptions[subscriberId] = {};
      }

      var destinationObj = {
        entityTypesAndEvents: entityTypesAndEvents,
        subscriberId: subscriberId
      };

      if (this.spaceName) {
        destinationObj.space = this.spaceName;
      }

      if (options) {
        destinationObj.durability = options.durability;
        destinationObj.readFrom = options.readFrom;
        destinationObj.progressNotifications = options.progressNotifications;
      }

      var destination = _specialChars2.default.escape(JSON.stringify(destinationObj));

      var uniqueId = _uuid2.default.v1().replace(new RegExp('-', 'g'), '');
      var id = 'subscription-id-' + uniqueId;
      var receipt = 'receipt-id-' + uniqueId;

      //add to receipts
      this.addReceipt(receipt, clientSubscribeCallback);

      this.subscriptions[subscriberId] = {
        subscriberId: subscriberId,
        entityTypesAndEvents: entityTypesAndEvents,
        messageCallback: messageCallback,
        headers: {
          id: id,
          receipt: receipt,
          destination: destination
        }
      };
    }
  }, {
    key: 'connectToStompServer',
    value: function connectToStompServer() {
      var _this4 = this;

      return this._connPromise || (this._connPromise = new Promise(function (resolve, reject) {

        // Do not reconnect if self-invoked
        if (_this4.closed) {
          return reject();
        }

        var port = _this4.stompPort;
        var host = _this4.stompHost;
        var ssl = _this4.useHttps;
        var debug = _this4.debug;
        var _apiKey = _this4.apiKey;
        var login = _apiKey.id;
        var passcode = _apiKey.secret;

        var heartBeat = [5000, 5000];
        var timeout = 50000;
        var keepAlive = false;

        (0, _invariant2.default)(port && host && login && passcode && heartBeat && timeout, 'Incorrect STOMP connection parameters');
        var stompArgs = { port: port, host: host, login: login, passcode: passcode, heartBeat: heartBeat, timeout: timeout, keepAlive: keepAlive, ssl: ssl, debug: debug };

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
    key: 'addReceipt',
    value: function addReceipt(receipt, clientSubscribeCallback) {

      var receiptObj = this.receipts[receipt];

      if (typeof receiptObj == 'undefined') {
        receiptObj = {};
      }

      receiptObj.clientSubscribeCallback = clientSubscribeCallback;
    }
  }, {
    key: 'doClientSubscribe',
    value: function doClientSubscribe(subscriberId) {

      if (!this.subscriptions.hasOwnProperty(subscriberId)) {
        return console.error(new Error('Can\'t find subscription for subscriber ' + subscriberId));
      }

      var subscription = this.subscriptions[subscriberId];

      this.stompClient.subscribe(subscription.headers);
    }
  }, {
    key: 'disconnect',
    value: function disconnect() {
      var _this6 = this;

      this.closed = true;

      (0, _invariant2.default)(this._connPromise, 'Disconnect without connection promise spotted.');

      this._connPromise.then(function (conn) {
        conn.disconnect();
        if (_this6.stompClient) {
          try {
            _this6.stompClient.disconnect();
          } catch (e) {
            console.error(e);
          }
        }
      });
    }
  }, {
    key: 'makeEvent',
    value: function makeEvent(eventStr, ack) {

      try {
        var _JSON$parse = JSON.parse(eventStr);

        var eventId = _JSON$parse.id;
        var eventType = _JSON$parse.eventType;
        var entityId = _JSON$parse.entityId;
        var eventDataStr = _JSON$parse.eventData;


        try {

          var eventData = JSON.parse(eventDataStr);

          var _event = {
            eventId: eventId,
            eventType: eventType,
            entityId: entityId,
            ack: ack,
            eventData: eventData
          };

          return { event: _event };
        } catch (error) {
          return { error: error };
        }
      } catch (error) {
        return { error: error };
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
  }, {
    key: 'serialiseObject',
    value: function serialiseObject(obj) {

      return Object.keys(obj).map(function (key) {
        return key + '=' + obj[key];
      }).join('&');
    }
  }, {
    key: 'addBodyOptions',
    value: function addBodyOptions(jsonData, options) {

      Object.keys(options).reduce(function (jsonData, key) {

        jsonData[key] = options[key];

        return jsonData;
      }, jsonData);
    }
  }, {
    key: 'prepareEvents',
    value: function prepareEvents(events) {

      return events.map(function () {
        var _ref2 = arguments.length <= 0 || arguments[0] === undefined ? event : arguments[0];

        var eventData = _ref2.eventData;

        var rest = _objectWithoutProperties(_ref2, ['eventData']);

        if ((typeof eventData === 'undefined' ? 'undefined' : _typeof(eventData)) == 'object') {
          eventData = JSON.stringify(eventData);
        }

        return _extends({}, rest, {
          eventData: eventData
        });
      });
    }
  }, {
    key: 'eventDataToObject',
    value: function eventDataToObject(events) {

      return events.map(function (e) {

        var event = Object.assign({}, e);

        if (typeof event.eventData != 'string') {
          return event;
        }

        try {
          event.eventData = JSON.parse(event.eventData);
        } catch (err) {
          console.error('Can not parse eventData');
          console.error(err);
          event.eventData = {};
        }

        return event;
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

  }, {
    key: 'checkEvents',
    value: function checkEvents(events) {

      if (!Array.isArray(events) || !events.length) {
        return false;
      }

      return events.every(function (_ref3) {
        var eventType = _ref3.eventType;
        var eventData = _ref3.eventData;


        if (!eventType || !eventData) {
          return false;
        }

        var ed = void 0;

        if (typeof eventData == 'string') {

          ed = eventData;
          //try to parse eventData
          try {
            ed = JSON.parse(ed);
          } catch (e) {
            return false;
          }
        } else if ((typeof eventData === 'undefined' ? 'undefined' : _typeof(eventData)) == 'object') {
          ed = Object.assign({}, eventData);
        } else {
          return false;
        }

        if (Object.keys(ed).length === 0) {
          return false;
        }

        return true;
      });
    }
  }]);

  return EsClient;
}();

exports.default = EsClient;


function _request(path, method, apiKey, jsonData, client, callback) {

  var auth = 'Basic ' + new Buffer(apiKey.id + ':' + apiKey.secret).toString('base64');

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