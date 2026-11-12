/**
 * @class AesCipher
 * @description LAB / TEST USE ONLY.
 *   Pure ES5 AES (FIPS-197) with 128, 192 or 256-bit keys, CBC mode and PKCS#7 padding.
 *   Table lookups are not constant-time and CBC on its own is not authenticated, so do not
 *   use this to protect real secrets. Use SecureString attributes / config elements for those.
 *
 * Usage:
 *   var AesCipher = System.getModule("in.co.cloudblogger.crypto").AesCipher();
 *   var aes = new AesCipher("000102030405060708090a0b0c0d0e0f", "hex");
 *   var token = aes.encryptText("hello");     // Base64 of (random IV || ciphertext)
 *   var plain = aes.decryptText(token);       // "hello"
 *
 * @return {*} The AesCipher constructor
 */

var CryptoUtils = System.getModule("in.co.cloudblogger.crypto").CryptoUtils();
var utils = new CryptoUtils();

var SBOX = new Array(256);
var INV_SBOX = new Array(256);
var EXP = new Array(256);
var LOG = new Array(256);

function xtime(b) {
    return ((b << 1) ^ ((b & 0x80) ? 0x1b : 0)) & 0xff;
}

function rotl8(b, n) {
    return ((b << n) | (b >> (8 - n))) & 0xff;
}

function gmul(a, b) {
    if (a === 0 || b === 0) {
        return 0;
    }
    return EXP[(LOG[a] + LOG[b]) % 255];
}

// Build GF(2^8) log tables (generator 3) and derive the S-boxes instead of hard-coding them
(function () {
    var p = 1;
    var i, inv, s;
    for (i = 0; i < 255; i++) {
        EXP[i] = p;
        LOG[p] = i;
        p = p ^ xtime(p);
    }
    EXP[255] = EXP[0];
    for (i = 0; i < 256; i++) {
        inv = (i === 0) ? 0 : EXP[(255 - LOG[i]) % 255];
        s = inv ^ rotl8(inv, 1) ^ rotl8(inv, 2) ^ rotl8(inv, 3) ^ rotl8(inv, 4) ^ 0x63;
        SBOX[i] = s;
        INV_SBOX[s] = i;
    }
})();

function expandKey(key) {
    var nk = key.length / 4;
    var nr = nk + 6;
    var total = 4 * (nr + 1);
    var w = [];
    var rcon = 1;
    var i, j, t, first;
    for (i = 0; i < key.length; i++) {
        w.push(key[i] & 0xff);
    }
    for (i = nk; i < total; i++) {
        t = [w[(i - 1) * 4], w[(i - 1) * 4 + 1], w[(i - 1) * 4 + 2], w[(i - 1) * 4 + 3]];
        if (i % nk === 0) {
            first = t[0];
            t = [SBOX[t[1]] ^ rcon, SBOX[t[2]], SBOX[t[3]], SBOX[first]];
            rcon = xtime(rcon);
        } else if (nk > 6 && i % nk === 4) {
            t = [SBOX[t[0]], SBOX[t[1]], SBOX[t[2]], SBOX[t[3]]];
        }
        for (j = 0; j < 4; j++) {
            w.push(w[(i - nk) * 4 + j] ^ t[j]);
        }
    }
    return { rounds: nr, words: w };
}

function shiftRows(s) {
    var o = new Array(16);
    for (var c = 0; c < 4; c++) {
        for (var r = 0; r < 4; r++) {
            o[r + 4 * c] = s[r + 4 * ((c + r) % 4)];
        }
    }
    return o;
}

function invShiftRows(s) {
    var o = new Array(16);
    for (var c = 0; c < 4; c++) {
        for (var r = 0; r < 4; r++) {
            o[r + 4 * ((c + r) % 4)] = s[r + 4 * c];
        }
    }
    return o;
}

function mixColumns(s) {
    var o = new Array(16);
    for (var c = 0; c < 4; c++) {
        var a0 = s[4 * c], a1 = s[4 * c + 1], a2 = s[4 * c + 2], a3 = s[4 * c + 3];
        o[4 * c] = xtime(a0) ^ xtime(a1) ^ a1 ^ a2 ^ a3;
        o[4 * c + 1] = a0 ^ xtime(a1) ^ xtime(a2) ^ a2 ^ a3;
        o[4 * c + 2] = a0 ^ a1 ^ xtime(a2) ^ xtime(a3) ^ a3;
        o[4 * c + 3] = xtime(a0) ^ a0 ^ a1 ^ a2 ^ xtime(a3);
    }
    return o;
}

function invMixColumns(s) {
    var o = new Array(16);
    for (var c = 0; c < 4; c++) {
        var a0 = s[4 * c], a1 = s[4 * c + 1], a2 = s[4 * c + 2], a3 = s[4 * c + 3];
        o[4 * c] = gmul(a0, 14) ^ gmul(a1, 11) ^ gmul(a2, 13) ^ gmul(a3, 9);
        o[4 * c + 1] = gmul(a0, 9) ^ gmul(a1, 14) ^ gmul(a2, 11) ^ gmul(a3, 13);
        o[4 * c + 2] = gmul(a0, 13) ^ gmul(a1, 9) ^ gmul(a2, 14) ^ gmul(a3, 11);
        o[4 * c + 3] = gmul(a0, 11) ^ gmul(a1, 13) ^ gmul(a2, 9) ^ gmul(a3, 14);
    }
    return o;
}

