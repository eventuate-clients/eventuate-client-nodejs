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
    const iv = crypto.randomBytes(16).toString('hex');
    const cipher = this.cipher(key, iv, eventData);
    return `${Encryption.prefix}${JSON.stringify({encryptionKeyId, data: cipher, salt: iv})}`;
  }

  async decrypt(encryptedEventData) {
    try {
      const { encryptionKeyId, salt, data } = JSON.parse(encryptedEventData.split(Encryption.prefix)[1]);
      const key = await this.findKey(encryptionKeyId);
      return this.decipher(key, salt, data );
    } catch (ex) {
      logger.error(`Encryption::decrypt('${ encryptedEventData }')`, ex);
      return Promise.reject(ex);
    }
  }

  cipher(key, iv, text) {

    const encryptor = crypto.createCipheriv(Encryption.alg, Buffer.from(key, 'hex'), Buffer.from(iv, 'hex'));
    encryptor.setEncoding('hex');
    encryptor.write(text);
    encryptor.end();

    return encryptor.read();
  }

  decipher(key, iv = '', text) {

    let decipher;

    if (iv) {
      decipher = crypto.createDecipheriv(Encryption.alg, Buffer.from(key, 'hex'), Buffer.from(iv, 'hex'));
    } else {
      decipher = crypto.createDecipher(Encryption.alg, key);
    }

    return decipher.update(text, 'hex') + decipher.final('utf-8');
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