import Agent, { HttpsAgent } from 'agentkeepalive';
import urlUtils from 'url';
import uuid from 'uuid';
import http from 'http';
import https from 'https';
import path from 'path';
import invariant from 'invariant';

import Stomp from './stomp/Stomp';
import AckOrderTracker from './stomp/AckOrderTracker';
import { escapeStr, unEscapeStr } from './specialChars';
import EventuateServerError from './EventuateServerError';
import { getLogger } from './logger';
import Result from './Result';
import { delay } from './utils';

const logger = getLogger({ title: 'EventuateClient' });

export default class EventuateClient {

  constructor({ apiKey, url, stompHost, stompPort, spaceName, httpKeepAlive, debug, maxRetryNumber, encryption }) {

    this.apiKey = apiKey;
    this.url = url;
    this.stompHost = stompHost;
    this.stompPort = stompPort;
    this.spaceName = spaceName;
    this.debug = debug;
    this.httpKeepAlive = httpKeepAlive;

    this.urlObj = urlUtils.parse(this.url);

    this.determineIfSecure();
    this.setupHttpClient();
    this.setupKeepAliveAgent(httpKeepAlive);

    this.baseUrlPath = '/entity';
    this.subscriptions = {};
    this.receipts = {};

    this.reconnectInterval = 500;
    this.reconnectIntervalStart = 500;

    this.stompClient = null;

    this.connectionCount = 0;
    this._connPromise = null;

    this.maxRetryNumber = maxRetryNumber;
    this.retryDelay = 1000;

    this.encryption = encryption;
  }

  determineIfSecure() {
    this.useHttps = (this.urlObj.protocol === 'https:');
  }

  setupHttpClient() {
    if (this.useHttps) {
      this.httpClient = https;
    } else {
      this.httpClient = http;
    }
  }

