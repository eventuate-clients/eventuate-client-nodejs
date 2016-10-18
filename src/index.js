import EsClient from './modules/EsClient';
import AggregateRepository from './modules/AggregateRepository';
import EventDispatcher from './modules/EventDispatcher';
import EventTypeSwimlaneDispatcher from './modules/EventTypeSwimlaneDispatcher';
import Subscriber from './modules/Subscriber';

module.exports = EsClient;
module.exports.AggregateRepository = AggregateRepository;
module.exports.EventDispatcher = EventDispatcher;
module.exports.EventTypeSwimlaneDispatcher = EventTypeSwimlaneDispatcher;
module.exports.Subscriber = Subscriber;
