'use strict';
const parallel = require('mocha.parallel');
const expect = require('chai').expect;
const helpers = require('./lib/helpers');
const AggregateRepository = require('../dist').AggregateRepository;
const EventDispatcher = require('../dist').EventDispatcher;
const SubscriptionManager = require('../dist').SubscriptionManager;

const eventConfig = require('./lib/eventConfig');
const entityTypeName = eventConfig.entityTypeName;
const MyEntityCreateEvent = eventConfig.MyEntityCreateEvent;

const subscriberId = 'test-EventStoreUtilsWithTriggeringEventToken';


const EntityClass = require('./lib/EntityClass');
const CreateEntityCommand = EntityClass.CreateEntityCommand;
const CreatedEntityCommand = EntityClass.CreatedEntityCommand;

const eventuateClient = helpers.createEventuateClient();
const aggregateRepository = new AggregateRepository({ eventuateClient });

const timeout = 20000;

let entityId;
let triggeringEventToken;

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

          done();
        })
        .catch(done);
    }

    const eventHandlers = {
      [entityTypeName]: {
        [MyEntityCreateEvent]: handleMyEntityCreateEvent
      }
    };

    const dispatcher = new EventDispatcher({ eventHandlers });
    const subscriber = new SubscriptionManager({ eventuateClient, dispatcher });

    subscriber.subscribe({ subscriberId, eventHandlers });
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
