/**
 * @description Times crypto operations with the ES5 module on a generated payload.
 * Returns Properties: <op>.medianMs / .minMs / .maxMs for sha256, hmac, aesEncrypt, aesDecrypt,
 * plus sha256.digest and hmac.digest. The payload is the same one the workflow builds:
 * "abcdefghijklmnopqrstuvwxyz0123456789" repeated and cut to payloadSizeBytes.
 */
var logPrefix = "[CB][measureCryptoTimings] ";

if (!payloadSizeBytes || payloadSizeBytes < 1 || payloadSizeBytes > 1048576) {
    throw logPrefix + "payloadSizeBytes must be between 1 and 1048576";
}
if (!repetitions || repetitions < 1 || repetitions > 100) {
    throw logPrefix + "repetitions must be between 1 and 100";
}
if (!hmacKey || !aesKeyHex) {
    throw logPrefix + "hmacKey and aesKeyHex are required";
}

function buildPayload(size) {
    var chunk = "abcdefghijklmnopqrstuvwxyz0123456789";
    var parts = [];
    var length = 0;
    while (length < size) {
        parts.push(chunk);
        length += chunk.length;
    }
    return parts.join("").substring(0, size);
}

function measure(fn, count) {
    var times = [];
    var result = null;
    for (var i = 0; i < count; i++) {
        var start = new Date().getTime();
        result = fn();
        times.push(new Date().getTime() - start);
    }
    times.sort(function (a, b) { return a - b; });
    return { median: times[Math.floor(times.length / 2)], min: times[0], max: times[times.length - 1], result: result };
}

var payload = buildPayload(Math.floor(payloadSizeBytes));
var reps = Math.floor(repetitions);
var cryptoModule = System.getModule("in.co.cloudblogger.crypto");
var CryptoUtils = cryptoModule.CryptoUtils();
var AesCipher = cryptoModule.AesCipher();
var crypto = new CryptoUtils();
var aes = new AesCipher(String(aesKeyHex), "hex");
var key = String(hmacKey);
var token = null;

var ops = {};
ops.sha256 = measure(function () { return crypto.sha256(payload); }, reps);
ops.hmac = measure(function () { return crypto.hmac("SHA-256", key, payload); }, reps);
ops.aesEncrypt = measure(function () { token = aes.encryptText(payload); return token; }, reps);
ops.aesDecrypt = measure(function () { return aes.decryptText(token); }, reps);

if (ops.aesDecrypt.result !== payload) {
    throw logPrefix + "AES round trip returned different text";
}

var out = new Properties();
var names = ["sha256", "hmac", "aesEncrypt", "aesDecrypt"];
for (var n = 0; n < names.length; n++) {
    out.put(names[n] + ".medianMs", ops[names[n]].median);
    out.put(names[n] + ".minMs", ops[names[n]].min);
    out.put(names[n] + ".maxMs", ops[names[n]].max);
}
out.put("sha256.digest", ops.sha256.result);
out.put("hmac.digest", ops.hmac.result);

System.log(logPrefix + "ES5 done: SHA-256 " + ops.sha256.median + " ms, AES encrypt " + ops.aesEncrypt.median + " ms (medians of " + reps + ")");
return out;
