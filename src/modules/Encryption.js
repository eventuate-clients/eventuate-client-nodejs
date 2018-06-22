import crypto from 'crypto';
import { getLogger } from './logger';
const logger = getLogger({ title: 'EventuateClient:Encryption' });

export default class Encryption {
  alg = 'aes-256-cbc';
  prefix = '__ENCRYPTED__';

  constructor(encryptionKeyStore) {
    this.encryptionKeyStore = encryptionKeyStore;
  }

  encrypt(encryptionKeyId, eventData) {
    return this.findKey(encryptionKeyId)
      .then(key => {
        const cipher = this.cipher(key, eventData);
        return `${this.prefix}${JSON.stringify({encryptionKeyId, data: cipher})}`;
      });
  }

  decrypt(encryptedEventData) {
    const { encryptionKeyId, data } = JSON.parse(encryptedEventData.split(this.prefix)[1]);
    return this.findKey(encryptionKeyId)
      .then(key => {
        return this.decipher(key, data);
      });
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
    return this.encryptionKeyStore.get(id)
      .then(key => {
        if (!key) {
          const err = new Error(`Encryption key "${id}" not found`);
          err.code = 'EntityDeletedException';
          logger.error(err);
          return Promise.reject(err);
        }

        return key;
      });
  }

  isEncrypted(eventDataStr) {
    return eventDataStr.includes(this.prefix);
  }
}