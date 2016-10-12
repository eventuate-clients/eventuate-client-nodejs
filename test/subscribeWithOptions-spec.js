'use strict';
const expect = require('chai').expect;
const util = require('util');
const helpers = require('./lib/helpers');
const unEscapeStr = require('../dist/modules/specialChars').unEscapeStr;

const esClient = helpers.createEsClient();

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
    const subscribe = esClient.subscribe(subscriberId, entityTypesAndEvents, { durability: '100', readFrom: 'begin', progressNotifications: true }, err => {

      if (err) {
        console.log('subscribe callback error');
        console.error(err);
        done(err);
      }

      console.log('Subscribed');

      const destination = esClient.subscriptions[subscriberId].headers.destination;
      const destinationObj = JSON.parse(unEscapeStr(destination));

      expect(destinationObj).to.have.property('durability');
      expect(destinationObj).to.have.property('readFrom');
      expect(destinationObj).to.have.property('progressNotifications');

      done();

    });

    helpers.expectSubscribe(subscribe);

    subscribe.observable.subscribe();
  });
});
