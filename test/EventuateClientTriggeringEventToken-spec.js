'use strict';
const expect = require('chai').expect;
const util = require('util');
const helpers = require('./lib/helpers');
const EsServerError = require('../dist/modules/EventuateServerError');

const eventuateClient = helpers.createEventuateClient();

const timeout = 25000;

const subscriberId = `subscriber-${helpers.getUniqueID()}`;

const entityTypeName = `net.chrisrichardson.eventstore.example.MyEntity-${helpers.getUniqueID()}`;

const entityTypesAndEvents = {
  [entityTypeName]: [
    'net.chrisrichardson.eventstore.example.MyEntityWasCreated'
  ]
};

let entityVersion;
let triggeringEventToken;
let entityId;

describe('Create entity, subscribe for event and update with triggeringEventToken', function () {
  this.timeout(timeout);

  it('should create and update one uniquely named entity and subscribe for events', done => {

    //create events
    const createEvents = [ { eventType:  'net.chrisrichardson.eventstore.example.MyEntityWasCreated', eventData: '{"name":"Fred"}' } ];

    eventuateClient.create(entityTypeName, createEvents)
      .then(createdEntityAndEventInfo => {
        helpers.expectCommandResult(createdEntityAndEventInfo);
        done();
    })
    .catch(done);
  });

  it('should subscribe for events and update with triggeringEventToken', done => {
    //subscribe for events
    const subscribe = eventuateClient.subscribe(subscriberId, entityTypesAndEvents, err => {
      if (err) {
        return done(err)
      }
    });

    helpers.expectSubscribe(subscribe);

    subscribe.observable.subscribe(
      event => {

        subscribe.acknowledge(event.ack);
        helpers.expectEvent(event);

        entityId = event.entityId;
        triggeringEventToken = event.eventToken;

        eventuateClient.loadEvents(entityTypeName, entityId, { triggeringEventToken })
          .then(loadedEvents => {

            helpers.expectLoadedEvents(loadedEvents);

            const entityVersion = loadedEvents[loadedEvents.length - 1].id;
            const updateEvents = [
              { eventType: 'net.chrisrichardson.eventstore.example.MyEntityNameChanged', eventData: '{"name":"George"}' }
            ];

            return eventuateClient.update(entityTypeName, entityId, entityVersion, updateEvents, { triggeringEventToken })
          })
          .then(updatedEntityAndEventInfo => {
            console.log('updatedEntityAndEventInfo:', updatedEntityAndEventInfo);

            helpers.expectCommandResult(updatedEntityAndEventInfo);

            done();
          })
          .catch(done);

      },
      done,
      () => {
        console.log('Completed');
      }
    );
  });

  it('should got error 409', done => {
    expect(triggeringEventToken).to.be.ok;
    expect(entityId).to.be.ok;

    eventuateClient.loadEvents(entityTypeName, entityId, { triggeringEventToken })
      .then(loadedEvents => {

        helpers.expectLoadedEvents(loadedEvents);

        const entityVersion = loadedEvents[0].id;
        const updateEvents = [
          { eventType: 'net.chrisrichardson.eventstore.example.MyEntityNameChanged', eventData: '{"name":"Bob"}' }
        ];

        return eventuateClient.update(entityTypeName, entityId, entityVersion, updateEvents)
      })
      .then()
      .catch(err => {
        expect(err.statusCode).to.equal(409);
        done();

      });

  });
});