/**
 * @class CryptoUtils
 * @description Pure ES5 encoding, hashing and HMAC helpers for Orchestrator (no Crypto plugin needed).
 *   - UTF-8 <-> bytes, hex, Base64 and Base64URL
 *   - SHA-1, SHA-256, SHA-512 (FIPS 180-4)
 *   - HMAC-SHA1, HMAC-SHA256, HMAC-SHA512 (RFC 2104)
 *   - Timing-safe string comparison (for webhook signature checks)
 *   - Random bytes taken from System.nextUUID() (backed by a secure random source)
 *
 * Byte arrays are plain JavaScript arrays of numbers 0-255.
 * Formats: input "text" (UTF-8, default), "hex", "base64", "base64url" or a byte array;
 *          output "hex" (default), "base64", "base64url", "text" or "bytes".
 *
 * Usage:
 *   var CryptoUtils = System.getModule("in.co.cloudblogger.crypto").CryptoUtils();
 *   var crypto = new CryptoUtils();
 *   crypto.digest("SHA-256", "abc");                       // hex digest
 *   crypto.hmac("SHA-256", secret, payload, "base64");     // base64 signature
 *   crypto.base64Encode("hello");                          // "aGVsbG8="
 *
 * @return {*} The CryptoUtils constructor
 */

var TWO_32 = 4294967296;
var B64_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
var B64_LOOKUP = {};
(function () {
    for (var i = 0; i < B64_CHARS.length; i++) {
        B64_LOOKUP[B64_CHARS.charAt(i)] = i;
    }
})();

var K256 = [
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
    0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
    0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
    0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2
];

// SHA-512 round constants as [high, low] 32-bit pairs
var K512 = [
    0x428a2f98, 0xd728ae22, 0x71374491, 0x23ef65cd, 0xb5c0fbcf, 0xec4d3b2f, 0xe9b5dba5, 0x8189dbbc,
    0x3956c25b, 0xf348b538, 0x59f111f1, 0xb605d019, 0x923f82a4, 0xaf194f9b, 0xab1c5ed5, 0xda6d8118,
    0xd807aa98, 0xa3030242, 0x12835b01, 0x45706fbe, 0x243185be, 0x4ee4b28c, 0x550c7dc3, 0xd5ffb4e2,
    0x72be5d74, 0xf27b896f, 0x80deb1fe, 0x3b1696b1, 0x9bdc06a7, 0x25c71235, 0xc19bf174, 0xcf692694,
    0xe49b69c1, 0x9ef14ad2, 0xefbe4786, 0x384f25e3, 0x0fc19dc6, 0x8b8cd5b5, 0x240ca1cc, 0x77ac9c65,
    0x2de92c6f, 0x592b0275, 0x4a7484aa, 0x6ea6e483, 0x5cb0a9dc, 0xbd41fbd4, 0x76f988da, 0x831153b5,
    0x983e5152, 0xee66dfab, 0xa831c66d, 0x2db43210, 0xb00327c8, 0x98fb213f, 0xbf597fc7, 0xbeef0ee4,
    0xc6e00bf3, 0x3da88fc2, 0xd5a79147, 0x930aa725, 0x06ca6351, 0xe003826f, 0x14292967, 0x0a0e6e70,
    0x27b70a85, 0x46d22ffc, 0x2e1b2138, 0x5c26c926, 0x4d2c6dfc, 0x5ac42aed, 0x53380d13, 0x9d95b3df,
    0x650a7354, 0x8baf63de, 0x766a0abb, 0x3c77b2a8, 0x81c2c92e, 0x47edaee6, 0x92722c85, 0x1482353b,
    0xa2bfe8a1, 0x4cf10364, 0xa81a664b, 0xbc423001, 0xc24b8b70, 0xd0f89791, 0xc76c51a3, 0x0654be30,
    0xd192e819, 0xd6ef5218, 0xd6990624, 0x5565a910, 0xf40e3585, 0x5771202a, 0x106aa070, 0x32bbd1b8,
    0x19a4c116, 0xb8d2d0c8, 0x1e376c08, 0x5141ab53, 0x2748774c, 0xdf8eeb99, 0x34b0bcb5, 0xe19b48a8,
    0x391c0cb3, 0xc5c95a63, 0x4ed8aa4a, 0xe3418acb, 0x5b9cca4f, 0x7763e373, 0x682e6ff3, 0xd6b2b8a3,
    0x748f82ee, 0x5defb2fc, 0x78a5636f, 0x43172f60, 0x84c87814, 0xa1f0ab72, 0x8cc70208, 0x1a6439ec,
    0x90befffa, 0x23631e28, 0xa4506ceb, 0xde82bde9, 0xbef9a3f7, 0xb2c67915, 0xc67178f2, 0xe372532b,
    0xca273ece, 0xea26619c, 0xd186b8c7, 0x21c0c207, 0xeada7dd6, 0xcde0eb1e, 0xf57d4f7f, 0xee6ed178,
    0x06f067aa, 0x72176fba, 0x0a637dc5, 0xa2c898a6, 0x113f9804, 0xbef90dae, 0x1b710b35, 0x131c471b,
    0x28db77f5, 0x23047d84, 0x32caab7b, 0x40c72493, 0x3c9ebe0a, 0x15c9bebc, 0x431d67c4, 0x9c100d4c,
    0x4cc5d4be, 0xcb3e42b6, 0x597f299c, 0xfc657e2a, 0x5fcb6fab, 0x3ad6faec, 0x6c44198c, 0x4a475817
];

