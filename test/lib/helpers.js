var uuid = require('uuid');
var should = require('should');
var specialChars = require('../../dist/modules/specialChars');

exports.removeEventsArrProperty = function (eventsArr, propertyName) {
  return eventsArr.map(function (item) {
    if (typeof (item[propertyName]) != 'undefined') {
      delete (item[propertyName]);
    }
    return item;
  });
};

exports.expectCommandResult = function (entityAndEventInfo, done) {
  entityAndEventInfo.should.an.Object;
  entityAndEventInfo.should.be.have.property('entityIdTypeAndVersion');

  var entityIdTypeAndVersion = entityAndEventInfo.entityIdTypeAndVersion;
  entityIdTypeAndVersion.should.an.Object;
  entityIdTypeAndVersion.should.be.have.property('entityId');
  entityIdTypeAndVersion.should.be.have.property('entityVersion');

  entityAndEventInfo.should.be.have.property('eventIds');
  entityAndEventInfo.eventIds.should.be.an.Array;
  entityAndEventInfo.eventIds.should.be.not.empty;

  if (typeof(done) == 'function') {
    done();
  }

};

exports.expectSubscribe = function (subscribe, done) {

  subscribe.should.be.have.property('acknowledge');
  subscribe.acknowledge.should.be.a.Function;
  subscribe.should.be.have.property('observable');
  subscribe.observable.should.be.an.Object;

  if (typeof(done) == 'function') {
    done();
  }

};

exports.expectEvent = function (event, done) {

  event.should.be.an.Object;

  event.should.be.have.property('eventId');
  event.eventId.should.be.a.String;
  event.eventId.should.be.not.empty;

  event.should.be.have.property('entityId');
  event.entityId.should.be.a.String;
  event.eventId.should.be.not.empty;

  event.should.be.have.property('eventType');
  event.eventType.should.be.a.String;
  event.eventId.should.be.not.empty;

  event.should.be.have.property('ack');
  event.ack.should.be.an.Object;
  event.eventId.should.be.not.empty;

  event.should.be.have.property('eventData');
  event.eventData.should.be.an.Object;
  event.eventId.should.be.not.empty;

  if (typeof(done) == 'function') {
    done();
  }
};

exports.expectLoadedEvents = function (loadedEvents, done) {
  loadedEvents.should.be.an.Array;
  loadedEvents.should.be.not.empty;

  loadedEvents.forEach(function (event) {
    event.should.be.an.Object;
    event.should.be.have.property('id');
    event.should.be.have.property('eventType');
    event.should.be.have.property('eventData');
  });

  if (typeof(done) == 'function') {
    done();
  }
};

exports.getUniqueID = function () {

  return uuid.v1().replace(new RegExp('-', 'g'), '');
};

exports.expectParsedFrame = function (frame) {

  frame.should.have.property('command');
  frame.should.have.property('headers');
  frame.should.have.property('body');
};

exports.parseAck = function (event, done) {
  try {
    return JSON.parse(specialChars.unEscapeStr(event.ack));
  } catch (error) {
    done(error);
  }
};
