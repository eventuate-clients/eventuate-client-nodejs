var es = require('../modules/es');
var should = require('should');
var helpers = require('./helpers');

var apiKey = {
  id: process.env.EVENT_STORE_USER_ID,
  secret: process.env.EVENT_STORE_PASSWORD
};

if (!apiKey.id || !apiKey.secret) {
  throw new Error("", "Use `EVENT_STORE_USER_ID` and `EVENT_STORE_PASSWORD` to set auth data");
}

var esClientOpts = {
  url: process.env.EVENT_STORE_URL || "http://es.cersandbox.com:1998",
  stomp: {
    host: process.env.EVENT_STORE_STOMP_SERVER_HOST || "es.cersandbox.com",
    port: process.env.EVENT_STORE_STOMP_SERVER_PORT || 10001
  },
  apiKey: apiKey,
  httpKeepAlive: true,
  spaceName: 'esClientTest'
};

var esClient = new es.Client(esClientOpts);

var entityTypeName = 'net.chrisrichardson.eventstore.example.MyEntity';
var eventTypeCreated = 'net.chrisrichardson.eventstore.example.MyEntityWasCreated';
var eventTypeUpdated = 'net.chrisrichardson.eventstore.example.MyEntityNameChanged';

var timeout = 15000;

describe('ES Node.js Client: function create()', function () {

  this.timeout(timeout);

  it('function create() should return entityAndEventInfo object', function (done) {

    var createEvents = [ { eventType: eventTypeCreated, eventData: { name: 'Fred' } } ];


    esClient.create(entityTypeName, createEvents, function (err, createdEntityAndEventInfo) {

      if (err) {
        console.error(err);
        throw err;
      }

      helpers.expectCommandResult(createdEntityAndEventInfo, done);

      describe('ES Node.js Client: function update()', function () {
        this.timeout(timeout);

        it('function update() should entity and return entityAndEventInfo object', function (done) {

          var entityIdTypeAndVersion = createdEntityAndEventInfo.entityIdTypeAndVersion;
          var entityId = entityIdTypeAndVersion.entityId;
          var entityVersion = createdEntityAndEventInfo.eventIds[0];
          var updateEvents = [
            { eventType: eventTypeUpdated, eventData: { name: 'George' } }
          ];

          esClient.update(entityTypeName, entityId, entityVersion, updateEvents, function (err, updatedEntityAndEventInfo) {

            if (err) {
              throw err;
            }
            
            helpers.expectCommandResult(updatedEntityAndEventInfo, done);

            describe('ES Node.js Client: function loadEvents()', function () {

              it('should return loadedEvents array of EventIdTypeAndData', function (done) {

                var entityId = updatedEntityAndEventInfo.entityIdTypeAndVersion.entityId;
                esClient.loadEvents(entityTypeName, entityId, function (err, loadedEvents) {

                  if (err) {
                    throw err;
                  }


                  loadedEvents.should.be.an.Array;
                  loadedEvents.should.be.not.empty;


                  var firstItem = loadedEvents[0];
                  firstItem.should.be.an.Object;
                  firstItem.should.be.have.property('id');
                  firstItem.should.be.have.property('eventType');
                  firstItem.should.be.have.property('eventData');

                  var secondItem = loadedEvents[1];
                  secondItem.should.be.an.Object;
                  secondItem.should.be.have.property('id');
                  secondItem.should.be.have.property('eventType');
                  secondItem.should.be.have.property('eventData');

                  //compare created with loaded
                  loadedEvents = helpers.removeEventsArrProperty(loadedEvents, 'id');

                  if (firstItem.eventType == eventTypeCreated && secondItem.eventType == eventTypeUpdated) {
                    should.deepEqual(firstItem, createEvents[0], "The loadedEvents array does not contain create events.");
                    should.deepEqual(secondItem, updateEvents[0], "The loadedEvents array does not contain update events.");
                    done();
                  } else if (firstItem.eventType == eventTypeUpdated && secondItem.eventType == eventTypeCreated) {
                    should.deepEqual(secondItem, createEvents[0], "The loadedEvents array does not contain create events.");
                    should.deepEqual(firstItem, updateEvents[0], "The loadedEvents array does not contain update events.");
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
