var should = require('should');

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