var H512_INIT = [
    0x6a09e667, 0xf3bcc908, 0xbb67ae85, 0x84caa73b, 0x3c6ef372, 0xfe94f82b, 0xa54ff53a, 0x5f1d36f1,
    0x510e527f, 0xade682d1, 0x9b05688c, 0x2b3e6c1f, 0x1f83d9ab, 0xfb41bd6b, 0x5be0cd19, 0x137e2179
];

var BLOCK_SIZES = { SHA1: 64, SHA256: 64, SHA512: 128 };
var HASHERS = { SHA1: sha1Bytes, SHA256: sha256Bytes, SHA512: sha512Bytes };

/* ======================= Internal helpers ======================= */

function isByteArray(value) {
    return Object.prototype.toString.call(value) === "[object Array]";
}

function normaliseAlgorithm(algorithm) {
    var alg = String(algorithm || "SHA-256").toUpperCase().replace(/[^A-Z0-9]/g, "");
    if (alg === "SHA1" || alg === "SHA256" || alg === "SHA512") {
        return alg;
    }
    throw new Error("[CryptoUtils] Unsupported algorithm '" + algorithm + "'. Use SHA-1, SHA-256 or SHA-512.");
}

function rotr(x, n) {
    return (x >>> n) | (x << (32 - n));
}

function rotl(x, n) {
    return (x << n) | (x >>> (32 - n));
}

// 64-bit rotate right on a (high, low) pair; n must not be 0 or 32
function rotrH(h, l, n) {
    return n < 32 ? ((h >>> n) | (l << (32 - n))) : ((l >>> (n - 32)) | (h << (64 - n)));
}

function rotrL(h, l, n) {
    return n < 32 ? ((l >>> n) | (h << (32 - n))) : ((h >>> (n - 32)) | (l << (64 - n)));
}

function add64Into(target, index, h, l) {
    var lo = (target[index + 1] >>> 0) + (l >>> 0);
    target[index] = (target[index] + h + Math.floor(lo / TWO_32)) | 0;
    target[index + 1] = lo | 0;
}

// Pads a message (Merkle-Damgard) and returns big-endian 32-bit words
function bytesToWords(bytes, blockBytes, lengthBytes) {
    var len = bytes.length;
    var totalBytes = Math.ceil((len + 1 + lengthBytes) / blockBytes) * blockBytes;
    var words = new Array(totalBytes / 4);
    var i;
    for (i = 0; i < words.length; i++) {
        words[i] = 0;
    }
    for (i = 0; i < len; i++) {
        words[i >> 2] |= (bytes[i] & 0xff) << (24 - (i % 4) * 8);
    }
    words[len >> 2] |= 0x80 << (24 - (len % 4) * 8);
    words[words.length - 1] = (len * 8) | 0;
    words[words.length - 2] = Math.floor(len / 536870912) | 0;
    return words;
}

function wordsToBytes(words) {
    var out = [];
    for (var i = 0; i < words.length; i++) {
        var w = words[i];
        out.push((w >>> 24) & 0xff, (w >>> 16) & 0xff, (w >>> 8) & 0xff, w & 0xff);
    }
    return out;
}

