'use strict';

//events
const eventConfig = require('./eventConfig'); 
const MyEntityCreateEvent = eventConfig.MyEntityCreateEvent;
const MyEntityWasCreatedEvent = eventConfig.MyEntityWasCreatedEvent;
const MyEntityWasUpdatedEvent = eventConfig.MyEntityWasUpdatedEvent;

const entityTypeName = eventConfig.entityTypeName;



class EntityClass {
  
  constructor() {
    this.entityTypeName = entityTypeName;
    this.timestamp = null;
  }

  applyMyEntityCreateEvent(event) {
    console.log('applyMyEntityCreateEvent()');
    const { eventData: { timestamp } } = event;
    this.timestamp = timestamp;
    return this;
  }

  applyMyEntityWasCreatedEvent(event) {
    console.log('applyMyEntityWasCreatedEvent()');
    const { eventData: { timestamp } } = event;
    this.timestamp = timestamp;
    return this;
  }

  applyMyEntityWasUpdatedEvent(event) {
    console.log('applyMyEntityWasUpdatedEvent()');
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
        eventType: MyEntityCreateEvent,
        eventData: {
          timestamp: command.createTimestamp
        }
      }
    ];
  }


  processCreatedEntityCommand(command) {
    return [
      {
        eventType: MyEntityWasCreatedEvent,
        eventData: {
          timestamp: command.createdTimestamp
        }
      }
    ];
  }

  processUpdateEntityCommand(command) {
    return [
      {
        eventType: MyEntityWasUpdatedEvent,
        eventData: {
          timestamp: command.updateTimestamp
        }
      }];
  }

  processCommand(command) {


  }



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
}


module.exports = EntityClass;