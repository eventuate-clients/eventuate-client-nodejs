import EventuateClient from './modules/EventuateClient';
import AggregateRepository from './modules/AggregateRepository';
import EventDispatcher from './modules/EventDispatcher';
import EventTypeSwimlaneDispatcher from './modules/EventTypeSwimlaneDispatcher';
import SubscriptionManager from './modules/SubscriptionManager';
import EventuateClientConfiguration from './modules/EventuateClientConfiguration';

module.exports = EventuateClient;
module.exports.AggregateRepository = AggregateRepository;
module.exports.EventDispatcher = EventDispatcher;
module.exports.EventTypeSwimlaneDispatcher = EventTypeSwimlaneDispatcher;
module.exports.SubscriptionManager = SubscriptionManager;
module.exports.EventuateClientConfiguration = EventuateClientConfiguration;