/* ======================= Hash functions ======================= */

function sha1Bytes(bytes) {
    var m = bytesToWords(bytes, 64, 8);
    var H = [0x67452301, 0xefcdab89, 0x98badcfe, 0x10325476, 0xc3d2e1f0];
    var W = new Array(80);
    var a, b, c, d, e, f, k, t, x, temp, off;
    for (off = 0; off < m.length; off += 16) {
        for (t = 0; t < 16; t++) {
            W[t] = m[off + t];
        }
        for (t = 16; t < 80; t++) {
            x = W[t - 3] ^ W[t - 8] ^ W[t - 14] ^ W[t - 16];
            W[t] = rotl(x, 1);
        }
        a = H[0]; b = H[1]; c = H[2]; d = H[3]; e = H[4];
        for (t = 0; t < 80; t++) {
            if (t < 20) {
                f = (b & c) | (~b & d);
                k = 0x5a827999;
            } else if (t < 40) {
                f = b ^ c ^ d;
                k = 0x6ed9eba1;
            } else if (t < 60) {
                f = (b & c) | (b & d) | (c & d);
                k = 0x8f1bbcdc;
            } else {
                f = b ^ c ^ d;
                k = 0xca62c1d6;
            }
            temp = (rotl(a, 5) + f + e + k + W[t]) | 0;
            e = d;
            d = c;
            c = rotl(b, 30);
            b = a;
            a = temp;
        }
        H[0] = (H[0] + a) | 0;
        H[1] = (H[1] + b) | 0;
        H[2] = (H[2] + c) | 0;
        H[3] = (H[3] + d) | 0;
        H[4] = (H[4] + e) | 0;
    }
    return wordsToBytes(H);
}

function sha256Bytes(bytes) {
    var m = bytesToWords(bytes, 64, 8);
    var H = [0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19];
    var W = new Array(64);
    var a, b, c, d, e, f, g, h, t, t1, t2, x, y, off;
    for (off = 0; off < m.length; off += 16) {
        for (t = 0; t < 16; t++) {
            W[t] = m[off + t];
        }
        for (t = 16; t < 64; t++) {
            x = W[t - 15];
            y = W[t - 2];
            W[t] = (W[t - 16] + (rotr(x, 7) ^ rotr(x, 18) ^ (x >>> 3)) +
                W[t - 7] + (rotr(y, 17) ^ rotr(y, 19) ^ (y >>> 10))) | 0;
        }
        a = H[0]; b = H[1]; c = H[2]; d = H[3]; e = H[4]; f = H[5]; g = H[6]; h = H[7];
        for (t = 0; t < 64; t++) {
            t1 = (h + (rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25)) + ((e & f) ^ (~e & g)) + K256[t] + W[t]) | 0;
            t2 = ((rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22)) + ((a & b) ^ (a & c) ^ (b & c))) | 0;
            h = g;
            g = f;
            f = e;
            e = (d + t1) | 0;
            d = c;
            c = b;
            b = a;
            a = (t1 + t2) | 0;
        }
        H[0] = (H[0] + a) | 0;
        H[1] = (H[1] + b) | 0;
        H[2] = (H[2] + c) | 0;
        H[3] = (H[3] + d) | 0;
        H[4] = (H[4] + e) | 0;
        H[5] = (H[5] + f) | 0;
        H[6] = (H[6] + g) | 0;
        H[7] = (H[7] + h) | 0;
    }
    return wordsToBytes(H);
}

