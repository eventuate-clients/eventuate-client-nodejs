var should = require('should');
var parseStompFrames = require('../modules/stomp/stomp').parseStompFrames;
var parse_frame = require('../modules/stomp/stomp').parse_frame;
var chunks = require('./data/chunks').chunks;
var expectedFramesNumber = require('./data/chunks').framesNumber;
var helpers = require('./helpers');

var context = {
  buffer: '',
  log: {
    debug: function () {}
  }
};
var frames = [];

describe('Test stomp.js functions', function () {

  it('should split data chunks into frames', function () {

    chunks.forEach(function (chunk) {
      frames = frames.concat(parseStompFrames.call(context, chunk));
    });

    frames.length.should.be.equal(expectedFramesNumber);

    frames.forEach(function (_frame) {

      var parsed_frame = parse_frame(_frame);

      helpers.expectParsedFrame(parsed_frame)

    });
  });

});