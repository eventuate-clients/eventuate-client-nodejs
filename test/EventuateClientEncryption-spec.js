'use strict';
const expect = require('chai').expect;
const helpers = require('./lib/helpers');
const uuid = require('uuid');
const Encryption = require('../dist/modules/Encryption');

const encryptionKeyId = 'id';
const keySecret = 'secret';
class EncryptionStore {
  constructor(keys) {
    this.keys = keys;
  }

  get(encryptionKeyId) {
    return Promise.resolve(this.keys[encryptionKeyId]);
  }
}
const encryptionKeyStore = new EncryptionStore({ [encryptionKeyId]: keySecret });
const encryption = new Encryption(encryptionKeyStore);

const eventuateClient = helpers.createEventuateClient(encryption);

const entityTypeName = 'net.chrisrichardson.eventstore.example.MyEncryptedEntity';
const eventTypeCreated = 'net.chrisrichardson.eventstore.example.MyEncryptedEntityWasCreated';
const eventTypeUpdated = 'net.chrisrichardson.eventstore.example.MyEncryptedEntityNameChanged';

let entityId;
let entityVersion;
const createEvents = [ { eventType: eventTypeCreated, eventData: { name: 'Fred' } } ];
const updateEvents = [ { eventType: eventTypeUpdated, eventData: { name: 'George' } } ];

const timeout = 30000;

describe('ES Node.js Client: function create()', function () {

  this.timeout(timeout);
  it('function create() should return entityAndEventInfo object', done => {

    eventuateClient.create(entityTypeName, createEvents, { encryptionKeyId })
      .then(createdEntityAndEventInfo => {

        helpers.expectCommandResult(createdEntityAndEventInfo);

        entityId = createdEntityAndEventInfo.entityIdTypeAndVersion.entityId;
        entityVersion = createdEntityAndEventInfo.eventIds[0];
        done();
      })
      .catch(done);
  });

  it('function create() should return error', done => {

    eventuateClient.create('', [])
      .then()
      .catch(err => {
        expect(err).to.be.instanceof(Error);
        done();
      });
  });
});

describe('ES Node.js Client: function update()', function () {

  this.timeout(timeout);
  it('function update() should update entity and return entityAndEventInfo object', done => {

    expect(entityId).to.be.ok;
    expect(entityVersion).to.be.ok;

    eventuateClient.update(entityTypeName, entityId, entityVersion, updateEvents, { encryptionKeyId })
      .then(updatedEntityAndEventInfo => {
        helpers.expectCommandResult(updatedEntityAndEventInfo, done);
      })
      .catch(done);
  });

  it('function update() should return error', done => {

    eventuateClient.update('', [])
      .then()
      .catch(err => {
        expect(err).to.be.instanceof(Error);
        done();
      });
  });
});

describe('ES Node.js Client: function loadEvents()', function () {

  this.timeout(timeout);
  it('should return loadedEvents array of EventIdTypeAndData', done => {

    expect(entityId).to.be.ok;
    eventuateClient.loadEvents(entityTypeName, entityId)
      .then(loadedEvents => {
        console.log('loadedEvents:', loadedEvents);
        helpers.expectLoadedEvents(loadedEvents);
        helpers.testLoadedEvents(loadedEvents, createEvents, updateEvents);
        done();
      })
      .catch(done);
  });

  it('function loadEvents() should return error', done => {

    eventuateClient.loadEvents('', '')
      .then()
      .catch(err => {
        expect(err).to.be.instanceof(Error);
        done();
      });
  });

});

describe('ES Node.js Client: function create() custom entityId', function () {

  this.timeout(timeout);

  it('function create() should create new Entity with custom entityId and return entityAndEventInfo object', done => {

    const entityId = uuid.v1().replace(/-/g, '');
    const createEvents = [ { eventType: eventTypeCreated, eventData: { name: 'Bob' } } ];
    const options = { entityId, encryptionKeyId };

    eventuateClient.create(entityTypeName, createEvents, options)
      .then(createdEntityAndEventInfo => {

        helpers.expectCommandResult(createdEntityAndEventInfo);
        expect(createdEntityAndEventInfo.entityIdTypeAndVersion.entityId).to.equal(entityId);
        done();
      })
      .catch(done);
  });

});

describe('ES Node.js Client: function create() eventData contains unicode string', function () {

  this.timeout(timeout);

  it('function create() should return entityAndEventInfo object', done => {
    const entityId = uuid.v1().replace(/-/g, '');
    const createEvents = [ { eventType: eventTypeCreated, eventData: { name: 'Крис Ричардсон' } } ];
    const options = { entityId, encryptionKeyId };

    eventuateClient.create(entityTypeName, createEvents, options)
      .then(createdEntityAndEventInfo => {

        helpers.expectCommandResult(createdEntityAndEventInfo);
        expect(createdEntityAndEventInfo.entityIdTypeAndVersion.entityId).to.equal(entityId);
        done();
      })
      .catch(done);
  });
});
