
export default class AckOrderTracker {

  constructor() {
    this.pendingHeaders = [];
  }

  add(ackHeader) {
    const pendingHeader = new PendingAckHeader(ackHeader);
    this.pendingHeaders.push(pendingHeader);
  }

  ack(ah) {

    let pendingHeader = this.pendingHeaders.find(({ acked, ackHeader }) => {
      return !acked && ackHeader === ah;
    });

    if (!pendingHeader) {
      console.error(`Didn't find ${ah}`);
      return [];
    }

    pendingHeader.acked = true;
    const ackedHeaders = [];

    for (let { acked, ackHeader } of this.pendingHeaders) {
      if (!acked) {
        break;
      }
      ackedHeaders.push(ackHeader);
    }

    this.pendingHeaders.splice(0, ackedHeaders.length);

    return ackedHeaders;
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