function checkIv(iv) {
    if (!iv || iv.length !== 16) {
        throw new Error("[AesCipher] IV must be 16 bytes.");
    }
}

/**
 * @param {*} key - 16, 24 or 32 bytes, as a byte array or an encoded string
 * @param {string} [keyFormat="hex"] - hex | base64 | base64url | text (ignored for byte arrays)
 */
function AesCipher(key, keyFormat) {
    var k = utils.toBytes(key, keyFormat || "hex");
    if (k.length !== 16 && k.length !== 24 && k.length !== 32) {
        throw new Error("[AesCipher] Key must be 16, 24 or 32 bytes (got " + k.length + ").");
    }
    var expanded = expandKey(k);
    this.rounds = expanded.rounds;
    this.roundKeys = expanded.words;
}

/**
 * Encrypt a single 16-byte block (raw AES, no mode).
 * @param {Array} block
 * @return {Array}
 */
AesCipher.prototype.encryptBlock = function (block) {
    if (!block || block.length !== 16) {
        throw new Error("[AesCipher] Block must be 16 bytes.");
    }
    var w = this.roundKeys;
    var nr = this.rounds;
    var s = new Array(16);
    var i, r;
    for (i = 0; i < 16; i++) {
        s[i] = (block[i] & 0xff) ^ w[i];
    }
    for (r = 1; r <= nr; r++) {
        for (i = 0; i < 16; i++) {
            s[i] = SBOX[s[i]];
        }
        s = shiftRows(s);
        if (r < nr) {
            s = mixColumns(s);
        }
        for (i = 0; i < 16; i++) {
            s[i] ^= w[r * 16 + i];
        }
    }
    return s;
};

/**
 * Decrypt a single 16-byte block (raw AES, no mode).
 * @param {Array} block
 * @return {Array}
 */
AesCipher.prototype.decryptBlock = function (block) {
    if (!block || block.length !== 16) {
        throw new Error("[AesCipher] Block must be 16 bytes.");
    }
    var w = this.roundKeys;
    var nr = this.rounds;
    var s = new Array(16);
    var i, r;
    for (i = 0; i < 16; i++) {
        s[i] = (block[i] & 0xff) ^ w[nr * 16 + i];
    }
    for (r = nr - 1; r >= 0; r--) {
        s = invShiftRows(s);
        for (i = 0; i < 16; i++) {
            s[i] = INV_SBOX[s[i]];
        }
        for (i = 0; i < 16; i++) {
            s[i] ^= w[r * 16 + i];
        }
        if (r > 0) {
            s = invMixColumns(s);
        }
    }
    return s;
};

/**
 * CBC encrypt with PKCS#7 padding.
 * @param {Array} data - plaintext bytes
 * @param {Array} iv - 16 bytes
 * @return {Array} ciphertext bytes
 */
AesCipher.prototype.encryptCbc = function (data, iv) {
    checkIv(iv);
    var pad = 16 - (data.length % 16);
    var padded = data.slice(0);
    var out = [];
    var prev = iv.slice(0);
    var i, j, block;
    for (i = 0; i < pad; i++) {
        padded.push(pad);
    }
    for (i = 0; i < padded.length; i += 16) {
        block = new Array(16);
        for (j = 0; j < 16; j++) {
            block[j] = (padded[i + j] & 0xff) ^ (prev[j] & 0xff);
        }
        prev = this.encryptBlock(block);
        for (j = 0; j < 16; j++) {
            out.push(prev[j]);
        }
    }
    return out;
};

/**
 * CBC decrypt and strip PKCS#7 padding.
 * @param {Array} data - ciphertext bytes
 * @param {Array} iv - 16 bytes
 * @return {Array} plaintext bytes
 */
AesCipher.prototype.decryptCbc = function (data, iv) {
    checkIv(iv);
    if (data.length === 0 || data.length % 16 !== 0) {
        throw new Error("[AesCipher] Ciphertext length must be a non-zero multiple of 16 bytes.");
    }
    var out = [];
    var prev = iv.slice(0);
    var i, j, block, dec;
    for (i = 0; i < data.length; i += 16) {
        block = data.slice(i, i + 16);
        dec = this.decryptBlock(block);
        for (j = 0; j < 16; j++) {
            out.push(dec[j] ^ (prev[j] & 0xff));
        }
        prev = block;
    }
    var pad = out[out.length - 1];
    var bad = (pad < 1 || pad > 16) ? 1 : 0;
    for (i = 1; i <= 16 && !bad; i++) {
        if (i <= pad && out[out.length - i] !== pad) {
            bad = 1;
        }
    }
    if (bad) {
        throw new Error("[AesCipher] Decryption failed (wrong key or corrupted data).");
    }
    out.length = out.length - pad;
    return out;
};

/**
 * Encrypt text with a random IV.
 * @param {string} text
 * @return {string} Base64 of (IV || ciphertext)
 */
AesCipher.prototype.encryptText = function (text) {
    var iv = utils.randomBytes(16);
    var cipher = this.encryptCbc(utils.utf8ToBytes(text), iv);
    return utils.bytesToBase64(iv.concat(cipher));
};

/**
 * Decrypt a token produced by encryptText.
 * @param {string} token - Base64 of (IV || ciphertext)
 * @return {string}
 */
AesCipher.prototype.decryptText = function (token) {
    var all = utils.base64ToBytes(token);
    if (all.length < 32) {
        throw new Error("[AesCipher] Token is too short.");
    }
    return utils.bytesToUtf8(this.decryptCbc(all.slice(16), all.slice(0, 16)));
};

return AesCipher;
