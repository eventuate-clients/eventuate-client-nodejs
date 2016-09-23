
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
      return acked === false && ackHeader === ah;
    });

    if (pendingHeader) {
      pendingHeader.acked = true;

      return this.pendingHeaders
        .filter(({ acked }, index, arr) => {
          if (acked == true) {
            arr.splice(index, 1);
            return true;
          }
        })
        .map(({ ackHeader }) => ackHeader);
    } else {
      console.error(`Didn't find ${ah}`);
      return [];
    }
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