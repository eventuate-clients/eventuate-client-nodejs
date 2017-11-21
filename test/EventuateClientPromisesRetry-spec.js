const http = require('http');
const EventuateClient = require('../dist');
const { EventuateClientConfiguration } = EventuateClient;

const timeout = 20000;

const host = 'localhost';
const port = 9000;
const serverBusyResponse = '{"error":"busy"}';

const config = new EventuateClientConfiguration({ url: `http://${host}:${port}`, httpKeepAlive: false });

const eventuateClient = new EventuateClient(config);

const entityTypeName = 'net.chrisrichardson.eventstore.example.MyEntity';
const eventTypeCreated = 'net.chrisrichardson.eventstore.example.MyEntityWasCreated';
const eventTypeUpdated = 'net.chrisrichardson.eventstore.example.MyEntityNameChanged';

const createEvents = [ { eventType: eventTypeCreated, eventData: { name: 'Fred' } } ];
const updateEvents = [ { eventType: eventTypeUpdated, eventData: { name: 'George' } } ];

const responses = {
  'POST': {
    '/entity/default': {
      entityId: '0000000001',
      entityVersion: '0000000001',
      eventIds: [ '0000000001' ]
    },
    '/entity/default/net.chrisrichardson.eventstore.example.MyEntity/0000000001': {
      entityId: '0000000001',
      entityVersion: '0000000002',
      eventIds: [ '0000000001', '0000000002' ]
    }
  },
  'GET': {
    '/entity/default/net.chrisrichardson.eventstore.example.MyEntity/0000000001': {
      events: [ { eventId: '0000000001' }, { eventId: '0000000002' }]
    }
  }

};

describe('Retry REST methods', function () {

  this.timeout(timeout);

  it('should retry create()', done => {

    const server = http.createServer(getRequestHandler());
    server.listen(port, onListening);

    eventuateClient.create(entityTypeName, createEvents)
      .then(() => {
          server.close();
          done();
      })
      .catch(err => {
        setTimeout(() => {
          server.close();
          done(err);
        }, 1000)
      });
  });

  it('should retry update()', done => {

    const server = http.createServer(getRequestHandler());
    server.listen(port, onListening);

    eventuateClient.update(entityTypeName, '0000000001', '0000000001', updateEvents)
      .then(() => {
          server.close();
          done();
      })
      .catch(err => {
        setTimeout(() => {
          server.close();
          done(err);
        }, 1000)
      });
  });

  it('should retry loadEvents()', done => {

    const server = http.createServer(getRequestHandler());
    server.listen(port, onListening);

    eventuateClient.loadEvents(entityTypeName, '0000000001')
      .then(() => {
        setTimeout(() => {
          server.close();
          done();
        }, 1000);
      })
      .catch(err => {
        setTimeout(() => {
          server.close();
          done(err);
        }, 1000)
      });
  });
});

function onListening() {
  console.log(`Mock HTTP server listening on ${port}`);
}

function getResponseBody(method, url) {
  return JSON.stringify(responses[method][url]);
}

function getRequestHandler() {

  let requestCount = 0;

  return (req, res) => {

    ++requestCount;

    if (requestCount === eventuateClient.maxRetryNumber) {

      const body = getResponseBody(req.method, req.url);

      res.writeHead(200, {
        'Content-type': 'application/json',
        'Content-length': Buffer.byteLength(body)
      });

      res.write(body);

    } else {
      res.writeHead(503);
      res.write(serverBusyResponse);
    }

    res.end();
  }
}