  setupKeepAliveAgent() {

    if (this.httpKeepAlive) {

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

  create(entityTypeName, _events, options = {}, callback) {
    return new Promise((resolve, reject) => {

      if (!callback && typeof options === 'function') {
        callback = options;
      }

      const result = new Result({ resolve, reject, callback });

      //check input params
      if (!entityTypeName || !this.checkEvents(_events)) {
        return result.failure(new Error('Incorrect input parameters for create()'));
      }

      const { encryptionKeyId, ...rest } = options;
      options = rest;

      let events = this.prepareEvents(_events);

      // Encrypt event data if needed
      this.encryptEvents(encryptionKeyId, events)
        .then(events => {
          const jsonData = { entityTypeName, events };
          this.addBodyOptions(jsonData, options);

          const urlPath = path.join(this.baseUrlPath, this.spaceName);
          const requestOptions = { path: urlPath, method: 'POST', apiKey: this.apiKey, jsonData, client: this };

          return this.attemptOperation({
            handler: this.httpRequest,
            arg: requestOptions,
            retryConditionFn,
            context: this
          });
        })
        .then(({ res: httpResponse, body: jsonBody }) => {

          const { entityId, entityVersion, eventIds } = jsonBody;

          if (!entityId || !entityVersion || !eventIds) {
            return result.failure({
              error: 'Bad server response',
              statusCode: httpResponse.statusCode,
              message: jsonBody
            });
          }

          result.success({
            entityIdTypeAndVersion: { entityId, entityVersion },
            eventIds
          });
        })
        .catch(err => {
          result.failure(err);
        });
    });
  }

  loadEvents(entityTypeName, entityId, options = {}, callback) {
    return new Promise((resolve, reject) => {
      if (!callback && typeof options === 'function') {
        callback = options;
      }

      const result = new Result({ resolve, reject, callback });

      //check input params
      if (!entityTypeName || !entityId) {
        return result.failure(new Error('Incorrect input parameters for loadEvents'));
      }

      let urlPath = path.join(this.baseUrlPath, this.spaceName, entityTypeName, entityId);
      if (options) {
        const urlParams = this.serialiseObject(options);
        if (urlParams) {
          urlPath += '?' + urlParams;
        }
      }

      const requestOptions = { path: urlPath, method: 'GET', apiKey: this.apiKey, client: this };

      this.attemptOperation({ handler: this.httpRequest, arg: requestOptions, retryConditionFn, context: this })
        .then(({ res: httpResponse, body: jsonBody }) => {

          let { events } = jsonBody;
          return this.decryptEvents(events);
        })
        .then(events => {
          result.success(this.eventDataToObject(events));
        })
        .catch(err => {
          result.failure(err);
        });

    });
  }

  update(entityTypeName, entityId, entityVersion, _events, options = {}, callback) {
    return new Promise((resolve, reject) => {

      if (!callback && typeof options === 'function') {
        callback = options;
      }

      const result = new Result({ resolve, reject, callback });

      //check input params
      if (!entityTypeName || !entityId || !entityVersion || !this.checkEvents(_events)) {
        return result.failure(new Error('Incorrect input parameters for update()'));
      }

      const { encryptionKeyId, ...rest } = options;
      options = rest;

      let events = this.prepareEvents(_events);

      // Encrypt event data if needed
      this.encryptEvents(encryptionKeyId, events)
        .then(events => {

          const jsonData = { entityId, entityVersion, events };
          this.addBodyOptions(jsonData, options);

          const urlPath = path.join(this.baseUrlPath, this.spaceName, entityTypeName, entityId);
          const requestOptions = { path: urlPath, method: 'POST', apiKey: this.apiKey, jsonData, client: this };

          return this.attemptOperation({
            handler: this.httpRequest,
            arg: requestOptions,
            retryConditionFn,
            context: this
          })
        })
        .then(({ res: httpResponse, body: jsonBody }) => {

          const { entityId, entityVersion, eventIds } = jsonBody;

          if (!entityId || !entityVersion || !eventIds) {
            return result.failure({
              error: 'Bad server response',
              statusCode: httpResponse.statusCode,
              message: jsonBody
            });
          }

          result.success({
            entityIdTypeAndVersion: { entityId, entityVersion },
            eventIds
          });
        })
        .catch(err => {
          result.failure(err);
        });
    });
  }

  httpRequest({ path, method, jsonData = null }) {

    return new Promise((resolve, reject) => {

      const apiKey = this.apiKey;
      const headers = {
        'Authorization': `Basic ${new Buffer(`${apiKey.id}:${apiKey.secret}`).toString('base64')}`
      };

      let postData;
      if (method === 'POST') {
        postData = JSON.stringify(jsonData);
        headers[ 'Content-Type' ] = 'application/json';
        headers[ 'Content-Length' ] = Buffer.byteLength(postData, 'utf8');
      }

      const options = {
        host: this.urlObj.hostname,
        port: this.urlObj.port,
        path,
        method,
        headers
      };

      if (this.httpKeepAlive) {
        options.agent = this.keepAliveAgent;
      }

      const req = this.httpClient.request(options, res => {

        res.setEncoding('utf8');

        let responseData = '';

        res.on('data', chunk => {

          responseData += chunk;
        });

        res.on('end', () => {

          if (/^application\/json/ig.test(res.headers[ 'content-type' ])) {

            try {
              responseData = JSON.parse(responseData);
            }
            catch (e) {
              console.error('JSON.parse failed for:', responseData);
              console.error('JSON.parse failed with error:', e);
              return reject(e);
            }
          }

          let err;
          if (err = statusCodeError(res.statusCode, responseData)) {
            return reject(err);
          }

          resolve({ res, body: responseData });
        })
      });

      req.on('error', err => {
        reject(err);
      });

      if (method === 'POST') {
        req.write(postData);
      }

      req.end();
    });
  }

  attemptOperation({ handler, arg, retryNumber = 1, retryConditionFn, context }) {

    return handler.call(context, arg)
      .catch(err => {

        logger.error('attemptOperation error:', err);
        logger.debug(`Retry ${retryNumber}`);

        if (typeof(retryConditionFn) === 'function') {

          if (retryNumber <= this.maxRetryNumber && retryConditionFn(err)) {

            return delay(this.retryDelay)
              .then(() => {
                return context.attemptOperation({
                  handler,
                  arg,
                  retryNumber: retryNumber + 1,
                  retryConditionFn,
                  context
                })
              })
          }
        }

        return Promise.reject(err);
      });
  }

  subscribe(subscriberId, entityTypesAndEvents, eventHandler, options, callback) {

    if (!callback) {
      callback = options;
      options = undefined;
    }

    if (!subscriberId || !Object.keys(entityTypesAndEvents).length || (typeof eventHandler !== 'function')) {
      return callback(new Error('Incorrect input parameters'));
    }

    if (this.subscriptions[ subscriberId ]) {
      return callback(new Error(`The subscriberId "${subscriberId}" already used! Try another subscriberId.`))
    }

    const messageCallback = this.createMessageCallback(eventHandler);

    this.connectToStompServer()
      .then(() => {
        this.addSubscription(subscriberId, entityTypesAndEvents, messageCallback, options, callback);
        this.doClientSubscribe(subscriberId);
      }, callback);
  }

  createMessageCallback(eventHandler) {

    const ackOrderTracker = new AckOrderTracker();

    const acknowledge = (ack) => {
      ackOrderTracker.ack(ack).forEach(this.stompClient.ack.bind(this.stompClient));
    };

    return (body, headers) => {

      ackOrderTracker.add(headers.ack);

      return body.map(async (eventStr) => {

        try {
          const parsedEvent = parseEvent(eventStr);
          const { eventData: eventDataStr } = parsedEvent;
          const decryptedEventData = await this.decrypt(eventDataStr);

          const eventData = parseEventDataWithSyntaxPeek(decryptedEventData);
          const event = Object.assign(parsedEvent, { eventData }, { ack: headers.ack });
          const eventResult = await eventHandler(event);
          acknowledge(eventResult);
        }
        catch (err) {
          if (err.code === 'EntityDeletedException') {
            acknowledge(headers.ack);
            return;
          } else {
            console.debug(`Event info for re-thrown exception. Event string: '${ eventStr }', exception:`, err)
          }

          throw err;
        }

      });
    }
  }

  addSubscription(subscriberId, entityTypesAndEvents, messageCallback, options, clientSubscribeCallback) {

    //add new subscription if not exists
    if (typeof this.subscriptions[ subscriberId ] === 'undefined') {
      this.subscriptions[ subscriberId ] = {};
    }

    const destinationObj = {
      entityTypesAndEvents,
      subscriberId
    };

    if (this.spaceName) {
      destinationObj.space = this.spaceName;
    }

    if (options) {
      destinationObj.durability = options.durability;
      destinationObj.readFrom = options.readFrom;
      destinationObj.progressNotifications = options.progressNotifications;
    }

    const destination = escapeStr(JSON.stringify(destinationObj));

    const uniqueId = uuid.v1().replace(new RegExp('-', 'g'), '');
    const id = `subscription-id-${uniqueId}`;
    const receipt = `receipt-id-${uniqueId}`;

    //add to receipts
    this.addReceipt(receipt, clientSubscribeCallback);

    this.subscriptions[ subscriberId ] = {
      subscriberId,
      entityTypesAndEvents,
      messageCallback,
      headers: {
        id,
        receipt,
        destination
      }
    };
  }

  connectToStompServer() {

    return this._connPromise || (this._connPromise = new Promise((resolve, reject) => {

      // Do not reconnect if self-invoked
      if (this.closed) {
        return reject();
      }

      const { stompPort: port, stompHost: host, useHttps: ssl, debug } = this;
      const { id: login, secret: passcode } = this.apiKey;
      const heartBeat = [ 5000, 5000 ];
      const timeout = 50000;
      const keepAlive = false;

      invariant(port && host && login && passcode && heartBeat && timeout, 'Incorrect STOMP connection parameters');
      const stompArgs = { port, host, login, passcode, heartBeat, timeout, keepAlive, ssl, debug };

      this.stompClient = new Stomp(stompArgs);
      this.stompClient.connect();

      this.addStompClientListeners(resolve);
    }));
  }

  addStompClientListeners(resolve) {
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

      const ack = JSON.parse(unEscapeStr(headers.ack));

      const subscriberId = ack.receiptHandle.subscriberId;

      if (this.subscriptions.hasOwnProperty(subscriberId)) {
        //call message callback;
        this.subscriptions[ subscriberId ].messageCallback(body, headers);
      } else {
        logger.error(`Can't find massageCallback for subscriber: ${subscriberId}`);
      }
    });

    this.stompClient.on('receipt', receiptId => {

      if (this.receipts.hasOwnProperty(receiptId)) {
        //call Client.subscribe callback
        this.receipts[ receiptId ].clientSubscribeCallback(null, receiptId);
      }
    });

    this.stompClient.on('error', error => {
      logger.error('stompClient ERROR');
      logger.error(error);
    });

  }

