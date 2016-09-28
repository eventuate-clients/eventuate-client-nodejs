'use strict';

const EsClient = require('../dist');
const should = require('should');
const helpers = require('./lib/helpers');

const apiKey = {
  id: process.env.EVENTUATE_API_KEY_ID,
  secret: process.env.EVENTUATE_API_KEY_SECRET
};

if (!apiKey.id || !apiKey.secret) {
  throw new Error("Use `EVENTUATE_API_KEY_ID` and `EVENTUATE_API_KEY_SECRET` to set auth data");
}

const esClientOpts = {
  apiKey: apiKey,
  spaceName: process.env.EVENTUATE_SPACE_NAME || false
};


const esClient = new EsClient(esClientOpts);

describe('Test static API ', function () {

  describe('Test makeEvent() function', function () {

    it('should have function makeEvent()', function () {

      esClient.should.be.have.property('makeEvent');
      esClient.makeEvent.should.be.a.Function;

    });

    it('should return error for empty string', function  () {

      const result = esClient.makeEvent('');
      result.should.be.have.property('error');
      (result.error instanceof Error).should.be.true;
    });

    it('should return error for event with empty eventData', function () {

      const eventStr = '{"id":"00000151e8f00022-0242ac1100320002","entityId":"00000151e8f00021-0242ac1100160000","entityType":"d6bfa47c283f4fcfb23c49b2df8c10ed/default/net.chrisrichardson.eventstore.example.MyEntity1451312021100","eventData":"","eventType":"net.chrisrichardson.eventstore.example.MyEntityWasCreated"}';

      const result = esClient.makeEvent(eventStr);

      result.should.be.have.property('error');
      (result.error instanceof Error).should.be.true;

    });

    it('should parse the event', function () {

      const eventStr = '{"id":"00000151e8f00022-0242ac1100320002","entityId":"00000151e8f00021-0242ac1100160000","entityType":"d6bfa47c283f4fcfb23c49b2df8c10ed/default/net.chrisrichardson.eventstore.example.MyEntity1451312021100","eventData":"{\\"name\\":\\"Fred\\"}","eventType":"net.chrisrichardson.eventstore.example.MyEntityWasCreated"}';

      const ack = { serverId: '00000151e8f69a94-0242ac1100180000',
        eventType: 'net.chrisrichardson.eventstore.example.MyEntityWasCreated',
        eventId: '00000151e8f6932d-0242ac1100320002',
        receiptHandle:
        { subscriberId: 'subscriber1451312452044',
          eventIdAndType:
          { id: '00000151e8f6932d-0242ac1100320002',
            eventType: 'net.chrisrichardson.eventstore.example.MyEntityWasCreated' },
          sender:
          { entityId: '00000151e8f6932c-0242ac1100160000',
            entityType: 'd6bfa47c283f4fcfb23c49b2df8c10ed/default/net.chrisrichardson.eventstore.example.MyEntity1451312452043' },
          providerHandle: '00000151e8f69a94-0242ac1100180000:d6bfa47c283f4fcfb23c49b2df8c10ed_SLASH_default_SLASH_net.chrisrichardson.eventstore.example.MyEntity1451312452043:3:0',
          eventId: '00000151e8f6932d-0242ac1100320002',
          eventType: 'net.chrisrichardson.eventstore.example.MyEntityWasCreated' } };


      const result = esClient.makeEvent(eventStr, ack);

      result.should.be.have.property('event');

      const event = result.event;


      helpers.expectEvent(event);

    });

  });


  describe('Test serialiseObject() function', function () {

    it('should have function serialiseObject()', () => {

      esClient.should.be.have.property('serialiseObject');
      esClient.serialiseObject.should.be.a.Function;

    });

    it('should return serialised object', function () {

      const obj = { a: 1, b: 2, c: 3 };

      esClient.serialiseObject(obj).should.be.equal('a=1&b=2&c=3');
    });

  });

  describe('Test addBodyOptions() function', function () {

    it('should have function addBodyOptions()', function () {
      esClient.should.be.have.property('addBodyOptions');
      esClient.addBodyOptions.should.be.a.Function;
    });

    it('should add new options into jsonData', function () {
      const jsonData = {
        data: 'data'
      };
      const options = { a: 1, b: 2, c: 3 };

      esClient.addBodyOptions(jsonData, options);

      jsonData.should.containDeep(options);

    });

  });

  describe('Test checkEvents() function', function () {

    it('should have function checkEvents()', function () {
      esClient.should.be.have.property('checkEvents');
      esClient.checkEvents.should.be.a.Function;
    });

    it('should return false for empty events array', function () {
      esClient.checkEvents([]).should.be.false();
    });

    it('should return false for {}', function () {
      const event = {};
      esClient.checkEvents([ event ]).should.be.false();
    });

    it('should return false for incorrect event', function () {
      let event = {
        eventType: 'event1'
      };

      esClient.checkEvents(event).should.be.false();

      event = {
        eventData: { a: 1 }
      };

      esClient.checkEvents(event).should.be.false();

      event = {
        eventType: 'event1',
        eventData: '{"a": }'
      };

      esClient.checkEvents([event]).should.be.false();
    });

    it('should return true for correct event', function () {
      const event1 = {
        eventType: 'event1',
        eventData: '{"a": 1}'
      };

      const event2 = {
        eventType: 'event2',
        eventData: { a: 1 }
      };

      esClient.checkEvents([event1, event2]).should.be.true();
    });

  });

});
