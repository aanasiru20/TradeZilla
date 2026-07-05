import crypto from 'crypto';

// The secret should be exactly 32 bytes long for aes-256-gcm.
// Store this in your .env.local as ENCRYPTION_SECRET
const SECRET_KEY = process.env.ENCRYPTION_SECRET || '';
const ALGORITHM = 'aes-256-gcm';

export function encrypt(text: string): string {
  if (!SECRET_KEY || SECRET_KEY.length !== 32) {
    throw new Error('ENCRYPTION_SECRET must be set and be exactly 32 characters long.');
  }

  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, Buffer.from(SECRET_KEY), iv);

  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag().toString('hex');

  // Format: iv:authTag:encryptedText
  return `${iv.toString('hex')}:${authTag}:${encrypted}`;
}

export function decrypt(encryptedData: string): string {
  if (!SECRET_KEY || SECRET_KEY.length !== 32) {
    throw new Error('ENCRYPTION_SECRET must be set and be exactly 32 characters long.');
  }

  const parts = encryptedData.split(':');
  if (parts.length !== 3) {
    throw new Error('Invalid encrypted data format');
  }

  const iv = Buffer.from(parts[0], 'hex');
  const authTag = Buffer.from(parts[1], 'hex');
  const encryptedText = parts[2];

  const decipher = crypto.createDecipheriv(ALGORITHM, Buffer.from(SECRET_KEY), iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}
