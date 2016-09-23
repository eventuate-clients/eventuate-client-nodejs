require('should');
var Promise = require('promise');
var helpers = require('./lib/helpers');

var eventConfig = require('./lib/eventConfig');
var entityTypeName = eventConfig.entityTypeName;
var MyEntityWasCreatedEvent = eventConfig.MyEntityWasCreatedEvent;
var MyEntityWasUpdatedEvent = eventConfig.MyEntityWasUpdatedEvent;

var entityTypesAndEvents = {};
entityTypesAndEvents[entityTypeName] = [
  MyEntityWasCreatedEvent,
  MyEntityWasUpdatedEvent
];


var EntityClass = require('./lib/EntityClass');
var CreateEntityCommand = EntityClass.CreateEntityCommand;
var UpdateEntityCommand = EntityClass.UpdateEntityCommand;

//var EventStoreUtils = require('../src/modules/EventStoreUtils.js');
var EventStoreUtils = require('../dist').EventStoreUtils;
var WorkflowEvents = require('../dist').WorkflowEvents;


var esUtil = new EventStoreUtils();

var timeout = 20000;

var createTimestamp;
var updateTimestamp;


describe('EventStoreUtils: function createEntity()', function () {

  this.timeout(timeout);

  it('function createEntity() should return entityAndEventInfo object', function (done) {

    createTimestamp = new Date().getTime();
    var command = {
      commandType: CreateEntityCommand,
      createTimestamp: createTimestamp
    };

    esUtil.createEntity(EntityClass, command, function (err, createdEntityAndEventInfo) {

      if (err) {
        console.error(err);
        throw err;
      }

      helpers.expectCommandResult(createdEntityAndEventInfo, done);

      describe('EventStoreUtils.js: function updateEntity()', function () {
        this.timeout(timeout);

        it('function updateEntity() should update entity and return entityAndEventInfo object', function (done) {

          var entityId = createdEntityAndEventInfo.entityIdTypeAndVersion.entityId;

          updateTimestamp = new Date().getTime();
          var command = {
            commandType: UpdateEntityCommand,
            updateTimestamp: updateTimestamp
          };

          esUtil.updateEntity(EntityClass, entityId, command, function (err, updatedEntityAndEventInfo) {

            if (err) {
              throw err;
            }

            helpers.expectCommandResult(updatedEntityAndEventInfo, done);

            describe('EventStoreUtils.js: function loadEvents()', function () {
              this.timeout(timeout);

              it('function loadEvents() should load events', function (done) {

                var entity = new EntityClass();

                esUtil.loadEvents(entity.entityTypeName, entityId, function (err, loadedEvents) {

                  if (err) {
                    done(err);
                    return;
                  }

                  helpers.expectLoadedEvents(loadedEvents);

                  loadedEvents.length.should.be.equal(2);
                  loadedEvents[0].eventData.timestamp.should.be.equal(createTimestamp);
                  loadedEvents[1].eventData.timestamp.should.be.equal(updateTimestamp);

                  done();



                  describe('WorkflowEvents: function startWorkflow()', function () {

                    this.timeout(timeout);

                    it('test startWorkflow()', function (done) {

                      var eventCount = 0;
                      var expectedEventCount = 2;

                      //Define event handlers
                      var eventHandlers = {};
                      eventHandlers[MyEntityWasCreatedEvent] = handleMyEntityWasCreatedEvent;
                      eventHandlers[MyEntityWasUpdatedEvent] = handleMyEntityWasUpdatedEvent;

                      function handleMyEntityWasCreatedEvent(event) {

                        helpers.expectEvent(event);

                        if (event.eventData.timestamp == createTimestamp) {
                          eventCount++;
                        }

                        return Promise.resolve();
                      }

                      function handleMyEntityWasUpdatedEvent(event) {

                        helpers.expectEvent(event);

                        if (event.eventData.timestamp == updateTimestamp) {
                          eventCount++;
                        }

                        if(eventCount == expectedEventCount) {
                          done();
                        }

                        return Promise.resolve();
                      }

                      function getEventHandler (eventType) {
                        if (typeof eventHandlers[eventType] != 'undefined') {
                          return eventHandlers[eventType]
                        }
                      }

                      //Define subscriptions
                      var subscriptions = [
                        {
                          subscriberId: 'test-EventStoreUtils',
                          entityTypesAndEvents: entityTypesAndEvents
                        }
                      ];

                      //Create WorkflowEvents instance
                      var workflow = new WorkflowEvents({ subscriptions: subscriptions, getEventHandler: getEventHandler });

                      //Run workflow
                      workflow.startWorkflow();

                    });

                  });


                  describe('Test getApplyMethod() method', function () {

                    it('should return a function', function () {

                      loadedEvents.forEach(function (event) {

                        var type = event.eventType.split('.').pop();
                        var applyMethod = esUtil.getApplyMethod(entity, type);

                        applyMethod.should.be.a.function;
                      });

                      //check default applyEvent() method
                      var type = 'UnknownEventType';
                      var applyMethod = esUtil.getApplyMethod(entity, type);
                      applyMethod.should.be.a.function;
                    });

                  });


                  describe('Test getProcessCommandMethod() method', function () {

                    it('should return a function', function () {

                      var processCommandMethod = esUtil.getProcessCommandMethod(entity, CreateEntityCommand);
                      processCommandMethod.should.be.a.function;

                      processCommandMethod = esUtil.getProcessCommandMethod(entity, UpdateEntityCommand);
                      processCommandMethod.should.be.a.function;

                      //check default processCommand() method
                      processCommandMethod = esUtil.getProcessCommandMethod(entity, 'unknownCommand');
                      processCommandMethod.should.be.a.function;
                    });

                  });

                });




              });

            });




          });
        });
      });
    });
  });

});


