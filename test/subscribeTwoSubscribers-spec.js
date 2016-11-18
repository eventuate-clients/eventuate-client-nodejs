/*
 Create two entities and subscribe for events using two subscribers.
 Each subscriber should receive only its own events.
 */

'use strict';

const expect = require('chai').expect;
const util = require('util');
const helpers = require('./lib/helpers');

const esClient = helpers.createEsClient();

const timeout = 25000;
const timeStamp = new Date().getTime();

const subscriberId1 = `subscriber-${helpers.getUniqueID()}`;
const entityTypeName1 = `net.chrisrichardson.eventstore.example.MyEntity-${helpers.getUniqueID()}`;

const entityTypesAndEvents1 = {
  [entityTypeName1]: [
    'net.chrisrichardson.eventstore.example.MyEntityWasCreated1'
  ]
};


const subscriberId2 = `subscriber-${helpers.getUniqueID()}`;
const entityTypeName2 = `net.chrisrichardson.eventstore.example.MyEntity-${helpers.getUniqueID()}`;

const entityTypesAndEvents2 = {
  [entityTypeName2]: [
    'net.chrisrichardson.eventstore.example.MyEntityWasCreated2'
  ]
};


const createEvents1 = [
  { eventType:  'net.chrisrichardson.eventstore.example.MyEntityWasCreated1', eventData: '{"name":"Fred"}' },
  { eventType:  'net.chrisrichardson.eventstore.example.MyEntityWasCreated1', eventData: '{"name":"Bob"}' },
  { eventType:  'net.chrisrichardson.eventstore.example.MyEntityWasCreated1', eventData: '{"name":"Peter"}' }
];

const createEvents2 = [
  { eventType:  'net.chrisrichardson.eventstore.example.MyEntityWasCreated2', eventData: '{"name":"Fred"}' },
  { eventType:  'net.chrisrichardson.eventstore.example.MyEntityWasCreated2', eventData: '{"name":"Bob"}' },
  { eventType:  'net.chrisrichardson.eventstore.example.MyEntityWasCreated2', eventData: '{"name":"Peter"}' }
];

const shouldBeProcessedNumber = createEvents1.length;

describe(`Create First Entity: ${entityTypeName1}`, function () {

  this.timeout(timeout);

  it(`should create First Entity: ${entityTypeName1}`, done => {

    //create events
    esClient.create(entityTypeName1, createEvents1, (err, createdEntityAndEventInfo) => {
      if (err) {
        return done(err);
      }

      helpers.expectCommandResult(createdEntityAndEventInfo, done);

      describe(`Create Second Entity: ${entityTypeName2}`, function () {

        this.timeout(timeout);

        it(`should create Second Entity: ${entityTypeName2}`, done => {

          //create events
          esClient.create(entityTypeName2, createEvents2, (err, createdEntityAndEventInfo) => {
            if (err) {
              return done(err);
            }

            helpers.expectCommandResult(createdEntityAndEventInfo, done);

            describe(`Subscribe ${entityTypeName1}`, function () {

              this.timeout(timeout);

              it(`should subscribe for ${entityTypeName1} events`, done => {

                let processedMessagesNumber1 = 0;

                //subscribe for events
                const subscribe1 = esClient.subscribe(subscriberId1, entityTypesAndEvents1, err => {
                  if (err) {
                    return done(err);
                  }
                });

                helpers.expectSubscribe(subscribe1);

                subscribe1.observable.subscribe(
                  event => {
                    processedMessagesNumber1++;

                    expect(event.eventData).to.be.an('Object');

                    //console.log('Event'+processedMessagesNumber1+' subscribe1: ', event);

                    const ack = helpers.parseAck(event, done);

                    if (ack.receiptHandle.subscriberId != subscriberId1) {
                      return done(new Error(`Wrong subscriber: ${ack.receiptHandle.subscriberId}`));
                    }

                    subscribe1.acknowledge(event.ack);

                    if (processedMessagesNumber1 == shouldBeProcessedNumber) {
                      done();
                    }
                  },
                  err => {
                    return done(err);
                  },
                  () => {
                    console.log('Completed');
                  }
                );
              });
            });//subscribe1

            describe(`Subscribe ${entityTypeName2}`, function () {

              this.timeout(timeout);

              it(`should subscribe for ${entityTypeName2} events`, done => {

                let processedMessagesNumber2 = 0;
                //subscribe for events
                const subscribe2 = esClient.subscribe(subscriberId2, entityTypesAndEvents2, err => {
                  if (err) {
                    return done(err);
                  }

                });

                helpers.expectSubscribe(subscribe2);

                subscribe2.observable.subscribe(
                  event => {

                    processedMessagesNumber2++;

                    expect(event.eventData).to.be.an('Object');

                    const ack = helpers.parseAck(event, done);

                    if (ack.receiptHandle.subscriberId != subscriberId2) {
                      return done(new Error('Wrong subscriber: ' + ack.receiptHandle.subscriberId));
                    }

                    subscribe2.acknowledge(event.ack);
                    if (processedMessagesNumber2 == shouldBeProcessedNumber) {
                      done();
                    }
                  },
                  err => {
                    return done(err);
                  },
                  () => {
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