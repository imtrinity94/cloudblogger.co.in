var CryptoUtils = System.getModule("in.co.cloudblogger.crypto").CryptoUtils();
return new CryptoUtils().digest(algorithm || "SHA-256", text, outputFormat || "hex");
