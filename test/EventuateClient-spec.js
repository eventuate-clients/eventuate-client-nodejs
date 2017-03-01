'use strict';
const expect = require('chai').expect;
const helpers = require('./lib/helpers');
const uuid = require('uuid');

const eventuateClient = helpers.createEventuateClient();

const entityTypeName = 'net.chrisrichardson.eventstore.example.MyEntity';
const eventTypeCreated = 'net.chrisrichardson.eventstore.example.MyEntityWasCreated';
const eventTypeUpdated = 'net.chrisrichardson.eventstore.example.MyEntityNameChanged';

let entityId;
let entityVersion;
const createEvents = [ { eventType: eventTypeCreated, eventData: { name: 'Fred' } } ];
const updateEvents = [ { eventType: eventTypeUpdated, eventData: { name: 'George' } } ];

const timeout = 30000;

describe('EventuateClient: function create()', function () {

  this.timeout(timeout);

  it('should return entityAndEventInfo object', done => {
    
    eventuateClient.create(entityTypeName, createEvents, (err, createdEntityAndEventInfo) => {

      if (err) {
        return done(err);
      }

      helpers.expectCommandResult(createdEntityAndEventInfo);

      entityId = createdEntityAndEventInfo.entityIdTypeAndVersion.entityId;
      entityVersion = createdEntityAndEventInfo.eventIds[0];

      done();
    })
  });

  it('should return error', done => {

    eventuateClient.create('', [], err => {

      expect(err).to.be.instanceof(Error);
      done();
    });
  });

});


describe('EventuateClient: function update()', function () {

  this.timeout(timeout);

  it('should update entity and return entityAndEventInfo object', done => {

    expect(entityId).to.be.ok;
    expect(entityVersion).to.be.ok;

    eventuateClient.update(entityTypeName, entityId, entityVersion, updateEvents, (err, updatedEntityAndEventInfo) => {

      if (err) {
        return done(err);
      }

      helpers.expectCommandResult(updatedEntityAndEventInfo, done);

    });
  });

  it('should return error', done => {

    eventuateClient.update('', '', '', [], err => {

      expect(err).to.be.instanceof(Error);
      done();
    });
  });
});


describe('EventuateClient: function loadEvents()', function () {

  this.timeout(timeout);

  it('should return loadedEvents array of EventIdTypeAndData', done => {

    expect(entityId).to.be.ok;

    eventuateClient.loadEvents(entityTypeName, entityId, (err, loadedEvents) => {

      if (err) {
        return done(err);
      }

      helpers.expectLoadedEvents(loadedEvents);
      helpers.testLoadedEvents(loadedEvents, createEvents, updateEvents);
      done();

    });
  });

  it('should return error', done => {

    eventuateClient.loadEvents('', '', err => {

      expect(err).to.be.instanceof(Error);
      done();
    });
  });

});

describe('EventuateClient: function create() custom entityId', function () {

  this.timeout(timeout);

  it('should create new Entity with custom entityId and return entityAndEventInfo object', done => {

    const entityId = uuid.v1().replace(/-/g, '');

    const createEvents = [ { eventType: eventTypeCreated, eventData: { name: 'Bob' } } ];

    const options = { entityId };

    eventuateClient.create(entityTypeName, createEvents, options, (err, createdEntityAndEventInfo) => {

      if (err) {
        return done(err);
      }

      helpers.expectCommandResult(createdEntityAndEventInfo);

      expect(createdEntityAndEventInfo.entityIdTypeAndVersion.entityId).to.equal(entityId);
      done();
    });
  });

});

describe('EventuateClient: function create() eventData contains unicode string', function () {

  this.timeout(timeout);

  it('should return entityAndEventInfo object', done => {
    const entityId = uuid.v1().replace(/-/g, '');

    const createEvents = [ { eventType: eventTypeCreated, eventData: { name: 'Крис Ричардсон' } } ];

    const options = { entityId };

    eventuateClient.create(entityTypeName, createEvents, options, (err, createdEntityAndEventInfo) => {

      if (err) {
        return done(err);
      }

      helpers.expectCommandResult(createdEntityAndEventInfo);

      expect(createdEntityAndEventInfo.entityIdTypeAndVersion.entityId).to.equal(entityId);
      done();
    });
  })
});
