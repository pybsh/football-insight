const crypto = require('crypto');
const util = require('util');

const randomBytesPromise = util.promisify(crypto.randomBytes);
const pbkdf2Promise = util.promisify(crypto.pbkdf2);

const createSalt = async () => {
    const buf = await randomBytesPromise(64);
    return buf.toString("base64");
  };

const createHashedPassword = async (password) => {
    const salt = await createSalt();
    const key = await pbkdf2Promise(password, salt, 104906, 64, "sha512");
    const hashedPassword = key.toString("base64");
    return { hashedPassword, salt };
};

const verifyPassword = async (password, userSalt, userPassword) => {
    const key = await pbkdf2Promise(password, userSalt, 104906, 64, "sha512");
    const hashedPassword = key.toString("base64");
    return (hashedPassword === userPassword) ? true : false;
};

module.exports = { createHashedPassword, verifyPassword };