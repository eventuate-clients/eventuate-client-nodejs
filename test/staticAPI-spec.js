'use strict';
const expect = require('chai').expect;
const helpers = require('./lib/helpers');
const escapeStr = require('../dist/modules/specialChars').escapeStr;

const esClient = helpers.createEsClient();

describe('Test static API ', () => {

  describe('Test makeEvent() function', () => {

    it('should have function makeEvent()', () => {

      expect(esClient).to.have.property('makeEvent');
      expect(esClient.makeEvent).to.be.a('Function');
    });

    it('should return error for empty string', () => {

      const result = esClient.makeEvent('');
      expect(result).to.have.property('error');
      expect(result.error).to.be.instanceof(Error);
    });

    it('should return error for event with empty eventData', () => {

      const eventStr = '{"id":"00000151e8f00022-0242ac1100320002","entityId":"00000151e8f00021-0242ac1100160000","entityType":"d6bfa47c283f4fcfb23c49b2df8c10ed/default/net.chrisrichardson.eventstore.example.MyEntity1451312021100","eventData":"","eventType":"net.chrisrichardson.eventstore.example.MyEntityWasCreated"}';

      const result = esClient.makeEvent(eventStr);
      expect(result).to.have.property('error');
      expect(result.error).to.be.instanceof(Error);

    });

    it('should parse the event', () => {

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


      const result = esClient.makeEvent(eventStr, escapeStr(JSON.stringify(ack)));

      expect(result).to.have.property('event');

      const event = result.event;

      helpers.expectEvent(event);

    });

  });


  describe('Test serialiseObject() function', () => {

    it('should have function serialiseObject()', () => {

      expect(esClient).to.have.property('serialiseObject');
      expect(esClient.serialiseObject).to.be.a('Function');
    });

    it('should return serialised object', () => {

      const obj = { a: 1, b: 2, c: 3 };
      const serialised = esClient.serialiseObject(obj);
      expect(serialised).to.equal('a=1&b=2&c=3');
    });

  });

  describe('Test addBodyOptions() function', () => {

    it('should have function addBodyOptions()', () => {
      expect(esClient).to.have.property('addBodyOptions');
      expect(esClient.addBodyOptions).to.be.a.Function;
    });

    it('should add new options into jsonData', () => {
      const jsonData = {
        data: 'data'
      };
      const options = { a: 1, b: 2, c: 3 };

      esClient.addBodyOptions(jsonData, options);

      expect(jsonData).to.contain.deep(options);

    });

  });

  describe('Test checkEvents() function', () => {

    it('should have function checkEvents()', () => {
      expect(esClient).to.have.property('checkEvents');
      expect(esClient.checkEvents).to.be.a('Function');
    });

    it('should return false for empty events array', () => {
      expect(esClient.checkEvents([])).to.be.false;
    });

    it('should return false for {}', () => {
      const event = {};
      expect(esClient.checkEvents([ event ])).to.be.false;
    });

    it('should return false for incorrect event', () => {
      let event = {
        eventType: 'event1'
      };

      expect(esClient.checkEvents(event)).to.be.false;

      event = {
        eventData: { a: 1 }
      };

      expect(esClient.checkEvents(event)).to.be.false;

      event = {
        eventType: 'event1',
        eventData: '{"a": }'
      };

      expect(esClient.checkEvents([event])).to.be.false;
    });

    it('should return true for correct event', () => {
      const event1 = {
        eventType: 'event1',
        eventData: '{"a": 1}'
      };

      const event2 = {
        eventType: 'event2',
        eventData: { a: 1 }
      };

      expect(esClient.checkEvents([event1, event2])).to.be.true;
    });

  });

});
