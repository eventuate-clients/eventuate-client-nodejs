NodeJS-based client for the Eventuate Platform
======================

For background information on event sourcing please see this [blog post](http://plainoldobjects.com/2015/01/04/example-application-for-my-qconsf-presentation-about-building-microservices-with-event-sourcing-and-cqrs/)

# Installation

npm install es-node-js-client

# Features
  * Persist events for a new entity of the specified type.
  * Retrieves the events for the specified entity.
  * Updates events for an existing entity
  * Subscribe to events of particular types

# Configuration

Setup environment variables:

    EVENT_STORE_USER_ID
    EVENT_STORE_PASSWORD
    EVENT_STORE_URL
    EVENT_STORE_STOMP_SERVER_HOST
    EVENT_STORE_STOMP_SERVER_PORT

# Usage

```javascript
var apiKey = {
  id: process.env.EVENT_STORE_USER_ID,
  secret: process.env.EVENT_STORE_PASSWORD
};

if (!apiKey.id || !apiKey.secret) {
  throw new Error("", "Use `EVENT_STORE_USER_ID` and `EVENT_STORE_PASSWORD` to set auth data");
}

var esClientOpts = {
  url: process.env.EVENT_STORE_URL,
  stomp: {
    host: process.env.EVENT_STORE_STOMP_SERVER_HOST,
    port: process.env.EVENT_STORE_STOMP_SERVER_PORT
  },
  apiKey: apiKey
};

var esClient = new es.Client(esClientOpts);

var createEvents = [ { eventType: eventTypeCreated, eventData: { name: 'Fred' } } ];

esClient.create('net.chrisrichardson.eventstore.example.MyEntityWasCreated', createEvents, function (err, createdEntityAndEventInfo) {

  if (err) {
    console.error(err);
    throw err;
  }
  
  console.log(createdEntityAndEventInfo);

});
```

# Test

First install mocha:

    npm install -g mocha

Run the tests:

    npm test
    
or

    make test
    

# License