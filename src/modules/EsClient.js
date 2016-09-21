import util from 'util';
import Rx from 'rx';
import _ from 'underscore';
import Agent, { HttpsAgent } from 'agentkeepalive';
import url from 'url';
import uuid from 'uuid';
import http from 'http';
import https from 'https';
import path from 'path';

import Stomp from './stomp/Stomp';
import specialChars from './specialChars';
import EsServerError from './EsServerError';

export default class EsClient {

  constructor({ apiKey, spaceName, httpKeepAlive, debug }) {

    this.url =  process.env.EVENTUATE_URL || process.env.EVENT_STORE_URL || 'https://api.eventuate.io';
    this.stompHost = process.env.EVENTUATE_STOMP_SERVER_HOST || process.env.EVENT_STORE_STOMP_SERVER_HOST || 'api.eventuate.io';
    this.stompPort = process.env.EVENTUATE_STOMP_SERVER_PORT || process.env.EVENT_STORE_STOMP_SERVER_PORT || 61614;

    this.apiKey = apiKey;
    this.spaceName = spaceName || false;

    this.urlObj = url.parse(this.url);

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

  defineHttpProtocol() {
    this.useHttps = (this.urlObj.protocol == 'https:');
  }

  setupHttpClient() {
    if (this.useHttps) {
      this.httpClient = https;
    } else {
      this.httpClient = http;
    }
  }

  setupKeepAliveAgent(httpKeepAlive) {

    if (typeof httpKeepAlive === 'undefined') {
      this.httpKeepAlive = true;
    } else {
      this.httpKeepAlive = isTrue(httpKeepAlive);
    }

    if (this.httpKeepAlive ) {

      const keepAliveOptions = {
        maxSockets: 100,
        maxFreeSockets: 10,
        keepAlive: true,
        keepAliveMsecs: 60000 // keep-alive for 60 seconds
      };

      if (this.useHttps) {
        this.keepAliveAgent = new HttpsAgent(keepAliveOptions);
      } else {
        this.keepAliveAgent = new Agent(keepAliveOptions);
      }

    }
  }


  create(entityTypeName, _events, options, callback) {

    callback = callback || options;

    //check input params
    if (entityTypeName && _events && (_events instanceof Array) && (_events.length > 0) && _checkEvents(_events)) {

      const events = _prepareEvents(_events);
      const jsonData = {
        entityTypeName,
        events
      };

      addBodyOptions(jsonData, options);

      const urlPath = this.urlSpaceName(this.baseUrlPath);

      return _request(urlPath, 'POST', this.apiKey, jsonData, this, (err, httpResponse, body) => {

        if (err) {
          return callback(err);
        }

        if (httpResponse.statusCode != 200) {
          const error = new EsServerError({
            error  : 'Server returned status code ' + httpResponse.statusCode,
            statusCode: httpResponse.statusCode,
            message: body
          });

          return callback(error);
        }

        _toJSON(body, (err, jsonBody) => {

          if (err) {
            return callback(err);
          }

          const entityAndEventInfo = {
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

  loadEvents(entityTypeName, entityId, options, callback) {

    callback = callback || options;

    //check input params
    if (entityTypeName && entityId) {

      let urlPath = this.urlSpaceName(path.join(this.baseUrlPath, '/', entityTypeName, '/', entityId));

      if (typeof  options == 'object') {
        urlPath += '?' + serialiseObject(options);
      }

      _request(urlPath, 'GET', this.apiKey, null, this, (err, httpResponse, body) => {

        if (!err) {
          if (httpResponse.statusCode == 200) {
            _toJSON(body, (err, jsonBody) => {

              if (!err) {
                const events = _eventDataToObject(jsonBody.events);
                callback(null, events);
              } else {
                callback(err);
              }
            });

          } else {

            const error = new EsServerError({
              error: `Server returned status code ${httpResponse.statusCode}`,
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

  update(entityTypeName, entityId, entityVersion, _events, options, callback) {

    callback = callback || options;

    //check input params
    if (entityTypeName && entityId && entityVersion
      && _events && _events instanceof Array && _events.length > 0  && _checkEvents(_events)) {


      const events = _prepareEvents(_events);
      const jsonData = {
        entityId,
        entityVersion,
        events
      };

      addBodyOptions(jsonData, options);

      const urlPath = this.urlSpaceName(path.join(this.baseUrlPath, '/', entityTypeName, '/', entityId));

      _request(urlPath, 'POST', this.apiKey, jsonData, this, (err, httpResponse, body) => {

        if (err) {
          return callback(err);
        }

        if (httpResponse.statusCode == 200) {
          _toJSON(body, (err, jsonBody) => {
            if (err) {
              callback(err);
            } else {
              const entityAndEventInfo = {
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

          const error = new EsServerError({
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

  getObservableCreateFn(subscriberId, entityTypesAndEvents, callback) {

    return observer => {

      const messageCallback = (body, headers) => {

        let ack;
        try {
          ack = JSON.parse(specialChars.unescape(headers.ack));
        } catch (error) {
          observer.onError(error);
        }

        body.forEach(eventStr => {

          const result = this.makeEvent(eventStr, ack);

          if (result.error) {
            observer.onError(result.error);
            return;
          }

          observer.onNext(result.event);
        });
      };

      this.addSubscription(subscriberId, entityTypesAndEvents, messageCallback, callback);

      this.connectToStompServer().then(
        () => {
          this.doClientSubscribe(subscriberId);
        },
          error => {
          callback(error);
        }
      );
    };
  }

  subscribe(subscriberId, entityTypesAndEvents, callback) {
    if (subscriberId && Object.keys(entityTypesAndEvents).length !== 0) {

      const createFn = this.getObservableCreateFn(subscriberId, entityTypesAndEvents, callback);

      const observable = Rx.Observable.create(createFn);

      const acknowledge = ack => {
        if (typeof (ack) == 'object') {
          ack = JSON.stringify(ack);
          ack = specialChars.escape(ack);
        }

        this.stompClient.ack(ack);

      };

      return {
        acknowledge,
        observable
      };
    } else {
      callback(new Error('Incorrect input parameters'));
    }
  }

  disconnect() {
    this.closed = true;

    if (this._connPromise) {

      this._connPromise.then(conn => {
        conn.disconnect();
        if (this.stompClient) {
          try {
            this.stompClient.disconnect();
          } catch (e) {
            console.error(e);
          }
        }
      });
    } else {
      console.log('Debug info: Client::disconnect without connection promise spotted.');
    }
  };

  connectToStompServer(opts) {

    return this._connPromise || (this._connPromise = new Promise((resolve, reject) => {

        // Do not reconnect if self-invoked
        if (this.closed) {
          return reject();
        }

        //Create stomp
        let stompArgs = {
          port: this.stompPort,
          host: this.stompHost,
          login: this.apiKey.id,
          passcode: this.apiKey.secret,
          debug: this.debug,
          heartBeat: [5000, 5000],
          timeout: 50000,
          keepAlive: false
        };

        const httpsPatt = /^https/ig;
        if ((typeof(this.url) != 'undefined') && httpsPatt.test(this.url)) {
          stompArgs.ssl = true;
        }

        this.stompClient = new Stomp(stompArgs);
        this.stompClient.connect();

        this.stompClient.on('socketConnected', () => {

          //reset interval
          this.reconnectInterval = this.reconnectIntervalStart;
        });

        this.stompClient.on('connected', () => {

          resolve();
          this.connectionCount++;
        });

        this.stompClient.on('disconnected', () => {
          this.stompClient = null;
          this._connPromise = null;

          // Do not reconnect if self-invoked
          if (!this.closed) {

            if (this.reconnectInterval < 16000) {
              this.reconnectInterval = this.reconnectInterval * 2;
            }

            this.reconnectStompServer(this.reconnectInterval);
          }

        });

        this.stompClient.on('message', frame => {

          const headers = frame.headers;
          const body = frame.body;

          const ack = JSON.parse(specialChars.unescape(headers.ack));

          const subscriberId = ack.receiptHandle.subscriberId;

          if (this.subscriptions.hasOwnProperty(subscriberId)) {
            //call message callback;
            this.subscriptions[subscriberId].messageCallback( body, headers);
          } else {
            console.error(`Can't find massageCallback for subscriber: ${subscriberId}`);
          }
        });

        this.stompClient.on('receipt', receiptId => {
          //Run the callback function
          if (this.receipts.hasOwnProperty(receiptId)) {
            //call Client.subscribe callback;
            this.receipts[receiptId].clientSubscribeCallback(null, receiptId);
          }
        });

        this.stompClient.on('error', error => {
          console.error('stompClient ERROR');
          console.error(error);
        });

      }));
  }

  reconnectStompServer(interval) {
    console.log('\nReconnecting...');
    console.log(interval);

    setTimeout(() => {

      this.connectToStompServer()
        .then(() => {

          //resubscribe
          for (let subscriberId in this.subscriptions) {
            if (this.subscriptions.hasOwnProperty(subscriberId)) {
              this.doClientSubscribe(subscriberId);
            }

          }
        },
        error => {

          //run subscription callback
          for (let receipt in this.receipts) {
            if (this.receipts.hasOwnProperty(receipt)) {
              this.receipts[receipt].clientSubscribeCallback(error);
            }
          }

        }
      );
    }, interval);

  };

  addSubscription(subscriberId, entityTypesAndEvents, messageCallback, clientSubscribeCallback) {

    //add new subscription if not exists
    if (typeof this.subscriptions[subscriberId] == 'undefined') {
      this.subscriptions[subscriberId] = {};
    }

    let subscription = {
      subscriberId,
      entityTypesAndEvents,
      messageCallback
    };

    let destination = {
      entityTypesAndEvents: subscription.entityTypesAndEvents,
      subscriberId
    };

    if (this.spaceName) {
      destination.space = this.spaceName;
    }

    destination = specialChars.escape(JSON.stringify(destination));

    const uniqueId = uuid.v1().replace(new RegExp('-', 'g'), '');
    const subscriptionId = `subscription-id-${uniqueId}`;
    const receipt = `receipt-id-${uniqueId}`;

    //add to receipts
    this.addReceipt(receipt, clientSubscribeCallback);

    subscription.headers = {
      id: subscriptionId,
      receipt,
      destination
    };

    this.subscriptions[subscriberId] = subscription;
  };

  addReceipt(receipt, clientSubscribeCallback) {
    if (typeof this.receipts[receipt] == 'undefined') {
      this.receipts[receipt] = {};
    }
    this.receipts[receipt].clientSubscribeCallback = clientSubscribeCallback;
  };

  doClientSubscribe(subscriberId) {

    if (this.subscriptions.hasOwnProperty(subscriberId)) {
      const subscription = this.subscriptions[subscriberId];

      this.stompClient.subscribe(subscription.headers);
    } else {
      console.error(new Error('Can\t find subscription fo subscriber ' + subscriberId));
    }
  };

  makeEvent(eventStr, ack) {

    try {

      const parsedEvent = JSON.parse(eventStr);

      try {

        const event = {
          eventId: parsedEvent.id,
          eventType: parsedEvent.eventType,
          entityId: parsedEvent.entityId,
          ack
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

  urlSpaceName(urlPath) {

    if (this.spaceName) {
      return urlPath.replace(new RegExp('^' + this.baseUrlPath.replace('/', '\/')), this.baseUrlPath + '/' + this.spaceName);
    } else {
      return urlPath;
    }
  }
}

function _eventDataToObject(events) {

  return events.map(e => {

    let event = _.clone(e);

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
function _checkEvents (events) {

  return events.every(event => {

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
      } catch(e) {
        return false;
      }
    }

    if (Object.keys(event.eventData).length === 0 ) {
      return false;
    }

    return true;

  });
}

function isTrue(val) {
  return /^(?:t(?:rue)?|yes?|1+)$/i.test(val);
}

//TODO: write test
function serialiseObject(obj) {

  return Object.keys(obj)
    .reduce((str, key) => {
      return `${str}${(str?'&':'')}${key}=${obj[key]}`
    }, '');
}

//TODO: write test
function addBodyOptions (jsonData, options) {

  if (typeof options == 'object') {
    Object.keys(options).forEach(key => {
      jsonData[key] = options[key];
    });
  }
}

function _prepareEvents(events) {

  return events.map(event => {

    let preparedEvent = _.clone(event);

    if (typeof event.eventData == 'object') {
      preparedEvent.eventData = JSON.stringify(preparedEvent.eventData);
    }

    return preparedEvent;
  });
}

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

  const auth = 'Basic ' + new Buffer(apiKey.id + ":" + apiKey.secret).toString("base64");

  let headers = {
    'Authorization' : auth
  };

  let postData;
  if (method == 'POST') {
    postData = JSON.stringify(jsonData);
    headers['Content-Type'] = 'application/json';
    headers['Content-Length'] = Buffer.byteLength(postData, 'utf8');
  }

  let options = {
    host: client.urlObj.hostname,
    port: client.urlObj.port,
    path,
    method,
    headers
  };

  if (client.httpKeepAlive) {
    options.agent = client.keepAliveAgent;
  }


  //console.log('request options:', options);

  let req = client.httpClient.request(options, res => {

    res.setEncoding('utf8');

    let responseData = '';

    res.on('data', chunk => {

      responseData += chunk;
    });

    res.on('end', () => {
      callback(null, res, responseData);
    })


  });

  req.on('error', err => {
    callback(err);
  });

  if (method == 'POST') {
    req.write(postData);
  }

  req.end();

  return req;
}