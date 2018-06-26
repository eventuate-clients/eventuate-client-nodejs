'use strict';
const util = require('util');
const helpers = require('./lib/helpers');
const Encryption = require('../dist/modules/Encryption');

const encryptionKeyId = 'id';
const keySecret = '6c16456771d0766bcb4db4ff13a003c7fbe904d64d6b80c42982625795d47ee9';

class EncryptionStore {
  constructor(keys) {
    this.keys = keys;
  }

  get(encryptionKeyId) {
    return Promise.resolve(this.keys[encryptionKeyId]);
  }

  removeKey(encryptionKeyId) {
    delete this.keys[encryptionKeyId];
    return Promise.resolve();
  }
}

const encryptionKeyStore = new EncryptionStore({ [encryptionKeyId]: keySecret });
const encryption = new Encryption(encryptionKeyStore);

const eventuateClient = helpers.createEventuateClient(encryption);
const subscriberId1 = `subscriber-${helpers.getUniqueID()}`;
const entityTypeName = `net.chrisrichardson.eventstore.example.MyEntity-${helpers.getUniqueID()}`;
const entityTypesAndEvents = {
  [entityTypeName]: [
    'net.chrisrichardson.eventstore.example.MyEntityWasCreated',
    'net.chrisrichardson.eventstore.example.MyEntityNameChanged'
  ]
};
const createEvents = [ { eventType:  'net.chrisrichardson.eventstore.example.MyEntityWasCreated', eventData: '{"name":"Fred"}' } ];
const shouldBeProcessedNumber = 2;
let eventIds = [];

describe('Create and update entity. Subscribe for 2 events', function () {
  this.timeout(25000);

  it('should create and update one uniquely named entity and subscribe for events', done => {
    //create events

    eventuateClient.create(entityTypeName, createEvents, { encryptionKeyId }, (err, createdEntityAndEventInfo) => {
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

      eventuateClient.update(entityTypeName, entityId, entityVersion, updateEvents, { encryptionKeyId }, (err, updatedEntityAndEventInfo) => {
        if (err) {
          return done(err);
        }

        helpers.expectCommandResult(updatedEntityAndEventInfo);
        eventIds = eventIds.concat(updatedEntityAndEventInfo.eventIds);
        let processedMessagesNumber = 0;

        const eventHandler = (event) => {
          return new Promise((resolve, reject) => {
            if (err) {
              return done(err);
            }
            console.log('Event handler event:' ,event);

            helpers.expectEvent(event);
            resolve(event.ack);

            if (eventIds.indexOf(event.eventId) >= 0) {
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
        eventuateClient.subscribe(subscriberId1, entityTypesAndEvents, eventHandler, err => {
          if (err) {
            return done(err)
          }

          console.log('The subscription has been established.')
        });
      });
    });
  });
});

describe('Encryption when key not exists', () => {
  before(done => {
    encryptionKeyStore.removeKey(encryptionKeyId)
      .then(done)
      .catch(done);
  });

  it('should try to create() and get EntityDeleted error', done => {
    eventuateClient.create(entityTypeName, createEvents, { encryptionKeyId })
      .then(() => {
        done(new Error('Should get error'));
      })
      .catch(error => {
        helpers.expectEntityDeletedError(error);
        done();
      });
  });

  it('should subscribe and get EntityDeleted error', done => {
    const eventHandler = (event) => {
      done(new Error('Should not receive event'));
      return Promise.resolve(event.ack);
    };

    const subscriberId2 = `subscriber-${helpers.getUniqueID()}`;
    eventuateClient.subscribe(subscriberId2, entityTypesAndEvents, eventHandler, err => {
      if (err) {
        return done(err);
      }
      console.log('The subscription has been established.');

      setTimeout(done, 2000);
    });
  });
});

