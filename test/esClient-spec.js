var es = require('../modules/es');
var should = require('should');
var helpers = require('./helpers');
var uuid = require('uuid');

var apiKey = {
  id: process.env.EVENTUATE_API_KEY_ID,
  secret: process.env.EVENTUATE_API_KEY_SECRET
};

if (!apiKey.id || !apiKey.secret) {
  throw new Error("Use `EVENTUATE_API_KEY_ID` and `EVENTUATE_API_KEY_SECRET` to set auth data");
}

var esClientOpts = {
  apiKey: apiKey,
  spaceName: process.env.EVENTUATE_SPACE_NAME || false
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
        return done(err);
      }

      helpers.expectCommandResult(createdEntityAndEventInfo, done);

      describe('ES Node.js Client: function update()', function () {
        this.timeout(timeout);

        it('function update() should update entity and return entityAndEventInfo object', function (done) {

          var entityIdTypeAndVersion = createdEntityAndEventInfo.entityIdTypeAndVersion;
          var entityId = entityIdTypeAndVersion.entityId;
          var entityVersion = createdEntityAndEventInfo.eventIds[0];
          var updateEvents = [
            { eventType: eventTypeUpdated, eventData: { name: 'George' } }
          ];

          esClient.update(entityTypeName, entityId, entityVersion, updateEvents, function (err, updatedEntityAndEventInfo) {

            if (err) {
              return done(err);
            }
            
            helpers.expectCommandResult(updatedEntityAndEventInfo, done);

            describe('ES Node.js Client: function loadEvents()', function () {

              it('should return loadedEvents array of EventIdTypeAndData', function (done) {

                var entityId = updatedEntityAndEventInfo.entityIdTypeAndVersion.entityId;
                esClient.loadEvents(entityTypeName, entityId, { a: 1, b: 2, c: 3 }, function (err, loadedEvents) {

                  if (err) {
                    return done(err);
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

describe('ES Node.js Client: function create() custom entityId', function () {
  it('function create() should create new Entity with custom entityId return entityAndEventInfo object', function (done) {
    var entityId = uuid.v1().replace(/-/g, '');

    var createEvents = [ { eventType: eventTypeCreated, eventData: { name: 'Bob' } } ];

    var options = { entityId: entityId };
    esClient.create(entityTypeName, createEvents, options, function (err, createdEntityAndEventInfo) {

      if (err) {
        return done(err);
      }

      helpers.expectCommandResult(createdEntityAndEventInfo);

      createdEntityAndEventInfo.entityIdTypeAndVersion.entityId.should.equal(entityId);
      done();
    });
  })
});

describe('ES Node.js Client: function create() eventData contains unicode string', function () {
  it('function create() should return entityAndEventInfo object', function (done) {
    var entityId = uuid.v1().replace(/-/g, '');

    var createEvents = [ { eventType: eventTypeCreated, eventData: { name: 'Крис Ричардсон' } } ];

    var options = { entityId: entityId };
    esClient.create(entityTypeName, createEvents, options, function (err, createdEntityAndEventInfo) {

      if (err) {
        return done(err);
      }

      helpers.expectCommandResult(createdEntityAndEventInfo);

      createdEntityAndEventInfo.entityIdTypeAndVersion.entityId.should.equal(entityId);
      done();
    });
  })
});