function sha512Bytes(bytes) {
    var m = bytesToWords(bytes, 128, 16);
    var H = H512_INIT.slice(0);
    var Wh = new Array(80);
    var Wl = new Array(80);
    var ah, al, bh, bl, ch, cl, dh, dl, eh, el, fh, fl, gh, gl, hh, hl;
    var t, off, xh, xl, yh, yl, s0h, s0l, s1h, s1l, chH, chL, mjH, mjL, t1h, t1l, t2h, t2l, lo;
    for (off = 0; off < m.length; off += 32) {
        for (t = 0; t < 16; t++) {
            Wh[t] = m[off + 2 * t];
            Wl[t] = m[off + 2 * t + 1];
        }
        for (t = 16; t < 80; t++) {
            xh = Wh[t - 15];
            xl = Wl[t - 15];
            s0h = rotrH(xh, xl, 1) ^ rotrH(xh, xl, 8) ^ (xh >>> 7);
            s0l = rotrL(xh, xl, 1) ^ rotrL(xh, xl, 8) ^ ((xl >>> 7) | (xh << 25));
            yh = Wh[t - 2];
            yl = Wl[t - 2];
            s1h = rotrH(yh, yl, 19) ^ rotrH(yh, yl, 61) ^ (yh >>> 6);
            s1l = rotrL(yh, yl, 19) ^ rotrL(yh, yl, 61) ^ ((yl >>> 6) | (yh << 26));
            lo = (Wl[t - 16] >>> 0) + (s0l >>> 0) + (Wl[t - 7] >>> 0) + (s1l >>> 0);
            Wh[t] = (Wh[t - 16] + s0h + Wh[t - 7] + s1h + Math.floor(lo / TWO_32)) | 0;
            Wl[t] = lo | 0;
        }
        ah = H[0]; al = H[1]; bh = H[2]; bl = H[3]; ch = H[4]; cl = H[5]; dh = H[6]; dl = H[7];
        eh = H[8]; el = H[9]; fh = H[10]; fl = H[11]; gh = H[12]; gl = H[13]; hh = H[14]; hl = H[15];
        for (t = 0; t < 80; t++) {
            s1h = rotrH(eh, el, 14) ^ rotrH(eh, el, 18) ^ rotrH(eh, el, 41);
            s1l = rotrL(eh, el, 14) ^ rotrL(eh, el, 18) ^ rotrL(eh, el, 41);
            chH = (eh & fh) ^ (~eh & gh);
            chL = (el & fl) ^ (~el & gl);
            t1l = (hl >>> 0) + (s1l >>> 0) + (chL >>> 0) + (K512[2 * t + 1] >>> 0) + (Wl[t] >>> 0);
            t1h = (hh + s1h + chH + K512[2 * t] + Wh[t] + Math.floor(t1l / TWO_32)) | 0;
            t1l = t1l | 0;
            s0h = rotrH(ah, al, 28) ^ rotrH(ah, al, 34) ^ rotrH(ah, al, 39);
            s0l = rotrL(ah, al, 28) ^ rotrL(ah, al, 34) ^ rotrL(ah, al, 39);
            mjH = (ah & bh) ^ (ah & ch) ^ (bh & ch);
            mjL = (al & bl) ^ (al & cl) ^ (bl & cl);
            t2l = (s0l >>> 0) + (mjL >>> 0);
            t2h = (s0h + mjH + Math.floor(t2l / TWO_32)) | 0;
            t2l = t2l | 0;
            hh = gh; hl = gl;
            gh = fh; gl = fl;
            fh = eh; fl = el;
            lo = (dl >>> 0) + (t1l >>> 0);
            eh = (dh + t1h + Math.floor(lo / TWO_32)) | 0;
            el = lo | 0;
            dh = ch; dl = cl;
            ch = bh; cl = bl;
            bh = ah; bl = al;
            lo = (t1l >>> 0) + (t2l >>> 0);
            ah = (t1h + t2h + Math.floor(lo / TWO_32)) | 0;
            al = lo | 0;
        }
        add64Into(H, 0, ah, al);
        add64Into(H, 2, bh, bl);
        add64Into(H, 4, ch, cl);
        add64Into(H, 6, dh, dl);
        add64Into(H, 8, eh, el);
        add64Into(H, 10, fh, fl);
        add64Into(H, 12, gh, gl);
        add64Into(H, 14, hh, hl);
    }
    return wordsToBytes(H);
}

/* ======================= Public class ======================= */

function CryptoUtils() {
}

/* ---------- Encoding ---------- */

/**
 * Encode a string as UTF-8 bytes (surrogate pairs handled, lone surrogates become U+FFFD).
 * @param {string} text
 * @return {Array} bytes
 */
