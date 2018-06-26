'use strict';

const expect = require('chai').expect;
const EventuateClient = require('../../dist').default;
const uuid = require('uuid');
const crypto = require('crypto');
const specialChars = require('../../dist/modules/specialChars');
const EventuateClientConfiguration = require('../../dist').EventuateClientConfiguration;

module.exports.removeEventsArrProperty = (eventsArr, propertyName) => {
  return eventsArr.map(item => {
    if (typeof (item[propertyName]) !== 'undefined') {
      delete (item[propertyName]);
    }
    return item;
  });
};

module.exports.expectCommandResult = (entityAndEventInfo, done) => {
  expect(entityAndEventInfo).to.be.an('Object');
  expect(entityAndEventInfo).to.have.property('entityIdTypeAndVersion');

  const entityIdTypeAndVersion = entityAndEventInfo.entityIdTypeAndVersion;
  expect(entityIdTypeAndVersion).to.be.an('Object');
  expect(entityIdTypeAndVersion).to.have.property('entityId');
  expect(entityIdTypeAndVersion).to.have.property('entityVersion');

  expect(entityAndEventInfo).to.have.property('eventIds');
  expect(entityAndEventInfo.eventIds).to.be.an('Array');
  expect(entityAndEventInfo.eventIds).to.be.not.empty;

  if (typeof(done) === 'function') {
    done();
  }
};

module.exports.expectSubscribe = (subscribe, done) => {
  expect(subscribe).to.have.property('acknowledge');
  expect(subscribe.acknowledge).to.be.a('Function');
  expect(subscribe).to.have.property('observable');
  expect(subscribe.observable).to.be.an('Object');

  if (typeof(done) === 'function') {
    done();
  }
};

module.exports.expectEvent = (event, done) => {
  expect(event).to.be.an('Object');

  expect(event).to.have.property('eventId');
  expect(event.eventId).to.be.a('String');
  expect(event.eventId).to.be.not.empty;

  expect(event).to.have.property('entityId');
  expect(event.entityId).to.be.a('String');
  expect(event.entityId).to.be.not.empty;

  expect(event).to.have.property('eventType');
  expect(event.eventType).to.be.a('String');
  expect(event.eventType).to.be.not.empty;

  expect(event).to.have.property('ack');
  expect(event.ack).to.be.a('String');
  expect(event.ack).to.be.not.empty;

  expect(event).to.have.property('eventData');
  expect(event.eventData).to.be.an('Object');
  expect(event.eventData).to.be.not.empty;

  expect(event).to.have.property('eventToken');
  expect(event.eventToken).to.be.an('String');
  expect(event.eventToken).to.be.not.empty;

  if (typeof(done) === 'function') {
    done();
  }
};

module.exports.expectLoadedEvents = (loadedEvents, done) => {
  expect(loadedEvents).to.be.an('Array');
  expect(loadedEvents).to.be.not.empty;

  loadedEvents.forEach(event => {
    expect(event).to.be.an('Object');
    expect(event).to.have.property('id');
    expect(event).to.have.property('eventType');
    expect(event).to.have.property('eventData');
  });

  if (typeof(done) === 'function') {
    done();
  }
};

module.exports.getUniqueID = () => {
  return uuid.v1().replace(new RegExp('-', 'g'), '');
};

module.exports.expectParsedFrame = frame => {
  expect(frame).to.be.an('Object');
  expect(frame).to.have.property('command');
  expect(frame).to.have.property('headers');
  expect(frame).to.have.property('body');
};

module.exports.parseAck = (event, done) => {
  try {
    return JSON.parse(specialChars.unEscapeStr(event.ack));
  } catch (error) {
    done(error);
  }
};

module.exports.createEventuateClient = (encryption) => {
  const eventuateClientOpts = new EventuateClientConfiguration({ debug: false, encryption });
  return new EventuateClient(eventuateClientOpts);
};

module.exports.makeEventsArr = ({ size, entityType, eventType, swimlane }) => {
  if (typeof swimlane === 'undefined') {
    swimlane = 1;
  }

  return Array
    .apply(null, new Array(size))
    .map((val, index) => {
      return {
        entityType,
        eventType,
        swimlane,
        eventData: `{ "index": "${index}" }`,
        ack: index
      };
    })
};

module.exports.testLoadedEvents = (loadedEvents, createEvents, updateEvents) => {
  loadedEvents = module.exports.removeEventsArrProperty(loadedEvents, 'id');

  const firstItem = loadedEvents[0];
  const secondItem = loadedEvents[1];

  //compare created with loaded
  expect(firstItem).to.deep.equal(createEvents[0]);
  expect(secondItem).to.deep.equal(updateEvents[0]);
};

class Executor {
  getClassName() {
    return Executor.name;
  }
}

module.exports.Executor = Executor;

class HandlersManager {
  constructor(options) {
    this.done = options.done;
    this.doneCalled = false;
  }

  setHandlers(handlersArr) {
    const iterable = handlersArr.map(handlerName => {
      return [ handlerName, false ];
    });

    this.handlers = new Map(iterable);
  }

  setCompleted(handlerName) {
    console.log(`setCompleted for "${handlerName}"`);
    this.handlers.set(handlerName, true);
    this.doneIfAllCompleted()
  }

  doneIfAllCompleted() {
    const values = this.handlers.values();

    for(let completed of values) {

      if (!completed) {
        return;
      }
    }

    if (!this.doneCalled){
      this.doneCalled = true;
      this.done();
    }
  }
}

module.exports.HandlersManager = HandlersManager;

module.exports.createEventHandler = (callback) => {
  return (event) => {

    return new Promise((resolve) => {

      resolve(event);//Acknowledge event
      module.exports.expectEvent(event);
      callback(event);
    });
  }
};

module.exports.expectEntityDeletedError = (error) => {
  expect(error).to.be.instanceOf(Error);
  expect(error).to.haveOwnProperty('code');
  expect(error.code).to.equal('EntityDeletedException');
};
