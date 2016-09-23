var EsClient = require('../dist');
var should = require('should');
var helpers = require('./lib/helpers');

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

describe('Test static API ', function () {

  it('should be have property function create()', function () {
    esClient.should.be.have.property('create');
    esClient.create.should.be.a.Function;
  });

  it('should be have property function update()', function () {
    esClient.should.be.have.property('update');
    esClient.update.should.be.a.Function;
  });

  it('should be have property function loadEvents()', function () {
    esClient.should.be.have.property('loadEvents');
    esClient.loadEvents.should.be.a.Function;
  });

  it('should be have property function subscribe()', function () {
    esClient.should.be.have.property('subscribe');
    esClient.subscribe.should.be.a.Function;
  });

  it('function makeEvent() should exist', function () {
    esClient.should.be.have.property('makeEvent');
    esClient.create.should.be.a.Function;

    describe('Test makeEvent() function', function () {

      it('should return the error for empty string', function  () {

        var result = esClient.makeEvent('');
        result.should.be.have.property('error');
        (result.error instanceof Error).should.be.true;
      });

      it('should return the error for event with empty eventData', function () {

        var eventStr = '{"id":"00000151e8f00022-0242ac1100320002","entityId":"00000151e8f00021-0242ac1100160000","entityType":"d6bfa47c283f4fcfb23c49b2df8c10ed/default/net.chrisrichardson.eventstore.example.MyEntity1451312021100","eventData":"","eventType":"net.chrisrichardson.eventstore.example.MyEntityWasCreated"}';

        var result = esClient.makeEvent(eventStr);

        result.should.be.have.property('error');
        (result.error instanceof Error).should.be.true;

      });

      it('should parse the event', function () {

        var eventStr = '{"id":"00000151e8f00022-0242ac1100320002","entityId":"00000151e8f00021-0242ac1100160000","entityType":"d6bfa47c283f4fcfb23c49b2df8c10ed/default/net.chrisrichardson.eventstore.example.MyEntity1451312021100","eventData":"{\\"name\\":\\"Fred\\"}","eventType":"net.chrisrichardson.eventstore.example.MyEntityWasCreated"}';

        var ack = { serverId: '00000151e8f69a94-0242ac1100180000',
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


        var result = esClient.makeEvent(eventStr, ack);

        result.should.be.have.property('event');

        var event = result.event;


        helpers.expectEvent(event);

      });

    });

  });

});

