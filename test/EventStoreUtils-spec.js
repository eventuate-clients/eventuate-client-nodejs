require('should');
var Promise = require('promise');
var helpers = require('./helpers');

var eventConfig = require('./eventConfig');
var entityTypeName = eventConfig.entityTypeName;
var MyEntityWasCreatedEvent = eventConfig.MyEntityWasCreatedEvent;
var MyEntityWasUpdatedEvent = eventConfig.MyEntityWasUpdatedEvent;

var entityTypesAndEvents = {};
entityTypesAndEvents[entityTypeName] = [
  MyEntityWasCreatedEvent,
  MyEntityWasUpdatedEvent
];


var EntityClass = require('./EntityClass');
var CreateEntityCommand = EntityClass.CreateEntityCommand;
var UpdateEntityCommand = EntityClass.UpdateEntityCommand;

var EventStoreUtils = require('../modules/EventStoreUtils.js');
var WorkflowEvents = require('../modules/WorkflowEvents.js');


var esUtil = new EventStoreUtils();

var timeout = 15000;

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


            describe('WorkflowEvents: function startWorkflow()', function () {

              this.timeout(timeout);

              it('test startWorkflow()', function (done) {

                var eventCnt = 0;
                var expectedEventCnt = 2;

                //Defube event handlers
                var eventHandlers = {};
                eventHandlers[MyEntityWasCreatedEvent] = handleMyEntityWasCreatedEvent;
                eventHandlers[MyEntityWasUpdatedEvent] = handleMyEntityWasUpdatedEvent;

                function handleMyEntityWasCreatedEvent(event) {

                  helpers.expectEvent(event);

                  if (event.eventData.timestamp == createTimestamp) {
                    eventCnt++;
                  }

                  if(eventCnt == expectedEventCnt) {
                    done();
                  }

                  return Promise.resolve();
                }

                function handleMyEntityWasUpdatedEvent(event) {

                  helpers.expectEvent(event);

                  if (event.eventData.timestamp == updateTimestamp) {
                    eventCnt++;
                  }

                  if(eventCnt == expectedEventCnt) {
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


          });
        });
      });
    });
  });

});


