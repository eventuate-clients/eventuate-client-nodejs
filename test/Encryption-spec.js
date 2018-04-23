'use strict';
const { expect } = require('chai');
const Encryption = require('../dist/modules/Encryption');

const keyId = 'id';
const keySecret = 'secret';
const encryptionKeyStore = { [keyId]: keySecret };
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
  });

  it('should cipher and decipher', () => {
    const text = 'secret text';
    const cipher = encryption.cipher(encryptionKeyStore[keyId], text);
    const decipher = encryption.decipher(encryptionKeyStore[keyId], cipher);
    expect(decipher).to.equal(text);
  });

  it('should encrypt and decrypt', () => {
    const eventData = { a: '1', b: 2 };
    const eventDataString = JSON.stringify(eventData);
    const encryptedEventData = encryption.encrypt(keyId, eventDataString);
    const cipher = encryption.cipher(encryptionKeyStore[keyId], eventDataString);
    expect(encryptedEventData).to.equal(`${encryptedPrefix}${JSON.stringify({ encryptionKeyId: keyId, data: cipher })}`);

    const decryptedEventData = encryption.decrypt(encryptedEventData);
    expect(decryptedEventData).to.equal(eventDataString);
  });
});