CryptoUtils.prototype.utf8ToBytes = function (text) {
    var str = (text === null || text === undefined) ? "" : String(text);
    var bytes = [];
    var i, c, c2, cp;
    for (i = 0; i < str.length; i++) {
        c = str.charCodeAt(i);
        if (c < 0x80) {
            bytes.push(c);
        } else if (c < 0x800) {
            bytes.push(0xc0 | (c >> 6), 0x80 | (c & 0x3f));
        } else if (c >= 0xd800 && c <= 0xdbff && i + 1 < str.length &&
            (c2 = str.charCodeAt(i + 1)) >= 0xdc00 && c2 <= 0xdfff) {
            cp = ((c - 0xd800) << 10) + (c2 - 0xdc00) + 0x10000;
            i++;
            bytes.push(0xf0 | (cp >> 18), 0x80 | ((cp >> 12) & 0x3f), 0x80 | ((cp >> 6) & 0x3f), 0x80 | (cp & 0x3f));
        } else if (c >= 0xd800 && c <= 0xdfff) {
            bytes.push(0xef, 0xbf, 0xbd);
        } else {
            bytes.push(0xe0 | (c >> 12), 0x80 | ((c >> 6) & 0x3f), 0x80 | (c & 0x3f));
        }
    }
    return bytes;
};

/**
 * Decode UTF-8 bytes to a string.
 * @param {Array} bytes
 * @return {string}
 */
CryptoUtils.prototype.bytesToUtf8 = function (bytes) {
    var chars = [];
    var i = 0;
    var b, cp;
    while (i < bytes.length) {
        b = bytes[i++] & 0xff;
        if (b < 0x80) {
            cp = b;
        } else if (b >= 0xc0 && b < 0xe0) {
            cp = ((b & 0x1f) << 6) | (bytes[i++] & 0x3f);
        } else if (b >= 0xe0 && b < 0xf0) {
            cp = ((b & 0x0f) << 12) | ((bytes[i++] & 0x3f) << 6) | (bytes[i++] & 0x3f);
        } else if (b >= 0xf0 && b < 0xf8) {
            cp = ((b & 0x07) << 18) | ((bytes[i++] & 0x3f) << 12) | ((bytes[i++] & 0x3f) << 6) | (bytes[i++] & 0x3f);
        } else {
            cp = 0xfffd;
        }
        if (cp > 0xffff) {
            cp -= 0x10000;
            chars.push(String.fromCharCode(0xd800 + (cp >> 10), 0xdc00 + (cp & 0x3ff)));
        } else {
            chars.push(String.fromCharCode(cp));
        }
    }
    return chars.join("");
};

/**
 * @param {Array} bytes
 * @return {string} lower-case hex
 */
CryptoUtils.prototype.bytesToHex = function (bytes) {
    var out = [];
    for (var i = 0; i < bytes.length; i++) {
        var h = (bytes[i] & 0xff).toString(16);
        out.push(h.length < 2 ? "0" + h : h);
    }
    return out.join("");
};

/**
 * @param {string} hex - whitespace and an optional 0x prefix are ignored
 * @return {Array} bytes
 */
CryptoUtils.prototype.hexToBytes = function (hex) {
    var s = String(hex || "").replace(/\s+/g, "").replace(/^0x/i, "");
    if (s.length % 2 !== 0 || /[^0-9a-fA-F]/.test(s)) {
        throw new Error("[CryptoUtils] Invalid hex string.");
    }
    var bytes = [];
    for (var i = 0; i < s.length; i += 2) {
        bytes.push(parseInt(s.substr(i, 2), 16));
    }
    return bytes;
};

/**
 * @param {Array} bytes
 * @param {boolean} [urlSafe=false] - Base64URL alphabet without padding (JWT style)
 * @return {string}
 */
CryptoUtils.prototype.bytesToBase64 = function (bytes, urlSafe) {
    var out = [];
    var len = bytes.length;
    var i, n;
    for (i = 0; i + 2 < len; i += 3) {
        n = ((bytes[i] & 0xff) << 16) | ((bytes[i + 1] & 0xff) << 8) | (bytes[i + 2] & 0xff);
        out.push(B64_CHARS.charAt((n >> 18) & 63) + B64_CHARS.charAt((n >> 12) & 63) +
            B64_CHARS.charAt((n >> 6) & 63) + B64_CHARS.charAt(n & 63));
    }
    if (len - i === 1) {
        n = (bytes[i] & 0xff) << 16;
        out.push(B64_CHARS.charAt((n >> 18) & 63) + B64_CHARS.charAt((n >> 12) & 63) + "==");
    } else if (len - i === 2) {
        n = ((bytes[i] & 0xff) << 16) | ((bytes[i + 1] & 0xff) << 8);
        out.push(B64_CHARS.charAt((n >> 18) & 63) + B64_CHARS.charAt((n >> 12) & 63) +
            B64_CHARS.charAt((n >> 6) & 63) + "=");
    }
    var result = out.join("");
    if (urlSafe === true) {
        result = result.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
    }
    return result;
};

