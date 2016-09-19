var EsClient = require('../dist');
var should = require('should');
var util = require('util');
var helpers = require('./helpers');


var apiKey = {
  id: process.env.EVENTUATE_API_KEY_ID,
  secret: process.env.EVENTUATE_API_KEY_SECRET
};

if (!apiKey.id || !apiKey.secret) {
  throw new Error("Use `EVENTUATE_API_KEY_ID` and `EVENTUATE_API_KEY_SECRET` to set auth data");
}

var esClientOpts = {
  apiKey: apiKey,
  spaceName: process.env.EVENTUATE_SPACE_NAME || false
};

var esClient = new EsClient(esClientOpts);

var entityTypeName = 'net.chrisrichardson.eventstore.example.MyEntity';

var subscriberId = 'subscribe-test-4';

var entityTypesAndEvents = {};
var entityChangedEvent = 'net.chrisrichardson.eventstore.example.MyEntityChanged';
entityTypesAndEvents[entityTypeName] = [ entityChangedEvent ];


var eventsNumber = 1000;
var timeout = 25000;

describe('Create entity with ' + eventsNumber + ' events and subscribe', function () {
  this.timeout(timeout);
  it('should create entity and subscribe for the events', function (done) {

    //create events
    var createEvents = fillEventsArr(eventsNumber, entityChangedEvent);

    esClient.create(entityTypeName, createEvents, function (err, createdEntityAndEventInfo) {

      if (err) {
        console.error(err);
        done(err);
      }

      helpers.expectCommandResult(createdEntityAndEventInfo);

      var processedMessagesNumber = 0;

      //subscribe for events
      var subscribe = esClient.subscribe(subscriberId, entityTypesAndEvents, function callback(err, receiptId) {
        if (err) {
          console.log('subscribe callback error');
          console.error(err);
          done(err);
        }
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

function fillEventsArr(size, eventType) {
  return Array
    .apply(null, new Array(size))
    .map((val, index) => {
      return {
        eventType: eventType,
        eventData: '{ "index": "' + index +'" }'
      };
    })
}