'use strict';

const expect = require('chai').expect;
const util = require('util');
const helpers = require('./lib/helpers');

const esClient = helpers.createEsClient();

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

    esClient.create(entityTypeName, createEvents, (err, createdEntityAndEventInfo) => {

      if (err) {
        return done(err);
      }

      console.log('Entity created');

      helpers.expectCommandResult(createdEntityAndEventInfo);

      let processedMessagesNumber = 0;

      //subscribe for events
      const subscribe = esClient.subscribe(subscriberId, entityTypesAndEvents, err => {
        if (err) {
          return done(err);
        }

        console.log('Subscription established')
      });

      helpers.expectSubscribe(subscribe);

      subscribe.observable.subscribe(
        event => {
          subscribe.acknowledge(event.ack);

          helpers.expectEvent(event);

          processedMessagesNumber++;

          if (processedMessagesNumber == eventsNumber) {
            done();
          }
        },
        err => {
          console.error(err);
          done(err);
        },
        () => {
          console.log('Completed');
          console.log('Processed messages: ', processedMessagesNumber);

          expect(processedMessagesNumber).to.equal(eventsNumber, 'Processed messages number not equal to expected');
          done();
        }
      );
    });
  });
});
