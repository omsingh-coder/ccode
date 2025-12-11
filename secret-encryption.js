// secret-encryption.js
// AES-256-GCM encryption helper. Requires MASTER_KEY env var (32 bytes)

const crypto = require('crypto');

const MASTER_KEY = process.env.MASTER_KEY;

if (!MASTER_KEY) {
  console.warn(
    'WARNING: MASTER_KEY not set. Encryption/decryption will break across restarts. ' +
    'Set MASTER_KEY env var to a 32-byte base64 or utf8 string.'
  );
}

function getKey() {
  if (!MASTER_KEY) {
    // For production: throw new Error("MASTER_KEY is required");
    return crypto.randomBytes(32); // fallback for dev
  }

  let key = Buffer.from(MASTER_KEY, "utf8");

  if (key.length !== 32) {
    throw new Error("MASTER_KEY must be exactly 32 bytes long");
  }

  return key;
}

function encryptSecret(plaintext) {
  const key = getKey();
  const iv = crypto.randomBytes(12); // Recommended IV length for GCM

  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);

  const encrypted = Buffer.concat([
    cipher.update(String(plaintext), 'utf8'),
    cipher.final()
  ]);

  const tag = cipher.getAuthTag();

  return {
    v: 1,
    ciphertext: encrypted.toString('base64'),
    iv: iv.toString('base64'),
    tag: tag.toString('base64')
  };
}

function decryptSecret({ ciphertext, iv, tag, v }) {
  if (v !== undefined && v !== 1) {
    throw new Error("Unsupported secret format version");
  }

  const key = getKey();

  const decipher = crypto.createDecipheriv(
    'aes-256-gcm',
    key,
    Buffer.from(iv, 'base64')
  );

  decipher.setAuthTag(Buffer.from(tag, 'base64'));

  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(ciphertext, 'base64')),
    decipher.final()
  ]);

  return decrypted.toString('utf8');
}

module.exports = { encryptSecret, decryptSecret };
