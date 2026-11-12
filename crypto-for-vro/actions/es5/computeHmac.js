var CryptoUtils = System.getModule("in.co.cloudblogger.crypto").CryptoUtils();
return new CryptoUtils().hmac(algorithm || "SHA-256", secretKey, message, outputFormat || "hex", keyFormat || "text");
