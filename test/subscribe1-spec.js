/*
  This test creates and updates one uniquely named entity with one event and subscribes to it
*/

//import EsClient from '../src/modules/EsClient';
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
  spaceName: process.env.EVENTUATE_SPACE_NAME || false,
  debug: false
};

var esClient = new EsClient(esClientOpts);

var entityTypeName = 'net.chrisrichardson.eventstore.example.MyEntity-'  + helpers.getUniqueID();

var subscriberId = 'subscriber-' + helpers.getUniqueID();
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
        done(err);
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
          done(err);
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
        });

        subscribe.should.be.have.property('acknowledge');
        subscribe.acknowledge.should.be.a.Function;
        subscribe.should.be.have.property('observable');
        subscribe.observable.should.be.an.Object;

        subscribe.observable.subscribe(
          function (event) {

            processedMessagesNumber++;

            subscribe.acknowledge(event.ack);

            (typeof event.eventData).should.equal('object');

            if (processedMessagesNumber == shouldBeProcessedNumber) {
              done();
            }
          },
          function (err) {
            done(err);
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