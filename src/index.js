import EventuateClient from './modules/EventuateClient';
import AggregateRepository from './modules/AggregateRepository';
import EventDispatcher from './modules/EventDispatcher';
import EventTypeSwimlaneDispatcher from './modules/EventTypeSwimlaneDispatcher';
import EventuateSubscriptionManager from './modules/EventuateSubscriptionManager';
import EventuateClientConfiguration from './modules/EventuateClientConfiguration';
import Encryption from './modules/Encryption';

module.exports = EventuateClient;
module.exports.AggregateRepository = AggregateRepository;
module.exports.EventuateSubscriptionManager = EventuateSubscriptionManager;
module.exports.EventuateClientConfiguration = EventuateClientConfiguration;
module.exports.Encryption = Encryption;
