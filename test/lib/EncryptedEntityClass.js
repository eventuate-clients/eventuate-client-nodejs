'use strict';

const { MyEncryptedEntityTypeName, MyEncryptedEntityCreateEvent, MyEncryptedEntityWasCreatedEvent, MyEncryptedEntityWasUpdatedEvent } = require('./eventConfig');

class EncryptedEntityClass {
  constructor() {
    this.entityTypeName = MyEncryptedEntityTypeName;
    this.timestamp = null;
  }

  applyMyEncryptedEntityCreateEvent(event) {
    console.log('applyMyEncryptedEntityCreateEvent()');
    const { eventData: { timestamp } } = event;
    this.timestamp = timestamp;
    return this;
  }

  applyMyEncryptedEntityWasCreatedEvent(event) {
    console.log('applyMyEncryptedEntityWasCreatedEvent()');
    const { eventData: { timestamp } } = event;
    this.timestamp = timestamp;
    return this;
  }

  applyMyEncryptedEntityWasUpdatedEvent(event) {
    console.log('applyMyEncryptedEntityWasUpdatedEvent()');
    const { eventData: { timestamp } } = event;
    this.timestamp = timestamp;
    return this;
  }

  applyEvent(event) {
    const eventType = event.eventType;
  
    switch(eventType) {
      default:
        break;
    }
  
    return this
  }

  processCreateEntityCommand(command) {
    return [
      {
        eventType: MyEncryptedEntityCreateEvent,
        eventData: {
          timestamp: command.createTimestamp
        }
      }
    ];
  }

  processCreatedEntityCommand(command) {
    return [
      {
        eventType: MyEncryptedEntityWasCreatedEvent,
        eventData: {
          timestamp: command.createdTimestamp
        }
      }
    ];
  }

  processUpdateEntityCommand(command) {
    return [
      {
        eventType: MyEncryptedEntityWasUpdatedEvent,
        eventData: {
          timestamp: command.updateTimestamp
        }
      }];
  }

  processFailureCommand(command) {
    throw new Error('Command failed')
  }

  processCommand(command) {}

  //commands
  static get CreatedEntityCommand() {
    return 'CreatedEntityCommand';
  }

  static get CreateEntityCommand() {
    return 'CreateEntityCommand';
  }

  static get UpdateEntityCommand() {
    return 'UpdateEntityCommand';
  }

  static get FailureCommand() {
    return 'FailureCommand';
  }
}

module.exports = EncryptedEntityClass;