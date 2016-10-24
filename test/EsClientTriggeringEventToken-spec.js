'use strict';
const expect = require('chai').expect;
const util = require('util');
const helpers = require('./lib/helpers');

const esClient = helpers.createEsClient();

const timeout = 25000;

const subscriberId = `subscriber-${helpers.getUniqueID()}`;

const entityTypeName = `net.chrisrichardson.eventstore.example.MyEntity-${helpers.getUniqueID()}`;

const entityTypesAndEvents = {
  [entityTypeName]: [
    'net.chrisrichardson.eventstore.example.MyEntityWasCreated',
    'net.chrisrichardson.eventstore.example.MyEntityNameChanged'
  ]
};

let entityVersion;

describe('Create entity, subscribe for event and update with triggeringEventToken', function () {
  this.timeout(timeout);

  it('should create and update one uniquely named entity and subscribe for events', done => {

    //create events
    const createEvents = [ { eventType:  'net.chrisrichardson.eventstore.example.MyEntityWasCreated', eventData: '{"name":"Fred"}' } ];

    esClient.create(entityTypeName, createEvents)
      .then(createdEntityAndEventInfo => {
        helpers.expectCommandResult(createdEntityAndEventInfo);
        done();
    })
    .catch(done);
  });

  it('should subscribe for events', done => {
    //subscribe for events
    const subscribe = esClient.subscribe(subscriberId, entityTypesAndEvents, err => {
      if (err) {
        return done(err)
      }
    });

    helpers.expectSubscribe(subscribe);

    subscribe.observable.subscribe(
      event => {

        subscribe.acknowledge(event.ack);
        helpers.expectEvent(event);

        let entityId = event.entityId;
        let triggeringEventToken = event.eventToken;

        console.log(entityTypeName, entityId);
        esClient.loadEvents(entityTypeName, entityId, { triggeringEventToken })
          .then(loadedEvents => {

            console.log(loadedEvents);

            helpers.expectLoadedEvents(loadedEvents);

            const entityVersion = loadedEvents[0].id;
            const updateEvents = [
              { eventType: 'net.chrisrichardson.eventstore.example.MyEntityNameChanged', eventData: '{"name":"George"}' }
            ];

            return esClient.update(entityTypeName, entityId, entityVersion, updateEvents)
          })
          .then(updatedEntityAndEventInfo => {
            helpers.expectCommandResult(updatedEntityAndEventInfo);
            console.log('updatedEntityAndEventInfo', updatedEntityAndEventInfo)
            done();
          })
          .catch(done);

      },
        err => {
        done(err);
      },
      () => {
        console.log('Completed');
        console.log('Processed messages: ', processedMessagesNumber);

        expect(processedMessagesNumber).to.equal(shouldBeProcessedNumber, 'Processed messages number not equal to expected');
        done();
      }
    );
  });
});