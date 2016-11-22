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
    EVENTUATE_HTTP_KEEP_ALIVE(default true)
        
# Configuration

Setup environment variables:

    EVENTUATE_API_KEY_ID
    EVENTUATE_API_KEY_SECRET
    

# Usage

```javascript

var EventuateClient = require('@eventuateinc/eventuate-nodejs-client');
var EventuateClientConfiguration = EventuateClient.EventuateClientConfiguration;

const eventuateClientOpts = new EventuateClientConfiguration({ debug: true });

var eventuateClient = new EventuateClient(eventuateClientOpts);

var createEvents = [ { eventType: eventTypeCreated, eventData: { name: 'Fred' } } ];

eventuateClient.create('net.chrisrichardson.eventstore.example.MyEntityWasCreated', createEvents, function (err, createdEntityAndEventInfo) {

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
    
    
#Compilation:

The Eventuate Client and its modules are written in ES6. 

Use next command to transform ES6 code to the ECMAScript 5:

    npm run compile
    
It will create `dist` directory.
    


# Test

Note: you need to compile ES6 sources before.

First install mocha:

    npm install -g mocha

Run the tests:

    npm test


# License
