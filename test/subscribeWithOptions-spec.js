'use strict';

const EsClient = require('../dist');
const should = require('should');
const util = require('util');
const helpers = require('./lib/helpers');
const unescape = require('../dist/modules/specialChars').unescape;


const apiKey = {
  id: process.env.EVENTUATE_API_KEY_ID,
  secret: process.env.EVENTUATE_API_KEY_SECRET
};

if (!apiKey.id || !apiKey.secret) {
  throw new Error("Use `EVENTUATE_API_KEY_ID` and `EVENTUATE_API_KEY_SECRET` to set auth data");
}

const esClientOpts = {
  apiKey: apiKey,
  spaceName: process.env.EVENTUATE_SPACE_NAME || false,
  debug: false
};

const esClient = new EsClient(esClientOpts);

const subscriberId = 'subscribe-test-5';

const entityTypeName = 'net.chrisrichardson.eventstore.example.MyEntity5';
const entityChangedEvent = 'net.chrisrichardson.eventstore.example.MyEntityChanged';

const entityTypesAndEvents = {
  [entityTypeName]: [ entityChangedEvent ]
};

const timeout = 25000;

describe('Subscribe with options', function () {
  this.timeout(timeout);

  it('should subscribe for events', done => {

   //subscribe for events
    const subscribe = esClient.subscribe(subscriberId, entityTypesAndEvents, { durability: '100', readFrom: 'begin', progressNotifications: true }, (err, receiptId) => {

      if (err) {
        console.log('subscribe callback error');
        console.error(err);
        done(err);
      }

      console.log('Subscribed');

      const destination = esClient.subscriptions[subscriberId].headers.destination;
      const destinationObj = JSON.parse(unescape(destination));

      destinationObj.should.be.have.property('durability');
      destinationObj.should.be.have.property('readFrom');
      destinationObj.should.be.have.property('progressNotifications');

      done();

    });

    helpers.expectSubscribe(subscribe);

    subscribe.observable.subscribe();
  });
});
