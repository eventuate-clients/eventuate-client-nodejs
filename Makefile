REPORTER = spec

test:
	NODE_ENV=test mocha \
		--reporter $(REPORTER) \
		--ui bdd \
		test/staticAPI-spec.js \
		test/specialChars-spec.js \
		test/esClient-spec.js \
		test/subscribe1-spec.js \
		test/subscribe2-spec.js \
		test/subscribe3-spec.js \
		test/EventStoreUtils-spec.js \

.PHONY: test
