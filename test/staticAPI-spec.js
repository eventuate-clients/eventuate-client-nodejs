'use strict';
const expect = require('chai').expect;
const helpers = require('./lib/helpers');
const escapeStr = require('../dist/modules/specialChars').escapeStr;
const retryNTimes = require('../dist/modules/utils').retryNTimes;
const timeout = 15000;

const eventuateClient = helpers.createEventuateClient();

describe('Test static API ', () => {

  describe('Test makeEvent() function', () => {

    it('should have function makeEvent()', () => {
      expect(eventuateClient).to.have.property('makeEvent');
      expect(eventuateClient.makeEvent).to.be.a('Function');
    });

    it('should return error for empty string', () => {
      const result = eventuateClient.makeEvent('');
      expect(result).to.have.property('error');
      expect(result.error).to.be.instanceof(Error);
    });

    it('should return error for event with empty eventData', () => {

      const eventStr = '{"id":"00000151e8f00022-0242ac1100320002","entityId":"00000151e8f00021-0242ac1100160000","entityType":"d6bfa47c283f4fcfb23c49b2df8c10ed/default/net.chrisrichardson.eventstore.example.MyEntity1451312021100","eventData":"","eventType":"net.chrisrichardson.eventstore.example.MyEntityWasCreated"}';

      const result = eventuateClient.makeEvent(eventStr);
      expect(result).to.have.property('error');
      expect(result.error).to.be.instanceof(Error);
    });

    it('should parse event', done => {

      const eventStr = '{"id":"00000151e8f00022-0242ac1100320002","entityId":"00000151e8f00021-0242ac1100160000","entityType":"d6bfa47c283f4fcfb23c49b2df8c10ed/default/net.chrisrichardson.eventstore.example.MyEntity1451312021100","eventData":"{\\"name\\":\\"Fred\\"}","eventType":"net.chrisrichardson.eventstore.example.MyEntityWasCreated","eventType":"net.chrisrichardson.eventstore.example.MyEntityWasCreated", "eventToken":"eyJzdWJzY3JpYmVySWQiOiJkNmJmYTQ3YzI4M2Y0ZmNmYjIzYzQ5YjJkZjhjMTBlZF9kZWZhdWx0X3N1YnNjcmliZXItNzQwMzk2MDA5NDUyMTFlNjlkOTRlZjViOTNiZjk3OWIiLCJldmVudElkQW5kVHlwZSI6eyJpZCI6IjAwMDAwMTU3ZDIyMjc3MzctMDI0MmFjMTEwMGQ2MDAwMiIsImV2ZW50VHlwZSI6Im5ldC5jaHJpc3JpY2hhcmRzb24uZXZlbnRzdG9yZS5leGFtcGxlLk15RW50aXR5TmFtZUNoYW5nZWQifSwic2VuZGVyIjp7ImVudGl0eUlkIjoiMDAwMDAxNTdkMjIyNzExZi0wMjQyYWMxMTAwODkwMDAwIiwiZW50aXR5VHlwZSI6ImQ2YmZhNDdjMjgzZjRmY2ZiMjNjNDliMmRmOGMxMGVkL2RlZmF1bHQvbmV0LmNocmlzcmljaGFyZHNvbi5ldmVudHN0b3JlLmV4YW1wbGUuTXlFbnRpdHktNzQwMzk2MDE5NDUyMTFlNjlkOTRlZjViOTNiZjk3OWIifSwicHJvdmlkZXJIYW5kbGUiOiIwMDAwMDE1N2QyMjI3ZGYyLTAyNDJhYzExMDA4NzAwMDA6ZDZiZmE0N2MyODNmNGZjZmIyM2M0OWIyZGY4YzEwZWRfU0xBU0hfZGVmYXVsdF9TTEFTSF9uZXQuY2hyaXNyaWNoYXJkc29uLmV2ZW50c3RvcmUuZXhhbXBsZS5NeUVudGl0eS03NDAzOTYwMTk0NTIxMWU2OWQ5NGVmNWI5M2JmOTc5Yjo0OjEiLCJldmVudElkIjoiMDAwMDAxNTdkMjIyNzczNy0wMjQyYWMxMTAwZDYwMDAyIiwiZXZlbnRUeXBlIjoibmV0LmNocmlzcmljaGFyZHNvbi5ldmVudHN0b3JlLmV4YW1wbGUuTXlFbnRpdHlOYW1lQ2hhbmdlZCJ9"}';

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

      const result = eventuateClient.makeEvent(eventStr, escapeStr(JSON.stringify(ack)));

      if (result.error) {
        return done(result.error);
      }

      expect(result).to.have.property('event');
      const event = result.event;
      helpers.expectEvent(event, done);
    });
  });

  describe('Test serialiseObject() function', () => {

    it('should have function serialiseObject()', () => {
      expect(eventuateClient).to.have.property('serialiseObject');
      expect(eventuateClient.serialiseObject).to.be.a('Function');
    });

    it('should return serialised object', () => {
      const obj = { a: 1, b: 2, c: 3 };
      const serialised = eventuateClient.serialiseObject(obj);
      expect(serialised).to.equal('a=1&b=2&c=3');
    });
  });

  describe('Test addBodyOptions() function', () => {

    it('should have function addBodyOptions()', () => {
      expect(eventuateClient).to.have.property('addBodyOptions');
      expect(eventuateClient.addBodyOptions).to.be.a.Function;
    });

    it('should add new options into jsonData', () => {
      const jsonData = {
        data: 'data'
      };
      const options = { a: 1, b: 2, c: 3 };

      eventuateClient.addBodyOptions(jsonData, options);

      expect(jsonData).to.contain.deep(options);

    });
  });

  describe('Test checkEvents() function', () => {

    it('should have function checkEvents()', () => {
      expect(eventuateClient).to.have.property('checkEvents');
      expect(eventuateClient.checkEvents).to.be.a('Function');
    });

    it('should return false for empty events array', () => {
      expect(eventuateClient.checkEvents([])).to.be.false;
    });

    it('should return false for {}', () => {
      const event = {};
      expect(eventuateClient.checkEvents([ event ])).to.be.false;
    });

    it('should return false for incorrect event', () => {
      let event = {
        eventType: 'event1'
      };

      expect(eventuateClient.checkEvents(event)).to.be.false;

      event = {
        eventData: { a: 1 }
      };

      expect(eventuateClient.checkEvents(event)).to.be.false;

      event = {
        eventType: 'event1',
        eventData: '{"a": }'
      };

      expect(eventuateClient.checkEvents([event])).to.be.false;
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

      expect(eventuateClient.checkEvents([event1, event2])).to.be.true;
    });
  });

  describe('Test retryNTimes()', function () {
    this.timeout(timeout);
    const times = 6;

    it('should run a function 6 times and return "success"', done => {

      let i = 0;
      function workerFn(b) {
        return new Promise((resolve, reject) => {
          if (i < 5) {
            i = i + b;
            return reject(new Error('Failure'));
          }

          return resolve('success');
        });
      }
      let errConditionFn = () => true;

      const retryA = retryNTimes({ times, fn: workerFn, errConditionFn });
      retryA(1)
        .then(result => {
          expect(result).to.equal('success');
          done();
        })
        .catch(done);
    });

    it('should return error', done => {
      function workerFn(b) {
        return new Promise((resolve, reject) => {
          reject(new Error('Failure'));
        });
      }

      let errConditionFn = () => true;

      const retryA = retryNTimes({ times, fn: workerFn, errConditionFn });
      retryA(1)
        .then()
        .catch(err => {
          expect(err).to.be.instanceof(Error);
          done();
        });
    });
  });
});
