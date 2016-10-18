REPORTER = spec

test:
	NODE_ENV=test mocha \
		--reporter $(REPORTER) \
		--ui bdd \
		test/staticAPI-spec.js \
		test/specialChars-spec.js \
		test/EsServerErrorClass-spec.js \
		test/esClient-spec.js \
		test/AckOrderTracker-spec.js \
		test/stomp-spec.js \
		test/subscribe-spec.js \
		test/subscribeTwoSubscribers-spec.js \
		test/subscribeManyEvents-spec.js \
		test/subscribeWithOptions-spec.js \
		test/AggregateRepository-spec.js \
		test/ObservableQueue-spec.js \
		test/EventTypeSwimlaneDispatcher-spec.js



.PHONY: test
