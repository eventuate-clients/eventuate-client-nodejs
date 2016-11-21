NodeJS-based client for the Eventuate Platform
======================

This is the NodeJS client for the [Eventuate Platform](http://eventuate.io/).

# Installation

npm i @eventuateinc/eventuate-nodejs-client

# Features
  * Persist events for a new entity of the specified type.
  * Retrieves the events for the specified entity.
  * Updates events for an existing entity
  * Subscribe to events of particular types


#Available environment variables:

    EVENTUATE_API_KEY_ID
    EVENTUATE_API_KEY_SECRET
    EVENTUATE_URL(default https://api.eventuate.io)
    EVENTUATE_STOMP_SERVER_HOST(default api.eventuate.io)
    EVENTUATE_STOMP_SERVER_PORT(default 61614)
    EVENTUATE_SPACE_NAME
    HTTP_KEEP_ALIVE(default true)
        
# Configuration

Setup environment variables:

    EVENTUATE_API_KEY_ID
    EVENTUATE_API_KEY_SECRET
    

# Usage

```javascript
var apiKey = {
  id: process.env.EVENTUATE_API_KEY_ID,
  secret: process.env.EVENTUATE_API_KEY_SECRET
};

if (!apiKey.id || !apiKey.secret) {
  throw new Error("", "Use `EVENTUATE_API_KEY_ID` and `EVENTUATE_API_KEY_SECRET` to set auth data");
}

var esClientOpts = {
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

#High level client

For an example of usage, please look at `test/AggregateRepository-spec.js`

Don't edit `modules/AggregateRepository.js` and `modules/EventDispatcher.js`. These files are generated with Babel.

The source code files are:

    src/modules/AggregateRepository.js
    src/modules/EventDispatcher.js
    
These modules are written in ES6. If you are modifying these files you can use this command to recompile:
    
    npm run compile    
    


# Test

First install mocha:

    npm install -g mocha

Run the tests:

    npm test

or

    make test


# License
