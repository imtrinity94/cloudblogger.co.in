const crypto = require('crypto');

const ALGORITHMS = { sha1: 'sha1', sha256: 'sha256', sha512: 'sha512' };
const FORMATS = ['hex', 'base64', 'base64url'];

exports.handler = (context, inputs, callback) => {
    try {
        const alg = ALGORITHMS[String(inputs.algorithm || 'SHA-256').toLowerCase().replace(/[^a-z0-9]/g, '')];
        if (!alg) {
            throw new Error("[computeHash] Unsupported algorithm '" + inputs.algorithm + "'. Use SHA-1, SHA-256 or SHA-512.");
        }
        const fmt = String(inputs.outputFormat || 'hex').toLowerCase();
        if (FORMATS.indexOf(fmt) === -1) {
            throw new Error("[computeHash] Unsupported output format '" + inputs.outputFormat + "'. Use hex, base64 or base64url.");
        }
        const text = inputs.text == null ? '' : String(inputs.text);
        callback(undefined, crypto.createHash(alg).update(text, 'utf8').digest(fmt));
    } catch (e) {
        callback(e, null);
    }
};
