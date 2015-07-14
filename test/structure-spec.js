var es = require('../modules/es');
var should = require('should');

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
  httpKeepAlive: true,
  spaceName: 'esClientTest'
};


var esClient = new es.Client(esClientOpts);

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

});