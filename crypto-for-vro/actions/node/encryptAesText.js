const crypto = require('crypto');

const KEY_FORMATS = { hex: 'hex', base64: 'base64', base64url: 'base64url' };
const CIPHERS = { 16: 'aes-128-gcm', 24: 'aes-192-gcm', 32: 'aes-256-gcm' };

exports.handler = (context, inputs, callback) => {
    try {
        const keyEncoding = KEY_FORMATS[String(inputs.keyFormat || 'hex').toLowerCase()];
        if (!keyEncoding) {
            throw new Error("[encryptAesText] Unsupported key format '" + inputs.keyFormat + "'. Use hex, base64 or base64url.");
        }
        const key = Buffer.from(String(inputs.secretKey || ''), keyEncoding);
        const cipherName = CIPHERS[key.length];
        if (!cipherName) {
            throw new Error('[encryptAesText] Key must be 16, 24 or 32 bytes (got ' + key.length + ').');
        }
        const iv = crypto.randomBytes(12);
        const cipher = crypto.createCipheriv(cipherName, key, iv);
        const text = inputs.text == null ? '' : String(inputs.text);
        const encrypted = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);
        const tag = cipher.getAuthTag();
        callback(undefined, Buffer.concat([iv, encrypted, tag]).toString('base64'));
    } catch (e) {
        callback(e, null);
    }
};
