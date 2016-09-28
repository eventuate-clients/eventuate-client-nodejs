const AckOrderTracker =require('../dist/modules/stomp/AckOrderTracker');
const expect = require('chai').expect;



describe('AckOrderTracker', () => {

  it('should reorder', () => {

    const ackOrderTracker = new AckOrderTracker();

    ackOrderTracker.add('a');
    ackOrderTracker.add('b');
    ackOrderTracker.add('c');

    expect(ackOrderTracker.ack('b')).to.deep.equal([]);
    expect(ackOrderTracker.ack('a')).to.deep.equal(['a', 'b']);
    expect(ackOrderTracker.ack('c')).to.deep.equal(['c']);
    expect(ackOrderTracker.pendingHeaders).to.be.empty;
  });

  it('should work with right ack order', () => {
    const ackOrderTracker = new AckOrderTracker();

    ackOrderTracker.add('a');
    ackOrderTracker.add('b');
    ackOrderTracker.add('c');

    expect(ackOrderTracker.ack('a')).to.deep.equal(['a']);
    expect(ackOrderTracker.ack('b')).to.deep.equal(['b']);
    expect(ackOrderTracker.ack('c')).to.deep.equal(['c']);
    expect(ackOrderTracker.pendingHeaders).to.be.empty;
  });

  it('should work with reverse ack order', () => {
    const ackOrderTracker = new AckOrderTracker();

    ackOrderTracker.add('a');
    ackOrderTracker.add('b');
    ackOrderTracker.add('c');

    expect(ackOrderTracker.ack('c')).to.deep.equal([]);
    expect(ackOrderTracker.ack('b')).to.deep.equal([]);
    expect(ackOrderTracker.ack('a')).to.deep.equal(['a', 'b', 'c']);
    expect(ackOrderTracker.pendingHeaders).to.be.empty;
  });

  it('should reorder 2', () => {
    const ackOrderTracker = new AckOrderTracker();

    ackOrderTracker.add('a');
    ackOrderTracker.add('b');
    ackOrderTracker.add('c');

    expect(ackOrderTracker.ack('c')).to.deep.equal([]);
    expect(ackOrderTracker.ack('a')).to.deep.equal(['a']);
    expect(ackOrderTracker.ack('b')).to.deep.equal(['b', 'c']);
    expect(ackOrderTracker.pendingHeaders).to.be.empty;
  });
});