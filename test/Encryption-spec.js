'use strict';
const { expect } = require('chai');
const helpers = require('./lib/helpers');
const Encryption = require('../dist/modules/Encryption');

const keyId = 'id';
const keySecret = 'secret';
class EncryptionStore {
  constructor(keys) {
    this.keys = keys;
  }

  get(encryptionKeyId) {
    return Promise.resolve(this.keys[encryptionKeyId]);
  }
}
const encryptionKeyStore = new EncryptionStore({ [keyId]: keySecret });
const encryptedPrefix = '__ENCRYPTED__';

const encryption = new Encryption(encryptionKeyStore);

describe('Encryption', () => {
  it('should check structure', () => {
    console.log('encryption:', encryption);
    expect(encryption).to.have.ownProperty('alg');
    expect(encryption).to.have.ownProperty('prefix');
    expect(encryption.prefix).to.equal(encryptedPrefix);
    expect(encryption).to.have.ownProperty('encryptionKeyStore');
    expect(encryption.encryptionKeyStore).to.deep.equal(encryptionKeyStore);
    expect(encryption.encrypt).to.be.a('function');
    expect(encryption.decrypt).to.be.a('function');
    expect(encryption.cipher).to.be.a('function');
    expect(encryption.decipher).to.be.a('function');
    expect(encryption.isEncrypted).to.be.a('function');
    expect(encryption.findKey).to.be.a('function');
  });

  it('isEncrypted() should return true', () => {
    const str = encryptedPrefix + 'abcde';
    expect(encryption.isEncrypted(str)).to.be.true;
  });

  it('isEncrypted() should return false', () => {
    const str = 'abcde';
    expect(encryption.isEncrypted(str)).to.be.false;
  });

  it('should find encryption key', done => {
    encryption.findKey(keyId)
      .then(key => {
        expect(key).to.equal(keySecret);
        done();
      })
      .catch(done);
  });

  it('should cipher and decipher', () => {
    const text = 'secret text';
    const cipher = encryption.cipher(keySecret, text);
    const decipher = encryption.decipher(keySecret, cipher);
    expect(decipher).to.equal(text);
  });

  it('should encrypt and decrypt', done => {
    const eventData = { a: '1', b: 2 };
    const eventDataString = JSON.stringify(eventData);
    encryption.encrypt(keyId, eventDataString)
      .then(encryptedEventData => {
        const cipher = encryption.cipher(keySecret, eventDataString);
        expect(encryptedEventData).to.equal(`${encryptedPrefix}${JSON.stringify({ encryptionKeyId: keyId, data: cipher })}`);

        return encryption.decrypt(encryptedEventData);
      })
      .then(decryptedEventData => {
        expect(decryptedEventData).to.equal(eventDataString);
        done();
      })
      .catch(done);
  });

  it('should try to encrypt with not existing key', done => {
    const eventData = '{ "foo": "bar" }';
    encryption.encrypt(eventData)
      .then(() => {
        done(new Error('Should return error'));
      })
      .catch(error => {
        helpers.expectEntityDeletedError(error);
        done();
      })
  });

  it('should try to decrypt with not existing key', done => {
    const encryptedEventData = '__ENCRYPTED__{"encryptionKeyId":"notExistingKeyId","data":"7e735ffcb85082731198f779e9d5b180"}';
    encryption.decrypt(encryptedEventData)
      .then(() => {
        done(new Error('Should return error'));
      })
      .catch(error => {
        helpers.expectEntityDeletedError(error);
        done();
      });
  });
});

