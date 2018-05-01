import crypto from 'crypto';

export default class Encryption {
  alg = 'aes-256-cbc';
  prefix = '__ENCRYPTED__';

  constructor(encryptionKeyStore) {
    this.encryptionKeyStore = encryptionKeyStore;
  }

  encrypt(encryptionKeyId, eventData) {
    const cipher = this.cipher(this.findKey(encryptionKeyId), eventData);
    return `${this.prefix}${JSON.stringify({encryptionKeyId, data: cipher})}`;
  }

  decrypt(encryptedEventData) {
    const { encryptionKeyId, data } = JSON.parse(encryptedEventData.split(this.prefix)[1]);
    return this.decipher(this.findKey(encryptionKeyId), data);
  }

  cipher(key, text) {
    const cipher = crypto.createCipher(this.alg, key);
    return cipher.update(text, 'utf-8', 'hex') + cipher.final('hex');
  }

  decipher(key, text) {
    const decipher = crypto.createDecipher(this.alg, key);
    return decipher.update(text, 'hex', 'utf-8') + decipher.final('utf-8');
  }

  findKey(id) {
    return this.encryptionKeyStore[id];
  }

  isEncrypted(eventDataStr) {
    return eventDataStr.includes(this.prefix);
  }
}