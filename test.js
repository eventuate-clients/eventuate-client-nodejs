const encryptionHelper = require('./simple-nodejs-iv-encrypt-decrypt');
const story = "this is the story of the brave prince who went off to fight the horrible dragon... he set out on his quest one sunny day";
const algorithm = encryptionHelper.CIPHERS.AES_256;
const assert = require('assert');

console.log("testing encryption and decryption");
console.log("text is: " + story);

encryptionHelper.getKeyAndIV("1234567890abcdefghijklmnopqrstuv", function (data) { //using 32 byte key

  console.log("got key and iv buffers");

  const encText = encryptionHelper.encryptText(algorithm, data.key, data.iv, story, "base64");

  console.log("encrypted text = " + encText);

  const decText = encryptionHelper.decryptText(algorithm, data.key, data.iv, encText, "base64");

  console.log("decrypted text = " + decText);

  assert.equal(decText, story);
});