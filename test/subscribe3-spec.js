/*
 Create two entities and subscribe for events using two subscribers.
 Each subscriber should receive only its own events.
 */

var es = require('../modules/es');
var should = require('should');
var util = require('util');
var helpers = require('./helpers');

var timeout = 25000;

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

var timeStamp = new Date().getTime();

var esClient = new es.Client(esClientOpts);

var subscriberId1 = 'subscriber-' + helpers.getUniqueID();

var entityTypeName1 = 'net.chrisrichardson.eventstore.example.MyEntity-' + helpers.getUniqueID();

var entityTypesAndEvents1 = {};
entityTypesAndEvents1[entityTypeName1] = [
  'net.chrisrichardson.eventstore.example.MyEntityWasCreated1'
];

var subscriberId2 = 'subscriber-' + helpers.getUniqueID();

var entityTypeName2 = 'net.chrisrichardson.eventstore.example.MyEntity-' + helpers.getUniqueID();

var entityTypesAndEvents2 = {};
entityTypesAndEvents2[entityTypeName2] = [
  'net.chrisrichardson.eventstore.example.MyEntityWasCreated2'
];

var createEvents1 = [
  { eventType:  'net.chrisrichardson.eventstore.example.MyEntityWasCreated1', eventData: '{"name":"Fred"}' },
  { eventType:  'net.chrisrichardson.eventstore.example.MyEntityWasCreated1', eventData: '{"name":"Bob"}' },
  { eventType:  'net.chrisrichardson.eventstore.example.MyEntityWasCreated1', eventData: '{"name":"Peter"}' }
];

var createEvents2 = [
  { eventType:  'net.chrisrichardson.eventstore.example.MyEntityWasCreated2', eventData: '{"name":"Fred"}' },
  { eventType:  'net.chrisrichardson.eventstore.example.MyEntityWasCreated2', eventData: '{"name":"Bob"}' },
  { eventType:  'net.chrisrichardson.eventstore.example.MyEntityWasCreated2', eventData: '{"name":"Peter"}' }
];

var shouldBeProcessedNumber = createEvents1.length;

describe('Create First Entity: ' + entityTypeName1, function () {

  this.timeout(timeout);

  it('should create First Entity: ' + entityTypeName1, function (done) {

    //create events
    esClient.create(entityTypeName1, createEvents1, function (err, createdEntityAndEventInfo) {
      if (err) {
        console.error(err);
        throw err;
      }

      helpers.expectCommandResult(createdEntityAndEventInfo, done);

      describe('Create Second Entity: ' + entityTypeName2, function () {

        this.timeout(timeout);

        it('should create Second Entity: ' + entityTypeName2, function (done) {

          //create events
          esClient.create(entityTypeName2, createEvents2, function (err, createdEntityAndEventInfo) {
            if (err) {
              console.error(err);
              throw err;
            }

            helpers.expectCommandResult(createdEntityAndEventInfo, done);

            describe('Subscribe ' + entityTypeName1, function () {

              this.timeout(timeout);

              it('should subscribe for ' + entityTypeName1 + 'events', function (done) {

                var processedMessagesNumber1 = 0;

                //subscribe for events
                var subscribe1 = esClient.subscribe(subscriberId1, entityTypesAndEvents1, function callback(err, receiptId) {
                  if (err) {
                    console.log(err);
                    throw err;
                  }
                });

                helpers.expectSubscribe(subscribe1);

                subscribe1.observable.subscribe(
                  function (event) {
                    processedMessagesNumber1++;

                    (typeof event.eventData).should.equal('object');

                    //console.log('Event'+processedMessagesNumber1+' subscribe1: ', event);

                    if (event.ack.receiptHandle.subscriberId != subscriberId1) {
                      done(new Error('Wrong subscriber: ' + event.ack.receiptHandle.subscriberId));
                    }

                    subscribe1.acknowledge(event.ack);

                    if (processedMessagesNumber1 == shouldBeProcessedNumber) {
                      done();
                    }
                  },
                  function (err) {
                    console.error(err);
                    throw err;
                  },
                  function () {
                    console.log('Completed');
                  }
                );
              });
            });//subscribe1

            describe('Subscribe ' + entityTypeName2, function () {

              this.timeout(timeout);

              it('should subscribe for ' + entityTypeName2 + 'events', function (done) {

                var processedMessagesNumber2 = 0;
                //subscribe for events
                var subscribe2 = esClient.subscribe(subscriberId2, entityTypesAndEvents2, function callback(err, receiptId) {
                  if (err) {
                    console.error(err);
                    throw err;
                  }

                });

                helpers.expectSubscribe(subscribe2);

                subscribe2.observable.subscribe(
                  function (event) {

                    processedMessagesNumber2++;

                    (typeof event.eventData).should.equal('object');

                    if (event.ack.receiptHandle.subscriberId != subscriberId2) {
                      done(new Error('Wrong subscriber: ' + event.ack.receiptHandle.subscriberId));
                    }

                    subscribe2.acknowledge(event.ack);
                    if (processedMessagesNumber2 == shouldBeProcessedNumber) {
                      done();
                    }
                  },
                  function (err) {
                    console.error(err);
                    throw err;
                  },
                  function () {
                    console.log('Completed');
                  }
                );
              });
            });//subscribe2

          });
        });
      });//create2
    });//create1
  });
});