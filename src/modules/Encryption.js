import crypto from 'crypto';
import { getLogger } from './logger';
const logger = getLogger({ title: 'EventuateClient:Encryption' });

export default class Encryption {
  static alg = 'aes-256-cbc';
  static prefix = '__ENCRYPTED__';

  constructor(encryptionKeyStore) {
    this.encryptionKeyStore = encryptionKeyStore;
  }

  async encrypt(encryptionKeyId, eventData) {
    const key = await this.findKey(encryptionKeyId);
    const cipher = this.cipher(key, eventData);
    return `${Encryption.prefix}${JSON.stringify({encryptionKeyId, data: cipher})}`;
  }

  async decrypt(encryptedEventData) {
    try {
      const { encryptionKeyId, data } = JSON.parse(encryptedEventData.split(Encryption.prefix)[1]);
      const key = await this.findKey(encryptionKeyId);
      return this.decipher(key, data);
    } catch (ex) {
      logger.error(`Encryption::decrypt('${ encryptedEventData }')`, ex)
    }
  }

  cipher(key, text) {
    const cipher = crypto.createCipher(Encryption.alg, key);
    return cipher.update(text, 'utf-8', 'hex') + cipher.final('hex');
  }

  decipher(key, text) {
    const decipher = crypto.createDecipher(Encryption.alg, key);
    return decipher.update(text, 'hex', 'utf-8') + decipher.final('utf-8');
  }

  async findKey(id) {
    const key = await this.encryptionKeyStore.get(id);
    if (key) {
      return key;
    }
    const err = new Error(`Encryption key '${ id }' not found`);
    err.code = 'EntityDeletedException';
    logger.error(err);
    throw err;
  }

  isEncrypted(eventDataStr) {
    return eventDataStr.indexOf(Encryption.prefix) === 0;
  }
}