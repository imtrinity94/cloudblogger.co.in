var CryptoUtils = System.getModule("in.co.cloudblogger.crypto").CryptoUtils();
return new CryptoUtils().verifyHmac(algorithm || "SHA-256", secretKey, message, signature, signatureFormat || "hex", keyFormat || "text");