/**
 * Accepts standard Base64 and Base64URL, with or without padding; whitespace is ignored.
 * @param {string} encoded
 * @return {Array} bytes
 */
CryptoUtils.prototype.base64ToBytes = function (encoded) {
    var s = String(encoded || "").replace(/\s+/g, "").replace(/-/g, "+").replace(/_/g, "/").replace(/=+$/, "");
    if (/[^A-Za-z0-9+\/]/.test(s) || s.length % 4 === 1) {
        throw new Error("[CryptoUtils] Invalid Base64 string.");
    }
    var bytes = [];
    var buffer = 0;
    var bits = 0;
    for (var i = 0; i < s.length; i++) {
        buffer = (buffer << 6) | B64_LOOKUP[s.charAt(i)];
        bits += 6;
        if (bits >= 8) {
            bits -= 8;
            bytes.push((buffer >> bits) & 0xff);
            buffer = buffer & ((1 << bits) - 1);
        }
    }
    return bytes;
};

/**
 * @param {string} text
 * @param {boolean} [urlSafe=false]
 * @return {string} Base64 of the UTF-8 bytes
 */
CryptoUtils.prototype.base64Encode = function (text, urlSafe) {
    return this.bytesToBase64(this.utf8ToBytes(text), urlSafe);
};

/**
 * @param {string} encoded
 * @return {string} UTF-8 decoded text
 */
CryptoUtils.prototype.base64Decode = function (encoded) {
    return this.bytesToUtf8(this.base64ToBytes(encoded));
};

/**
 * Normalise any supported input into a byte array.
 * @param {*} input - string or byte array
 * @param {string} [inputFormat="text"] - text | hex | base64 | base64url (ignored for byte arrays)
 * @return {Array} bytes
 */
CryptoUtils.prototype.toBytes = function (input, inputFormat) {
    if (isByteArray(input)) {
        return input;
    }
    var fmt = String(inputFormat || "text").toLowerCase();
    if (fmt === "text" || fmt === "utf8" || fmt === "utf-8") {
        return this.utf8ToBytes(input);
    }
    if (fmt === "hex") {
        return this.hexToBytes(input);
    }
    if (fmt === "base64" || fmt === "base64url") {
        return this.base64ToBytes(input);
    }
    throw new Error("[CryptoUtils] Unsupported input format '" + inputFormat + "'. Use text, hex, base64 or base64url.");
};

/**
 * @param {Array} bytes
 * @param {string} [outputFormat="hex"] - hex | base64 | base64url | text | bytes
 * @return {*}
 */
CryptoUtils.prototype.encodeBytes = function (bytes, outputFormat) {
    var fmt = String(outputFormat || "hex").toLowerCase();
    if (fmt === "hex") {
        return this.bytesToHex(bytes);
    }
    if (fmt === "base64") {
        return this.bytesToBase64(bytes, false);
    }
    if (fmt === "base64url") {
        return this.bytesToBase64(bytes, true);
    }
    if (fmt === "text" || fmt === "utf8" || fmt === "utf-8") {
        return this.bytesToUtf8(bytes);
    }
    if (fmt === "bytes") {
        return bytes;
    }
    throw new Error("[CryptoUtils] Unsupported output format '" + outputFormat + "'. Use hex, base64, base64url, text or bytes.");
};

/* ---------- Hashing ---------- */

/**
 * @param {string} algorithm - SHA-1 | SHA-256 | SHA-512
 * @param {*} input - text (UTF-8) or byte array
 * @return {Array} digest bytes
 */
CryptoUtils.prototype.hashBytes = function (algorithm, input) {
    return HASHERS[normaliseAlgorithm(algorithm)](this.toBytes(input));
};

/**
 * @param {string} algorithm - SHA-1 | SHA-256 | SHA-512
 * @param {*} input - text (UTF-8) or byte array
 * @param {string} [outputFormat="hex"]
 * @return {*} digest
 */
CryptoUtils.prototype.digest = function (algorithm, input, outputFormat) {
    return this.encodeBytes(this.hashBytes(algorithm, input), outputFormat);
};

