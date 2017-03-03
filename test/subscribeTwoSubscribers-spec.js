/*
 Create two entities and subscribe for events using two subscribers.
 Each subscriber should receive only its own events.
 */

'use strict';

const expect = require('chai').expect;
const util = require('util');
const helpers = require('./lib/helpers');

const eventuateClient = helpers.createEventuateClient();

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
let createdEventIds1;
let createdEventIds2;

describe(`Create First Entity: ${entityTypeName1}`, function () {

  this.timeout(timeout);

  it(`should create First Entity: ${entityTypeName1}`, done => {

    //create events
    eventuateClient.create(entityTypeName1, createEvents1, (err, createdEntityAndEventInfo) => {
      if (err) {
        return done(err);
      }

      helpers.expectCommandResult(createdEntityAndEventInfo, done);

      createdEventIds1 = createdEntityAndEventInfo.eventIds;

      describe(`Create Second Entity: ${entityTypeName2}`, function () {

        this.timeout(timeout);

        it(`should create Second Entity: ${entityTypeName2}`, done => {

          //create events
          eventuateClient.create(entityTypeName2, createEvents2, (err, createdEntityAndEventInfo) => {
            if (err) {
              return done(err);
            }

            helpers.expectCommandResult(createdEntityAndEventInfo, done);

            createdEventIds2 = createdEntityAndEventInfo.eventIds;

            describe(`Subscribe ${entityTypeName1}`, function () {

              this.timeout(timeout);

              it(`should subscribe for ${entityTypeName1} events`, done => {

                let processedMessagesNumber1 = 0;

                const eventHandler1 = (event) => {

                  return new Promise((resolve, reject) => {

                    resolve(event.ack);

                    helpers.expectEvent(event);

                    const ack = helpers.parseAck(event, done);

                    if (ack.receiptHandle.subscriberId != subscriberId1) {
                      return done(new Error(`Wrong subscriber: ${ack.receiptHandle.subscriberId}`));
                    }

                    if (createdEventIds1.indexOf(event.eventId) >=0) {
                      processedMessagesNumber1++;

                      if (processedMessagesNumber1 == shouldBeProcessedNumber) {
                        done();
                      }
                    } else {
                      console.log('Old event');
                    }
                  });
                };
                //subscribe for events
                eventuateClient.subscribe(subscriberId1, entityTypesAndEvents1, eventHandler1, err => {
                  if (err) {
                    return done(err);
                  }
                });

              });
            });//subscribe1

            describe(`Subscribe ${entityTypeName2}`, function () {

              this.timeout(timeout);

              it(`should subscribe for ${entityTypeName2} events`, done => {

                let processedMessagesNumber2 = 0;

                const eventHandler2 = (event) => {

                  return new Promise((resolve, reject) => {

                    resolve(event.ack);

                    helpers.expectEvent(event);

                    const ack = helpers.parseAck(event, done);

                    if (ack.receiptHandle.subscriberId != subscriberId2) {
                      return done(new Error('Wrong subscriber: ' + ack.receiptHandle.subscriberId));
                    }


                    if (createdEventIds2.indexOf(event.eventId) >= 0) {
                      processedMessagesNumber2++;

                      if (processedMessagesNumber2 == shouldBeProcessedNumber) {
                        done();
                      }
                    } else {
                      console.log('Old event');
                    }
                  });
                };

                //subscribe for events
                eventuateClient.subscribe(subscriberId2, entityTypesAndEvents2, eventHandler2, err => {
                  if (err) {
                    return done(err);
                  }

                });

              });
            });//subscribe2

          });
        });
      });//create2
    });//create1
  });
});