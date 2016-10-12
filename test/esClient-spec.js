'use strict';
const expect = require('chai').expect;
const helpers = require('./lib/helpers');
const uuid = require('uuid');

const esClient = helpers.createEsClient();

const entityTypeName = 'net.chrisrichardson.eventstore.example.MyEntity';
const eventTypeCreated = 'net.chrisrichardson.eventstore.example.MyEntityWasCreated';
const eventTypeUpdated = 'net.chrisrichardson.eventstore.example.MyEntityNameChanged';

const timeout = 30000;

describe('ES Node.js Client: function create()', function () {

  this.timeout(timeout);

  it('function create() should return entityAndEventInfo object', done => {

    const createEvents = [ { eventType: eventTypeCreated, eventData: { name: 'Fred' } } ];
    
    esClient.create(entityTypeName, createEvents, (err, createdEntityAndEventInfo) => {

      if (err) {
        return done(err);
      }

      helpers.expectCommandResult(createdEntityAndEventInfo, done);

      describe('ES Node.js Client: function update()', function () {
        this.timeout(timeout);

        it('function update() should update entity and return entityAndEventInfo object', done => {

          const entityIdTypeAndVersion = createdEntityAndEventInfo.entityIdTypeAndVersion;
          const entityId = entityIdTypeAndVersion.entityId;
          const entityVersion = createdEntityAndEventInfo.eventIds[0];
          const updateEvents = [
            { eventType: eventTypeUpdated, eventData: { name: 'George' } }
          ];

          esClient.update(entityTypeName, entityId, entityVersion, updateEvents, (err, updatedEntityAndEventInfo) => {

            if (err) {
              return done(err);
            }
            
            helpers.expectCommandResult(updatedEntityAndEventInfo, done);

            describe('ES Node.js Client: function loadEvents()', function () {

              it('should return loadedEvents array of EventIdTypeAndData', done => {

                const entityId = updatedEntityAndEventInfo.entityIdTypeAndVersion.entityId;

                esClient.loadEvents(entityTypeName, entityId, { a: 1, b: 2, c: 3 }, (err, loadedEvents) => {

                  if (err) {
                    return done(err);
                  }

                  helpers.expectLoadedEvents(loadedEvents);

                  const firstItem = loadedEvents[0];
                  const secondItem = loadedEvents[1];

                  //compare created with loaded
                  loadedEvents = helpers.removeEventsArrProperty(loadedEvents, 'id');

                  if (firstItem.eventType == eventTypeCreated && secondItem.eventType == eventTypeUpdated) {

                    expect(firstItem).to.deep.equal(createEvents[0], "The loadedEvents array does not contain create events.");
                    expect(secondItem).to.deep.equal(updateEvents[0], "The loadedEvents array does not contain update events.");
                    done();

                  } else if (firstItem.eventType == eventTypeUpdated && secondItem.eventType == eventTypeCreated) {

                    expect(secondItem).to.deep.equal(createEvents[0], "The loadedEvents array does not contain create events.");
                    expect(firstItem).to.deep.equal(updateEvents[0], "The loadedEvents array does not contain update events.");
                    done();

                  } else {
                    done(new Error('Got unexpected events'));
                  }


                });
              });
            });
          });
        });
      });
    });
  });
});

describe('ES Node.js Client: function create() custom entityId', function () {

  this.timeout(timeout);

  it('function create() should create new Entity with custom entityId and return entityAndEventInfo object', done => {
    const entityId = uuid.v1().replace(/-/g, '');

    const createEvents = [ { eventType: eventTypeCreated, eventData: { name: 'Bob' } } ];

    const options = { entityId };

    esClient.create(entityTypeName, createEvents, options, (err, createdEntityAndEventInfo) => {

      if (err) {
        return done(err);
      }

      helpers.expectCommandResult(createdEntityAndEventInfo);

      expect(createdEntityAndEventInfo.entityIdTypeAndVersion.entityId).to.equal(entityId);
      done();
    });
  })
});

describe('ES Node.js Client: function create() eventData contains unicode string', function () {

  this.timeout(timeout);

  it('function create() should return entityAndEventInfo object', done => {
    const entityId = uuid.v1().replace(/-/g, '');

    const createEvents = [ { eventType: eventTypeCreated, eventData: { name: 'Крис Ричардсон' } } ];

    const options = { entityId };

    esClient.create(entityTypeName, createEvents, options, (err, createdEntityAndEventInfo) => {

      if (err) {
        return done(err);
      }

      helpers.expectCommandResult(createdEntityAndEventInfo);

      expect(createdEntityAndEventInfo.entityIdTypeAndVersion.entityId).to.equal(entityId);
      done();
    });
  })
});