CryptoUtils.prototype.sha1 = function (input, outputFormat) {
    return this.digest("SHA-1", input, outputFormat);
};

CryptoUtils.prototype.sha256 = function (input, outputFormat) {
    return this.digest("SHA-256", input, outputFormat);
};

CryptoUtils.prototype.sha512 = function (input, outputFormat) {
    return this.digest("SHA-512", input, outputFormat);
};

/* ---------- HMAC ---------- */

/**
 * @param {string} algorithm - SHA-1 | SHA-256 | SHA-512
 * @param {*} key - string or byte array
 * @param {*} message - text (UTF-8) or byte array
 * @param {string} [keyFormat="text"] - text | hex | base64 | base64url
 * @return {Array} MAC bytes
 */
CryptoUtils.prototype.hmacBytes = function (algorithm, key, message, keyFormat) {
    var alg = normaliseAlgorithm(algorithm);
    var hashFn = HASHERS[alg];
    var blockSize = BLOCK_SIZES[alg];
    var k = this.toBytes(key, keyFormat);
    var msg = this.toBytes(message);
    if (k.length > blockSize) {
        k = hashFn(k);
    }
    var ipad = new Array(blockSize);
    var opad = new Array(blockSize);
    for (var i = 0; i < blockSize; i++) {
        var b = i < k.length ? (k[i] & 0xff) : 0;
        ipad[i] = b ^ 0x36;
        opad[i] = b ^ 0x5c;
    }
    return hashFn(opad.concat(hashFn(ipad.concat(msg))));
};

/**
 * @param {string} algorithm - SHA-1 | SHA-256 | SHA-512
 * @param {*} key
 * @param {*} message
 * @param {string} [outputFormat="hex"]
 * @param {string} [keyFormat="text"]
 * @return {*} MAC
 */
CryptoUtils.prototype.hmac = function (algorithm, key, message, outputFormat, keyFormat) {
    return this.encodeBytes(this.hmacBytes(algorithm, key, message, keyFormat), outputFormat);
};

/**
 * Verify a received HMAC signature in constant time.
 * A "sha256=" style prefix is stripped for hex signatures (GitHub-style webhooks).
 * @param {string} algorithm
 * @param {*} key
 * @param {*} message
 * @param {string} signature
 * @param {string} [signatureFormat="hex"] - hex | base64 | base64url
 * @param {string} [keyFormat="text"]
 * @return {boolean}
 */
CryptoUtils.prototype.verifyHmac = function (algorithm, key, message, signature, signatureFormat, keyFormat) {
    var fmt = String(signatureFormat || "hex").toLowerCase();
    var expected = this.hmac(algorithm, key, message, fmt, keyFormat);
    var received = String(signature || "").replace(/^\s+|\s+$/g, "");
    if (fmt === "hex") {
        received = received.replace(/^[A-Za-z0-9\-]+=/, "").toLowerCase();
    } else if (fmt === "base64url") {
        received = received.replace(/=+$/, "");
    }
    return this.timingSafeEqual(expected, received);
};

/* ---------- Misc ---------- */

/**
 * Compare two strings without returning early on the first difference.
 * @param {string} a
 * @param {string} b
 * @return {boolean}
 */
CryptoUtils.prototype.timingSafeEqual = function (a, b) {
    var x = String(a);
    var y = String(b);
    var diff = x.length ^ y.length;
    var len = Math.max(x.length, y.length);
    for (var i = 0; i < len; i++) {
        diff |= (i < x.length ? x.charCodeAt(i) : 0) ^ (i < y.length ? y.charCodeAt(i) : 0);
    }
    return diff === 0;
};

/**
 * Random bytes taken from System.nextUUID() (random UUIDs come from a secure random source).
 * Version and variant nibbles are skipped, so each UUID contributes 15 random bytes.
 * @param {number} count
 * @return {Array} bytes
 */
CryptoUtils.prototype.randomBytes = function (count) {
    var out = [];
    var hex, i;
    while (out.length < count) {
        hex = String(System.nextUUID()).replace(/-/g, "");
        hex = hex.substring(0, 12) + hex.substring(13, 16) + hex.substring(17);
        for (i = 0; i + 1 < hex.length && out.length < count; i += 2) {
            out.push(parseInt(hex.substr(i, 2), 16));
        }
    }
    return out;
};

return CryptoUtils;
