'use strict';

export default class Frame {
  constructor() {
    this.command = null;
    this.headers = null;
    this.body = null;
  }

  buildFrame(args, wantReceipt) {

    this.command = args.command;
    this.headers = args.headers;
    this.body = args.body;

    if (wantReceipt) {

      let receipt = '';

      let receiptStamp = Math.floor(Math.random() * 99999999999).toString();

      if (this.headers.session !== undefined) {
        receipt = receiptStamp + "-" + this.headers.session;
      } else {
        receipt = receiptStamp;
      }
      this.headers.receipt = receipt;
    }
    return this;
  }

  asString() {

    const headers = Object.keys(this.headers)
      .map(headerName => {
        return `${headerName}:${this.headers[headerName]}`;
    });

    let frame = this.command + "\n";
    frame += headers.join("\n");
    frame += "\n\n";

    if (this.body) {
      frame += this.body;
    }

    frame += '\x00';

    return frame;
  }
}