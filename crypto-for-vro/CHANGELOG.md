# Changelog

All changes to Crypto for VCF Operations Orchestrator, newest first.

## 1.1.0 (2026-11-14)

- New workflow `CB - Crypto - Benchmark ES5 vs Node` (1.2.1): times SHA-256, HMAC-SHA256 and AES encrypt/decrypt with both modules, prints a comparison table and returns all timings as Properties.
- New ES5 action `measureCryptoTimings` (2.0.1), used by the workflow for the ES5 timings.
- Fix: the Node.js actions (now 1.1.0) were saved without the `node:24` runtime and entry point, so they ran on Rhino and failed with `"require" is not defined` when called from a workflow. They now have runtime `node:24` and entry point `handler.handler`.
- Package file is now `in.co.cloudblogger.crypto_v1.1.0_20261114.package`; the workflow schema is in `workflows/`.

## 1.0.0 (2026-11-12)

- First release.
- ES5 module `in.co.cloudblogger.crypto`: `CryptoUtils` (UTF-8, hex, Base64/Base64URL, SHA-1/256/512, HMAC-SHA1/256/512, constant-time compare, random bytes), `AesCipher` (lab/test only) and the wrappers `base64Encode`, `base64Decode`, `computeHash`, `computeHmac`, `verifyHmacSignature`.
- Node.js 24 module `in.co.cloudblogger.crypto.node`: `computeHash`, `computeHmac`, `encryptAesText`, `decryptAesText` (AES-GCM).
