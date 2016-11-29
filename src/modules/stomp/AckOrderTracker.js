
export default class AckOrderTracker {

  constructor() {
    this.pendingHeaders = [];
  }

  add(ackHeader) {
    const pendingHeader = new PendingAckHeader(ackHeader);
    this.pendingHeaders.push(pendingHeader);
  }

  ack(ackHeader) {

    const pendingHeader = this.pendingHeaders.find(({ acked, ackHeader: currentAckHeader }) => {
      return ackHeader === currentAckHeader && !acked;
    });

    if (!pendingHeader) {
      console.error(`ACK Header not found: ${ackHeader}`);
      return [];
    }

    pendingHeader.acked = true;

    let notAckedIndex = this.pendingHeaders.findIndex(({ acked }) => !acked );

    if (notAckedIndex < 0) {
      notAckedIndex = this.pendingHeaders.length;
    }

    return this.pendingHeaders
      .splice(0, notAckedIndex)
      .map(({ ackHeader }) => ackHeader);
  }

  getPendingHeaders() {
    return this.pendingHeaders;
  }
}

class PendingAckHeader {

  constructor(ackHeader) {
    this.ackHeader = ackHeader;
    this.acked = false;
  }

  toString() {
    return JSON.stringify(this);
  }
}