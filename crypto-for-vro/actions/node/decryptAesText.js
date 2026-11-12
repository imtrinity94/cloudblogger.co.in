const crypto = require('crypto');

const KEY_FORMATS = { hex: 'hex', base64: 'base64', base64url: 'base64url' };
const CIPHERS = { 16: 'aes-128-gcm', 24: 'aes-192-gcm', 32: 'aes-256-gcm' };

exports.handler = (context, inputs, callback) => {
    try {
        const keyEncoding = KEY_FORMATS[String(inputs.keyFormat || 'hex').toLowerCase()];
        if (!keyEncoding) {
            throw new Error("[decryptAesText] Unsupported key format '" + inputs.keyFormat + "'. Use hex, base64 or base64url.");
        }
        const key = Buffer.from(String(inputs.secretKey || ''), keyEncoding);
        const cipherName = CIPHERS[key.length];
        if (!cipherName) {
            throw new Error('[decryptAesText] Key must be 16, 24 or 32 bytes (got ' + key.length + ').');
        }
        const data = Buffer.from(String(inputs.token || ''), 'base64');
        if (data.length < 28) {
            throw new Error('[decryptAesText] Token is too short.');
        }
        const iv = data.subarray(0, 12);
        const tag = data.subarray(data.length - 16);
        const encrypted = data.subarray(12, data.length - 16);
        const decipher = crypto.createDecipheriv(cipherName, key, iv);
        decipher.setAuthTag(tag);
        let plain;
        try {
            plain = Buffer.concat([decipher.update(encrypted), decipher.final()]).toString('utf8');
        } catch (authError) {
            throw new Error('[decryptAesText] Decryption failed (wrong key or altered token).');
        }
        callback(undefined, plain);
    } catch (e) {
        callback(e, null);
    }
};
