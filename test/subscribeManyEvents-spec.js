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
let eventIds;

describe('Create entity with ' + eventsNumber + ' events and subscribe', function () {
  this.timeout(timeout);

  it('should create entity and subscribe for events', done => {

    //create events
    const createEvents = helpers.makeEventsArr({ size: eventsNumber, entityType: entityTypeName, eventType: entityChangedEvent });

    eventuateClient.create(entityTypeName, createEvents, (err, createdEntityAndEventInfo) => {

      if (err) {
        return done(err);
      }

      console.log('Entity created');

      helpers.expectCommandResult(createdEntityAndEventInfo);

      eventIds = createdEntityAndEventInfo.eventIds;

      let processedMessagesNumber = 0;

      const eventHandler = (event) => {

        return new Promise((resolve, reject) => {
          resolve(event.ack);
          helpers.expectEvent(event);

          if (eventIds.indexOf(event.eventId) >= 0) {
            processedMessagesNumber++;

            if (processedMessagesNumber == eventsNumber) {
              done();
            }
          }
        })
      };

      //subscribe for events
      eventuateClient.subscribe(subscriberId, entityTypesAndEvents, eventHandler, err => {
        if (err) {
          return done(err);
        }

        console.log('Subscription established')
      });
    });
  });
});
