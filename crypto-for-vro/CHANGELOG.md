# Changelog

All changes to Crypto for VCF Operations Orchestrator, newest first.

## 1.0.0 (2026-11-12)

- First release.
- ES5 module `in.co.cloudblogger.crypto`: `CryptoUtils` (UTF-8, hex, Base64/Base64URL, SHA-1/256/512, HMAC-SHA1/256/512, constant-time compare, random bytes), `AesCipher` (lab/test only) and the wrappers `base64Encode`, `base64Decode`, `computeHash`, `computeHmac`, `verifyHmacSignature`.
- Node.js 24 module `in.co.cloudblogger.crypto.node`: `computeHash`, `computeHmac`, `encryptAesText`, `decryptAesText` (AES-GCM).
