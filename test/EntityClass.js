//events
var eventConfig = require('./eventConfig');
var MyEntityWasCreatedEvent = eventConfig.MyEntityWasCreatedEvent;
var MyEntityWasUpdatedEvent = eventConfig.MyEntityWasUpdatedEvent;

var entityTypeName = eventConfig.entityTypeName;


//commands
var CreateEntityCommand = 'CreateEntityCommand';
var UpdateEntityCommand = 'UpdateEntityCommand';

var EntityClass = (function(){

  function EntityClass(){
    if (!(this instanceof  EntityClass)) {
      return new EntityClass();
    }
  }

  EntityClass.prototype.entityTypeName = entityTypeName;

  EntityClass.prototype.applyMyEntityWasCreatedEvent = function (event) {
    console.log('applyMyEntityWasCreatedEvent()');
    return this;
  };

  EntityClass.prototype.applyMyEntityWasUpdatedEvent = function (event) {
    console.log('applyMyEntityWasUpdatedEvent()');
    return this;
  };


  EntityClass.prototype.applyEvent = function (event) {
    var eventType = event.eventType;

    switch(eventType) {
      default:
        break;
    }

    return this
  };

  EntityClass.prototype.processCreateEntityCommand = function (command) {
    return [
      {
        eventType: MyEntityWasCreatedEvent,
        eventData: {
          timestamp: command.createTimestamp
        }
      }
    ];
  };

  EntityClass.prototype.processUpdateEntityCommand = function (command) {
    return [
      {
        eventType: MyEntityWasUpdatedEvent,
        eventData: {
          timestamp: command.updateTimestamp
        }
      }];
  };

  EntityClass.prototype.processCommand = function (command) {

    switch(command.commandType) {
      case CreateEntityCommand:

        return [
          {
            eventType: MyEntityWasCreatedEvent,
            eventData: {
              timestamp: command.createTimestamp
            }
          }
        ];
        break;

      case UpdateEntityCommand:

        return [
          {
            eventType: MyEntityWasUpdatedEvent,
            eventData: {
              timestamp: command.updateTimestamp
            }
          }];
        break;

      default:
        break;
    }
  };

  return EntityClass;

})();


module.exports = EntityClass;

//export commands
module.exports.CreateEntityCommand = CreateEntityCommand;
module.exports.UpdateEntityCommand = UpdateEntityCommand;