'use strict';
const expect = require('chai').expect;
const Stomp = require('../dist/modules/stomp/Stomp');
const chunks = require('./data/chunks').chunks;
const expectedFramesNumber = require('./data/chunks').framesNumber;
const helpers = require('./lib/helpers');

const stomp = new Stomp({});
let frames = [];

describe('Test stomp.js functions', () => {

  it('should split data chunks into frames', () => {

    chunks.forEach(chunk => {
      frames = frames.concat(stomp.parseStompFrames(chunk));
    });

    expect(frames.length).to.be.equal(expectedFramesNumber);

    frames.forEach(_frame => {

      const parsed_frame = stomp.parseFrame(_frame);

      helpers.expectParsedFrame(parsed_frame)

    });
  });

});