  reconnectStompServer(interval) {
    logger.info('\nReconnecting...');
    logger.info(interval);

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
                this.receipts[ receipt ].clientSubscribeCallback(error);
              }
            }

          }
        );
    }, interval);

  }

  addReceipt(receipt, clientSubscribeCallback) {

    if (typeof this.receipts[ receipt ] === 'undefined') {
      this.receipts[ receipt ] = {};
    }

    const receiptObj = this.receipts[ receipt ];

    receiptObj.clientSubscribeCallback = clientSubscribeCallback;
  }

  doClientSubscribe(subscriberId) {

    if (!this.subscriptions.hasOwnProperty(subscriberId)) {
      return logger.error(new Error(`Can't find subscription for subscriber ${subscriberId}`));
    }

    const subscription = this.subscriptions[ subscriberId ];

    this.stompClient.subscribe(subscription.headers);
  }

  disconnect() {

    logger.debug('disconnect()');

    this.closed = true;

    invariant(this._connPromise, 'Disconnect without connection promise spotted.');

    if (this.stompClient) {
      try {
        this.stompClient.disconnect();
      }
      catch (e) {
        logger.error(e);
      }
    }
  }

  async makeEvent(eventStr, ack) {

    const parsedEvent = JSON.parse(eventStr);
    const {
      id: eventId,
      eventType,
      entityId,
      entityType: entityTypeRaw,
      swimlane,
      eventToken,
      eventData: eventDataStr
    } = parsedEvent;

    const decryptedEventDataStr = await this.decrypt(eventDataStr);
    const eventData = JSON.parse(decryptedEventDataStr);
    const entityType = entityTypeRaw.split('/').pop();

    return {
      eventId,
      eventType,
      entityId,
      swimlane,
      eventData,
      eventToken,
      ack,
      entityType
    };
  }

  serialiseObject(obj) {

    if (typeof obj === 'object') {
      return Object.keys(obj)
        .map(key => {
          return `${key}=${obj[ key ]}`;
        })
        .join('&');
    }
  }

  addBodyOptions(jsonData, options) {

    if (typeof options === 'object') {
      Object.keys(options).reduce((jsonData, key) => {

        jsonData[ key ] = options[ key ];

        return jsonData;
      }, jsonData);
    }
  }

  prepareEvents(events) {

    return events.map(({ eventData, ...rest } = event) => {

      if (typeof eventData === 'object') {
        eventData = JSON.stringify(eventData);
      }

      return {
        ...rest,
        eventData
      };
    });
  }

  eventDataToObject(events) {

    return events.map(e => {

      const { eventData: eventDataStr, ...event } = e;

      if (typeof eventDataStr !== 'string') {
        return { ...e };
      }

      let eventData = {};
      try {
        eventData = JSON.parse(eventDataStr);
      }
      catch (err) {
        logger.error(`Cannot parse 'eventData' of an event: ${ JSON.stringify(e) }. `);
        logger.error(err);
      }

      return {
        ...event,
        eventData
      };
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
  checkEvents(events) {

    if (!Array.isArray(events) || !events.length) {
      return false;
    }

    return events.every(({ eventType, eventData }) => {

      if (!eventType || !eventData) {
        return false;
      }

      let ed;
      switch (typeof eventData) {
        case 'string':
          ed = eventData;
          //try to parse eventData
          try {
            ed = JSON.parse(ed);
          }
          catch (e) {
            return false;
          }
          break;
        case 'object':
          ed = Object.assign({}, eventData);
          break;
        default:
          return false;
      }

      // eventData object bears _some_ data results in true
      return Object.keys(ed).length !== 0;

    });
  }

  encryptEvents(encryptionKeyId, events) {
    return Promise.all(events.map(async ({ eventData, ...rest  }, idx) => {
      try {
        const encryptedEventData = await this.encrypt(encryptionKeyId, eventData);
        return {
          ...rest,
          eventData: encryptedEventData
        };
      } catch(err) {
        logger.error('encryptEvents error:', err);
        logger.debug('encryptEvents params:', { eventData, ...rest  }, idx);
        throw err;
      }
    }).filter(Boolean));
  }

  decryptEvents(events) {
    return Promise.all(events.map(async ({ eventData, ...rest  }) => {
      try {
        const decryptedEventData = await this.decrypt(eventData);
        return {
          ...rest,
          eventData: decryptedEventData
        };
      } catch (err) {
        logger.error('decryptEvents error:', err);
        logger.debug('decryptEvents params:', { eventData, ...rest  });
        return null;
      }
    }).filter(Boolean));
  }

  encrypt(encryptionKeyId, eventData) {
    if (encryptionKeyId && this.encryption) {
      return this.encryption.encrypt(encryptionKeyId, eventData);
    }
    return Promise.resolve(eventData);
  }

  async decrypt(eventDataStr) {
    if (this.encryption && this.encryption.isEncrypted(eventDataStr)) {
      return await this.encryption.decrypt(eventDataStr);
    }
    return eventDataStr;
  }
}

function parseEvent(eventStr) {
  const parsedEvent = JSON.parse(eventStr);
  const { id: eventId, eventType, entityId, entityType, swimlane, eventToken, eventData } = parsedEvent;

  return {
    eventId,
    eventType,
    entityId,
    swimlane,
    eventData,
    eventToken,
    entityType: entityType.split('/').pop()
  };
}

function statusCodeError(statusCode, message) {

  if (statusCode === 200) {
    return;
  }

  return new EventuateServerError({
    error: `Server returned status code ${statusCode}`,
    statusCode,
    message
  });
}

function retryConditionFn(err) {
  if (err.statusCode === 503) {
    return true;
  }
}

function parseEventDataWithSyntaxPeek(input) {
  try {
    return JSON.parse(input);
  }
  catch (ex) {
    if (`${ ex }`.indexOf('SyntaxError') >= 0) {
      logger.warn(`JSON.parse() received this malformed decryptedEventData string: '${ input }'.`)
    }
    throw ex;
  }
}

