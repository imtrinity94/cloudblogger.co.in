const crypto = require('crypto');

const ALGORITHMS = { sha1: 'sha1', sha256: 'sha256', sha512: 'sha512' };
const FORMATS = ['hex', 'base64', 'base64url'];
const KEY_FORMATS = { text: 'utf8', utf8: 'utf8', hex: 'hex', base64: 'base64', base64url: 'base64url' };

exports.handler = (context, inputs, callback) => {
    try {
        const alg = ALGORITHMS[String(inputs.algorithm || 'SHA-256').toLowerCase().replace(/[^a-z0-9]/g, '')];
        if (!alg) {
            throw new Error("[computeHmac] Unsupported algorithm '" + inputs.algorithm + "'. Use SHA-1, SHA-256 or SHA-512.");
        }
        const keyEncoding = KEY_FORMATS[String(inputs.keyFormat || 'text').toLowerCase()];
        if (!keyEncoding) {
            throw new Error("[computeHmac] Unsupported key format '" + inputs.keyFormat + "'. Use text, hex, base64 or base64url.");
        }
        const fmt = String(inputs.outputFormat || 'hex').toLowerCase();
        if (FORMATS.indexOf(fmt) === -1) {
            throw new Error("[computeHmac] Unsupported output format '" + inputs.outputFormat + "'. Use hex, base64 or base64url.");
        }
        const key = Buffer.from(inputs.secretKey == null ? '' : String(inputs.secretKey), keyEncoding);
        const message = inputs.message == null ? '' : String(inputs.message);
        callback(undefined, crypto.createHmac(alg, key).update(message, 'utf8').digest(fmt));
    } catch (e) {
        callback(e, null);
    }
};
