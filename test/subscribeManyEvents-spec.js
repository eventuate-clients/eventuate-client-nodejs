const should = require('should');
const util = require('util');
const helpers = require('./lib/helpers');

const esClient = helpers.createEsClient();

const subscriberId = 'subscribeManyEvents-test';

const entityChangedEvent = 'net.chrisrichardson.eventstore.example.MyEntityChanged';
const entityTypeName = `net.chrisrichardson.eventstore.example.MyEntity-${helpers.getUniqueID()}`;
const entityTypesAndEvents = {
  [entityTypeName]: [ entityChangedEvent ]
};

console.log('entityTypesAndEvents:', entityTypesAndEvents);
const eventsNumber = 500;
const timeout = 50000;

describe('Create entity with ' + eventsNumber + ' events and subscribe', function () {
  this.timeout(timeout);
  it('should create entity and subscribe for the events', function (done) {

    //create events
    var createEvents = helpers.makeEventsArr(eventsNumber, entityChangedEvent);

    esClient.create(entityTypeName, createEvents, function (err, createdEntityAndEventInfo) {

      if (err) {
        return done(err);
      }

      console.log('Entity created');

      helpers.expectCommandResult(createdEntityAndEventInfo);

      var processedMessagesNumber = 0;

      //subscribe for events
      var subscribe = esClient.subscribe(subscriberId, entityTypesAndEvents, function callback(err, receiptId) {
        if (err) {
          return done(err);
        }

        console.log('Subscription established')
      });

      helpers.expectSubscribe(subscribe);

      subscribe.observable.subscribe(
        function (event) {
          subscribe.acknowledge(event.ack);

          helpers.expectEvent(event);

          processedMessagesNumber++;

          if (processedMessagesNumber == eventsNumber) {
            done();
          }
        },
        function (err) {
          console.error(err);
          done(err);
        },
        function () {
          console.log('Completed');
          console.log('Processed messages: ', processedMessagesNumber);

          processedMessagesNumber.should.be.equal(eventsNumber, 'Processed messages number not equal to expected');
          done();
        }
      );
    });
  });
});
