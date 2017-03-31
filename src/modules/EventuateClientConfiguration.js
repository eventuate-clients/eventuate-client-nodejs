import { parseIsTrue } from './utils';

export default class EventuateClientConfiguration {

  constructor({ debug = false } = {}) {

    const apiKey = {
      id: process.env.EVENTUATE_API_KEY_ID,
      secret: process.env.EVENTUATE_API_KEY_SECRET
    };

    if (!apiKey.id || !apiKey.secret) {
      throw new Error("Use `EVENTUATE_API_KEY_ID` and `EVENTUATE_API_KEY_SECRET` to set auth data");
    }

    this.apiKey = apiKey;
    this.spaceName = process.env.EVENTUATE_SPACE || process.env.EVENTUATE_SPACE_NAME || 'default';
    this.httpKeepAlive = process.env.EVENTUATE_HTTP_KEEP_ALIVE;
    this.debug = debug;
    this.url =  process.env.EVENTUATE_URL || process.env.EVENT_STORE_URL || 'https://api.eventuate.io';
    this.stompHost = process.env.EVENTUATE_STOMP_SERVER_HOST || process.env.EVENT_STORE_STOMP_SERVER_HOST || 'api.eventuate.io';
    this.stompPort = process.env.EVENTUATE_STOMP_SERVER_PORT || process.env.EVENT_STORE_STOMP_SERVER_PORT || 61614;

    if (typeof this.httpKeepAlive === 'undefined') {
      this.httpKeepAlive = true;
    } else {
      this.httpKeepAlive = parseIsTrue(this.httpKeepAlive);
    }
  }

  getConfig() {
    return {
      apiKey: this.apiKey,
      spaceName: this.spaceName,
      httpKeepAlive: this.httpKeepAlive,
      debug: this.debug,
      url: this.url,
      stompHost: this.stompHost,
      stompPort: this.stompPort
    }
  }
}