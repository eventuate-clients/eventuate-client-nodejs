'use strict';

const expect = require('chai').expect;
const util = require('util');
const helpers = require('./lib/helpers');

const eventuateClient = helpers.createEventuateClient();

const subscriberId = 'subscribeManyEvents-test';

const entityChangedEvent = 'net.chrisrichardson.eventstore.example.MyEntityChanged';
const entityTypeName = `net.chrisrichardson.eventstore.example.MyEntity-${helpers.getUniqueID()}`;
const entityTypesAndEvents = {
  [entityTypeName]: [ entityChangedEvent ]
};

const eventsNumber = 500;
const timeout = 50000;

describe('Create entity with ' + eventsNumber + ' events and subscribe', function () {
  this.timeout(timeout);

  it('should create entity and subscribe for events', done => {

    //create events
    const createEvents = helpers.makeEventsArr(eventsNumber, entityChangedEvent);

    eventuateClient.create(entityTypeName, createEvents, (err, createdEntityAndEventInfo) => {

      if (err) {
        return done(err);
      }

      console.log('Entity created');

      helpers.expectCommandResult(createdEntityAndEventInfo);

      let processedMessagesNumber = 0;

      const eventHandler = (err, event, acknowledge) => {

        if(err) {
          done(err);
        }

        processedMessagesNumber++;

        acknowledge(event.ack);

        helpers.expectEvent(event);

        if (processedMessagesNumber == eventsNumber) {
          done();
        }

      };

      //subscribe for events
      const subscribe = eventuateClient.subscribe(subscriberId, entityTypesAndEvents, eventHandler, err => {
        if (err) {
          return done(err);
        }

        console.log('Subscription established')
      });
      
    });
  });
});
