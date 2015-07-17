/*
  This test creates and updates one uniquely named entity with one event and subscribes to it
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
  throw new Error("", "Use `EVENT_STORE_USER_ID` and `EVENT_STORE_PASSWORD` to set auth data");
}

var esClientOpts = {
  url: process.env.EVENT_STORE_URL || "http://es.cersandbox.com:1998",
  stomp: {
    host: process.env.EVENT_STORE_STOMP_SERVER_HOST || "es.cersandbox.com",
    port: process.env.EVENT_STORE_STOMP_SERVER_PORT || 10001
  },
  apiKey: apiKey,
  httpKeepAlive: process.env.HTTP_KEEP_ALIVE || false,
  spaceName: process.env.EVENT_STORE_SPACE_NAME || false
};
var esClient = new es.Client(esClientOpts);

var entityTypeName = 'net.chrisrichardson.eventstore.example.MyEntity'  + new Date().getTime();

var timeStamp = new Date().getTime();

var subscriberId = 'subscriber' + timeStamp;
var entityTypesAndEvents = {};
entityTypesAndEvents[entityTypeName] = [
  'net.chrisrichardson.eventstore.example.MyEntityWasCreated',
  'net.chrisrichardson.eventstore.example.MyEntityNameChanged'
];

var shouldBeProcessedNumber = 2;

describe('Create and update entity. Subscribe for 2 events', function () {
  this.timeout(25000);
  it('should create and update one uniquely named entity and subscribe for the events', function (done) {

    //create events
    var createEvents = [ { eventType:  'net.chrisrichardson.eventstore.example.MyEntityWasCreated', eventData: '{"name":"Fred"}' } ];
    esClient.create(entityTypeName, createEvents, function (err, createdEntityAndEventInfo) {
      if (err) {
        console.error(err);
        throw err;
      }

      helpers.expectCommandResult(createdEntityAndEventInfo);

      //update events
      var entityIdTypeAndVersion = createdEntityAndEventInfo.entityIdTypeAndVersion;
      var entityId = entityIdTypeAndVersion.entityId;
      var entityVersion = createdEntityAndEventInfo.eventIds[0];
      var updateEvents = [
        { eventType: 'net.chrisrichardson.eventstore.example.MyEntityNameChanged', eventData: '{"name":"George"}' }
      ];

      esClient.update(entityTypeName, entityId, entityVersion, updateEvents, function (err, updatedEntityAndEventInfo) {
        if (err) {
          throw err;
        }

        helpers.expectCommandResult(updatedEntityAndEventInfo);

        var processedMessagesNumber = 0;

        //subscribe for events
        var subscribe = esClient.subscribe(subscriberId, entityTypesAndEvents, function callback(err, receiptId) {
          if (err) {
            console.log('subscribe callback error');
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
            console.log(err);
            throw err;
          },
          function () {
            console.log('Completed');
            console.log('Processed messages: ', processedMessagesNumber);

            processedMessagesNumber.should.be.equal(shouldBeProcessedNumber, 'Processed messages number not equal to expected');
            done();
          }
        );
      });
    });
  });
});