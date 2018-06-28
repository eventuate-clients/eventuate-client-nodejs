/*
  This test creates and updates one uniquely named entity with one event and subscribes to it
*/
'use strict';
const helpers = require('./lib/helpers');

const eventuateClient = helpers.createEventuateClient();

const subscriberId = `subscriber-${helpers.getUniqueID()}`;

const entityTypeName = `net.chrisrichardson.eventstore.example.MyEntity-${helpers.getUniqueID()}`;

const entityTypesAndEvents = {
  [entityTypeName]: [
    'net.chrisrichardson.eventstore.example.MyEntityWasCreated',
    'net.chrisrichardson.eventstore.example.MyEntityNameChanged'
  ]
};


const shouldBeProcessedNumber = 2;
let eventIds = [];

describe('Create and update entity. Subscribe for 2 events', function () {
  this.timeout(25000);

  it('should create and update one uniquely named entity and subscribe for events', done => {

    //create events
    const createEvents = [ { eventType:  'net.chrisrichardson.eventstore.example.MyEntityWasCreated', eventData: '{"name":"Fred"}' } ];

    eventuateClient.create(entityTypeName, createEvents, (err, createdEntityAndEventInfo) => {
      if (err) {
        return done(err);
      }

      helpers.expectCommandResult(createdEntityAndEventInfo);

      eventIds = eventIds.concat(createdEntityAndEventInfo.eventIds);
      //update events
      const entityIdTypeAndVersion = createdEntityAndEventInfo.entityIdTypeAndVersion;
      const entityId = entityIdTypeAndVersion.entityId;
      const entityVersion = createdEntityAndEventInfo.eventIds[0];
      const updateEvents = [
        { eventType: 'net.chrisrichardson.eventstore.example.MyEntityNameChanged', eventData: '{"name":"George"}' }
      ];

      eventuateClient.update(entityTypeName, entityId, entityVersion, updateEvents, (err, updatedEntityAndEventInfo) => {
        if (err) {
          return done(err);
        }

        helpers.expectCommandResult(updatedEntityAndEventInfo);

        eventIds = eventIds.concat(updatedEntityAndEventInfo.eventIds);

        let processedMessagesNumber = 0;

        const eventHandler = (event) => {

          return new Promise((resolve, reject) => {

            console.log('event:' ,event);
            resolve(event.ack);

            helpers.expectEvent(event);

            if (eventIds.indexOf(event.eventId) >= 0 ) {
              processedMessagesNumber++;

              if (processedMessagesNumber === shouldBeProcessedNumber) {
                done();
              }
            } else {
              console.log('Old event');
            }
          });
        };
        //subscribe for events
        eventuateClient.subscribe(subscriberId, entityTypesAndEvents, eventHandler, err => {
          if (err) {
            return done(err)
          }

          console.log('The subscription has been established.')
        });
      });
    });
  });
});