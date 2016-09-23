var should = require('should');
var Stomp = require('../dist/modules/stomp/Stomp');
var chunks = require('./data/chunks').chunks;
var expectedFramesNumber = require('./data/chunks').framesNumber;
var helpers = require('./lib/helpers');

var stomp = new Stomp({});
var frames = [];

describe('Test stomp.js functions', function () {

  it('should split data chunks into frames', function () {

    chunks.forEach(function (chunk) {
      frames = frames.concat(stomp.parseStompFrames(chunk));
    });

    frames.length.should.be.equal(expectedFramesNumber);

    frames.forEach(function (_frame) {

      var parsed_frame = stomp.parseFrame(_frame);

      helpers.expectParsedFrame(parsed_frame)

    });
  });

});