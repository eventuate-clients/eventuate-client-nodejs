/*
 This test creates uniquely named entity with many events and subscribes to them
*/

var es = require('../modules/es');
var should = require('should');
var util = require('util');
var helpers = require('./helpers');

var apiKey = {
  id: process.env.EVENT_STORE_USER_ID,
  secret: process.env.EVENT_STORE_PASSWORD
};

if (!apiKey.id || !apiKey.secret) {
  throw new Error("Use `EVENT_STORE_USER_ID` and `EVENT_STORE_PASSWORD` to set auth data");
}

var esClientOpts = {
  url: process.env.EVENT_STORE_URL,
  stomp: {
    host: process.env.EVENT_STORE_STOMP_SERVER_HOST,
    port: process.env.EVENT_STORE_STOMP_SERVER_PORT
  },
  apiKey: apiKey,
  spaceName: process.env.EVENT_STORE_SPACE_NAME || false
};

var esClient = new es.Client(esClientOpts);
var timeStamp = new Date().getTime();

var subscriberId = 'subscriber' + timeStamp;

var entityTypeName = 'net.chrisrichardson.eventstore.example.MyEntity' + timeStamp;

var entityTypesAndEvents = {};
entityTypesAndEvents[entityTypeName] = [
  'net.chrisrichardson.eventstore.example.MyEntityWasCreated'
];

var createEvents = [
  { eventType:  'net.chrisrichardson.eventstore.example.MyEntityWasCreated', eventData: '{"name":"Fred"}' },
  { eventType:  'net.chrisrichardson.eventstore.example.MyEntityWasCreated', eventData: '{"name":"Bob"}' },
  { eventType:  'net.chrisrichardson.eventstore.example.MyEntityWasCreated', eventData: '{"name":"Peter"}' },
  { eventType:  'net.chrisrichardson.eventstore.example.MyEntityWasCreated', eventData: '{"name":"James"}' },
  { eventType:  'net.chrisrichardson.eventstore.example.MyEntityWasCreated', eventData: '{"name":"John"}' },
  { eventType:  'net.chrisrichardson.eventstore.example.MyEntityWasCreated', eventData: '{"name":"Robert"}' },
  { eventType:  'net.chrisrichardson.eventstore.example.MyEntityWasCreated', eventData: '{"name":"Michael"}' },
  { eventType:  'net.chrisrichardson.eventstore.example.MyEntityWasCreated', eventData: '{"name":"William"}' },
  { eventType:  'net.chrisrichardson.eventstore.example.MyEntityWasCreated', eventData: '{"name":"David"}' },
  { eventType:  'net.chrisrichardson.eventstore.example.MyEntityWasCreated', eventData: '{"name":"Richard"}' },
  { eventType:  'net.chrisrichardson.eventstore.example.MyEntityWasCreated', eventData: '{"name":"Fred1"}' },
  { eventType:  'net.chrisrichardson.eventstore.example.MyEntityWasCreated', eventData: '{"name":"Bob1"}' },
  { eventType:  'net.chrisrichardson.eventstore.example.MyEntityWasCreated', eventData: '{"name":"Peter1"}' },
  { eventType:  'net.chrisrichardson.eventstore.example.MyEntityWasCreated', eventData: '{"name":"James1"}' },
  { eventType:  'net.chrisrichardson.eventstore.example.MyEntityWasCreated', eventData: '{"name":"John1"}' },
  { eventType:  'net.chrisrichardson.eventstore.example.MyEntityWasCreated', eventData: '{"name":"Robert1"}' },
  { eventType:  'net.chrisrichardson.eventstore.example.MyEntityWasCreated', eventData: '{"name":"Michael1"}' },
  { eventType:  'net.chrisrichardson.eventstore.example.MyEntityWasCreated', eventData: '{"name":"William1"}' },
  { eventType:  'net.chrisrichardson.eventstore.example.MyEntityWasCreated', eventData: '{"name":"David1"}' },
  { eventType:  'net.chrisrichardson.eventstore.example.MyEntityWasCreated', eventData: '{"name":"Richard1"}' }
];

var shouldBeProcessedNumber = createEvents.length;

var timeout = 25000;

describe('Create ' + createEvents.length + ' events and subscribe for them', function () {

  this.timeout(timeout);

  it('should create entity with ' + shouldBeProcessedNumber + ' events and subscribe for the events', function (done) {

    //create events
    esClient.create(entityTypeName, createEvents, function (err, createdEntityAndEventInfo) {
      if (err) {
        console.error(err);
        throw err;
      }

      helpers.expectCommandResult(createdEntityAndEventInfo);

      var processedMessagesNumber = 0;

      //subscribe for events
      var subscribe = esClient.subscribe(subscriberId, entityTypesAndEvents, function callback(err, receiptId) {
        if (err) {
          console.log(err);
          throw err;
        }
        console.log('The subscription has been established');
        console.log('receipt-id:', receiptId, '\n');
      });

      subscribe.should.be.have.property('acknowledge');
      subscribe.acknowledge.should.be.a.Function;
      subscribe.should.be.have.property('observable');
      subscribe.observable.should.be.an.Object;

      subscribe.observable.subscribe(
        function (event) {
          processedMessagesNumber++;

          subscribe.acknowledge(event.ack);
          if (processedMessagesNumber == shouldBeProcessedNumber) {
            done();
          }
        },
        function (err) {
          console.error(err);
          throw err;
        },
        function () {
          console.log('Completed');
          done();
        }
      );
    });
  });
});