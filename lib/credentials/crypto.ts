import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';
import { supabaseAdmin } from '../../supabase/supabase';

const VAULT_SECRET_NAME = 'platform_credentials_mek';
const ALGORITHM = 'aes-256-gcm';
const IV_BYTES = 12;        // 96-bit IV
const KEY_BYTES = 32;       // 256-bit key
const AUTH_TAG_BYTES = 16;  // 128-bit GCM auth tag

/**
 * Retrieves the Master Encryption Key (MEK).
 *
 * Resolution order:
 *  1. Supabase Vault (`vault_get_secret` RPC) — preferred in production.
 *  2. `PLATFORM_CREDENTIALS_MEK` env var (base64-encoded 32-byte key) — used
 *     when Vault is not yet provisioned (e.g. dev / Supabase free tier).
 *
 * Throws if neither source yields a valid 32-byte key.
 */
export async function getMEK(): Promise<Buffer> {
  // Try Vault first
  try {
    const { data, error } = await supabaseAdmin.rpc('vault_get_secret', {
      secret_name: VAULT_SECRET_NAME,
    });
    if (!error && data != null) {
      const key = Buffer.from(data as string, 'base64');
      if (key.length === KEY_BYTES) return key;
    }
  } catch {
    // Vault not available — fall through to env var
  }

  // Fall back to env var
  const envMek = process.env.PLATFORM_CREDENTIALS_MEK;
  if (envMek) {
    const key = Buffer.from(envMek, 'base64');
    if (key.length === KEY_BYTES) return key;
    throw new Error(
      'PLATFORM_CREDENTIALS_MEK env var is set but is not a valid base64-encoded 32-byte key.'
    );
  }

  throw new Error(
    'MEK not available: set PLATFORM_CREDENTIALS_MEK env var (base64, 32 bytes) ' +
    'or provision the Vault secret "platform_credentials_mek".'
  );
}

export interface EncryptedCredential {
  encryptedPayload: string; // base64: ciphertext ‖ authTag[16]
  encryptedDek: string;     // base64: dekIv[12] ‖ encryptedDek[32] ‖ dekAuthTag[16]
  iv: string;               // base64: 96-bit payload IV
}

/**
 * Encrypts a credential payload using envelope encryption:
 *  1. Generates a random 256-bit DEK and 96-bit IV.
 *  2. Encrypts the JSON-stringified payload with AES-256-GCM (DEK + IV),
 *     appending the 16-byte auth tag to the ciphertext.
 *  3. Wraps the DEK with the MEK (fresh random 96-bit dekIv),
 *     storing dekIv | encryptedDek | dekAuthTag.
 *
 * Returns all three values as base64 strings.
 */
export async function encryptCredential(
  payload: Record<string, string>
): Promise<EncryptedCredential> {
  const mek = await getMEK();

  // Generate per-credential DEK and IV
  const dek = randomBytes(KEY_BYTES);
  const iv = randomBytes(IV_BYTES);

  // Encrypt payload with DEK
  const cipher = createCipheriv(ALGORITHM, dek, iv);
  const payloadJson = JSON.stringify(payload);
  const encryptedBody = Buffer.concat([
    cipher.update(payloadJson, 'utf8'),
    cipher.final(),
  ]);
  const payloadAuthTag = cipher.getAuthTag();
  // Store: ciphertext ‖ authTag
  const encryptedPayload = Buffer.concat([encryptedBody, payloadAuthTag]);

  // Encrypt DEK with MEK using a fresh IV
  const dekIv = randomBytes(IV_BYTES);
  const dekCipher = createCipheriv(ALGORITHM, mek, dekIv);
  const encryptedDekBody = Buffer.concat([
    dekCipher.update(dek),
    dekCipher.final(),
  ]);
  const dekAuthTag = dekCipher.getAuthTag();
  // Store: dekIv[12] ‖ encryptedDek[32] ‖ dekAuthTag[16]
  const encryptedDekFull = Buffer.concat([dekIv, encryptedDekBody, dekAuthTag]);

  return {
    encryptedPayload: encryptedPayload.toString('base64'),
    encryptedDek: encryptedDekFull.toString('base64'),
    iv: iv.toString('base64'),
  };
}

/**
 * Decrypts a stored credential:
 *  1. Unwraps the DEK from encryptedDek using MEK + dekIv + dekAuthTag.
 *  2. Decrypts encryptedPayload using DEK + iv + payloadAuthTag.
 *
 * Auth tag mismatches propagate naturally (callers convert to HTTP 422).
 */
export async function decryptCredential(
  row: EncryptedCredential
): Promise<Record<string, string>> {
  const mek = await getMEK();

  // Unpack DEK envelope: dekIv[12] ‖ encryptedDekBody[32] ‖ dekAuthTag[16]
  const encryptedDekFull = Buffer.from(row.encryptedDek, 'base64');
  const dekIv = encryptedDekFull.subarray(0, IV_BYTES);
  const dekBody = encryptedDekFull.subarray(
    IV_BYTES,
    encryptedDekFull.length - AUTH_TAG_BYTES
  );
  const dekAuthTag = encryptedDekFull.subarray(
    encryptedDekFull.length - AUTH_TAG_BYTES
  );

  // Unwrap DEK
  const dekDecipher = createDecipheriv(ALGORITHM, mek, dekIv);
  dekDecipher.setAuthTag(dekAuthTag);
  const dek = Buffer.concat([dekDecipher.update(dekBody), dekDecipher.final()]);

  // Unpack payload envelope: ciphertext ‖ payloadAuthTag[16]
  const encryptedPayloadFull = Buffer.from(row.encryptedPayload, 'base64');
  const payloadBody = encryptedPayloadFull.subarray(
    0,
    encryptedPayloadFull.length - AUTH_TAG_BYTES
  );
  const payloadAuthTag = encryptedPayloadFull.subarray(
    encryptedPayloadFull.length - AUTH_TAG_BYTES
  );
  const iv = Buffer.from(row.iv, 'base64');

  // Decrypt payload
  const decipher = createDecipheriv(ALGORITHM, dek, iv);
  decipher.setAuthTag(payloadAuthTag);
  const plaintext = Buffer.concat([
    decipher.update(payloadBody),
    decipher.final(),
  ]).toString('utf8');

  return JSON.parse(plaintext) as Record<string, string>;
}
