//events
var eventConfig = require('./eventConfig');
var MyEntityWasCreatedEvent = eventConfig.MyEntityWasCreatedEvent;
var MyEntityWasUpdatedEvent = eventConfig.MyEntityWasUpdatedEvent;

var entityTypeName = eventConfig.entityTypeName;


//commands
var CreateEntityCommand = 'CreateEntity';
var UpdateEntityCommand = 'UpdateEntity';

var EntityClass = (function(){

  function EntityClass(){
    if (!(this instanceof  EntityClass)) {
      return new EntityClass();
    }
  }

  EntityClass.prototype.entityTypeName = entityTypeName;

  EntityClass.prototype.applyEvent = function (event) {
    var eventType = event.eventType;

    switch(eventType) {
      default:
        break;
    }

    return this
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