'use strict';
const expect = require('chai').expect;
const helpers = require('./lib/helpers');
const AggregateRepository = require('../dist').AggregateRepository;
const EventDispatcher = require('../dist').EventDispatcher;
const EventuateSubscriptionManager = require('../dist').EventuateSubscriptionManager;
const ExecutorClass = helpers.Executor;
const executor = new ExecutorClass();

const eventConfig = require('./lib/eventConfig');
const entityTypeName = eventConfig.entityTypeName;
const MyEntityCreateEvent = eventConfig.MyEntityCreateEvent;

const subscriberId = 'test-EventStoreUtilsWithTriggeringEventToken';


const EntityClass = require('./lib/EntityClass');
const CreateEntityCommand = EntityClass.CreateEntityCommand;
const CreatedEntityCommand = EntityClass.CreatedEntityCommand;

const eventuateClient = helpers.createEventuateClient();
const aggregateRepository = new AggregateRepository({ eventuateClient });
const subscriptionManager = new EventuateSubscriptionManager({ eventuateClient });

const timeout = 20000;

let entityId;
let triggeringEventToken;
let eventId;

describe('AggregateRepository with triggeringEventToken', function () {

  this.timeout(timeout);

  it(`should create ${MyEntityCreateEvent} event`, done => {

    const createTimestamp = new Date().getTime();
    const command = {
      commandType: CreateEntityCommand,
      createTimestamp
    };

    console.log('command', command);

    aggregateRepository.createEntity({ EntityClass, command })
      .then(createdEntityAndEventInfo => {

        helpers.expectCommandResult(createdEntityAndEventInfo);
        eventId = createdEntityAndEventInfo.eventIds[0];

        done();
      })
      .catch(err => {
        done(err);
      });
  });


  it('should subscribe for events and update', done => {

    function handleMyEntityCreateEvent(event) {

      helpers.expectEvent(event);

      entityId = event.entityId;
      triggeringEventToken = event.eventToken;
      const createdTimestamp = new Date().getTime();

      const command = {
        commandType: CreatedEntityCommand,
        createdTimestamp
      };

      const options = { triggeringEventToken };

      return aggregateRepository.updateEntity({ EntityClass, entityId, command, options })
        .then(result => {
          console.log('result:', result);
          helpers.expectCommandResult(result);

          if (event.eventId == eventId) {
            done();
          } else {
            console.log('Old event');
          }
        })
        .catch(done);
    }

    const eventHandlers = {
      [entityTypeName]: {
        [MyEntityCreateEvent]: handleMyEntityCreateEvent
      }
    };

    subscriptionManager.subscribe({ subscriberId, eventHandlers });
  });

  it('should update with old triggeredEventToken', done => {
    expect(triggeringEventToken).to.be.ok;
    expect(entityId).to.be.ok;

    const createdTimestamp = new Date().getTime();

    const command = {
      commandType: CreatedEntityCommand,
      createdTimestamp
    };

    const options = { triggeringEventToken };

    aggregateRepository.updateEntity({ EntityClass, entityId, command, options })
      .then(result => {
        helpers.expectCommandResult(result);

        done();
      })
      .catch(done);
  });
});
