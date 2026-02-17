'use client';

import type { CharacterSet, EncryptedVault, KDFParams, Vault } from './types';

const DEFAULT_ARGON2_PARAMS: KDFParams = {
  algorithm: 'argon2id',
  memory: 64 * 1024, // KB
  iterations: 3,
  parallelism: 2,
  hash: 'SHA-256',
};

const FALLBACK_PBKDF2_PARAMS: KDFParams = {
  algorithm: 'pbkdf2',
  iterations: 100_000,
  hash: 'SHA-256',
};

// UTILITY FUNCTIONS
const enc = new TextEncoder();
const dec = new TextDecoder();

export const stringToArrayBuffer = (str: string): Uint8Array => enc.encode(str);
export const arrayBufferToString = (buffer: ArrayBuffer | Uint8Array): string => 
  dec.decode(buffer instanceof Uint8Array ? buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength) : buffer);
export const arrayBufferToBase64 = (buffer: ArrayBuffer | Uint8Array): string =>
  btoa(String.fromCharCode(...new Uint8Array(buffer)));
export const base64ToArrayBuffer = (base64: string): Uint8Array =>
  Uint8Array.from(atob(base64), c => c.charCodeAt(0));

export const generateSalt = (length = 16): Uint8Array =>
  globalThis.crypto.getRandomValues(new Uint8Array(length));

export const getDefaultKdfParams = (): KDFParams => DEFAULT_ARGON2_PARAMS;

async function deriveMasterKeyBytes(password: string, salt: Uint8Array, params: KDFParams): Promise<ArrayBuffer> {
  if (params.algorithm === 'argon2id') {
    try {
      // Prefer bundled build to avoid WASM loader issues in some bundlers (e.g. Turbopack)
      // @ts-ignore - argon2-browser doesn't have type declarations
      const argon2: any = await import('argon2-browser/dist/argon2-bundled.min.js');
      const { hash } = await argon2.hash({
        pass: password,
        salt,
        time: params.iterations,
        mem: params.memory ?? 64 * 1024,
        parallelism: params.parallelism ?? 2,
        hashLen: 32,
        type: argon2.ArgonType.Argon2id,
        digest: 'sha256',
      });
      return hash.buffer;
    } catch (err) {
      console.warn('Argon2id unavailable, falling back to PBKDF2', err);
      return deriveMasterKeyBytes(password, salt, FALLBACK_PBKDF2_PARAMS);
    }
  }

  const { subtle } = globalThis.crypto;
  const masterKey = await subtle.importKey(
    'raw',
    stringToArrayBuffer(password) as any,
    { name: 'PBKDF2' },
    false,
    ['deriveBits']
  );

  const bits = await subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: salt as any,
      iterations: params.iterations,
      hash: params.hash,
    },
    masterKey,
    256
  );

  return bits;
}

async function deriveEncryptionKey(masterKeyBytes: ArrayBuffer): Promise<CryptoKey> {
  const { subtle } = globalThis.crypto;
  const masterKey = await subtle.importKey('raw', new Uint8Array(masterKeyBytes), 'HKDF', false, ['deriveKey']);

  return subtle.deriveKey(
    {
      name: 'HKDF',
      hash: 'SHA-256',
      salt: new Uint8Array([]),
      info: stringToArrayBuffer('vault-encryption') as any,
    },
    masterKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

// --- VAULT ENCRYPTION/DECRYPTION ---
export async function encryptVault(
  vault: Vault,
  password: string,
  opts?: { kdf_salt?: string; kdf_params?: KDFParams }
): Promise<EncryptedVault> {
  const kdf_salt_bytes = opts?.kdf_salt ? base64ToArrayBuffer(opts.kdf_salt) : generateSalt();
  const kdf_salt = opts?.kdf_salt ?? arrayBufferToBase64(kdf_salt_bytes);
  const kdf_params = opts?.kdf_params ?? getDefaultKdfParams();
  const masterBytes = await deriveMasterKeyBytes(password, kdf_salt_bytes, kdf_params);
  const encryptionKey = await deriveEncryptionKey(masterBytes);
  const nonce = globalThis.crypto.getRandomValues(new Uint8Array(12));
  const { subtle } = globalThis.crypto;

  const ciphertext = await subtle.encrypt(
    { name: 'AES-GCM', iv: nonce },
    encryptionKey,
    stringToArrayBuffer(JSON.stringify(vault)) as any
  );

  return {
    vault_ciphertext: arrayBufferToBase64(ciphertext),
    vault_nonce: arrayBufferToBase64(nonce),
    kdf_salt,
    kdf_params,
    vault_version: vault.vault_version,
  };
}

export async function decryptVault(
  payload: EncryptedVault,
  password: string
): Promise<Vault> {
  const masterBytes = await deriveMasterKeyBytes(password, base64ToArrayBuffer(payload.kdf_salt), payload.kdf_params);
  const encryptionKey = await deriveEncryptionKey(masterBytes);
  const { subtle } = globalThis.crypto;

  try {
    const decrypted = await subtle.decrypt(
      { name: 'AES-GCM', iv: base64ToArrayBuffer(payload.vault_nonce) as any },
      encryptionKey,
      base64ToArrayBuffer(payload.vault_ciphertext) as any
    );
    return JSON.parse(arrayBufferToString(decrypted));
  } catch (error) {
    console.error('Decryption failed:', error);
    throw new Error('Invalid master password or corrupted data.');
  }
}

// --- PASSWORD GENERATION ---
export function generatePassword(length: number, charSets: CharacterSet[], excludeChars: string): string {
  const charPools = {
    lowercase: 'abcdefghijklmnopqrstuvwxyz',
    uppercase: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
    digits: '0123456789',
    symbols: '!@#$%^&*()_+-=[]{}|;:,.<>?',
  };

  let availableChars = charSets
    .map(set => charPools[set])
    .join('');

  if (excludeChars) {
    availableChars = availableChars.split('').filter(char => !excludeChars.includes(char)).join('');
  }
  
  if (availableChars.length === 0) {
    availableChars = charPools.lowercase;
  }

  const randomValues = new Uint32Array(length);
  globalThis.crypto.getRandomValues(randomValues);

  let password = '';
  for (let i = 0; i < length; i++) {
    password += availableChars[randomValues[i] % availableChars.length];
  }

  const passwordChars = new Set(password.split(''));
  for (const set of charSets) {
    const setChars = charPools[set].split('');
    const hasCharFromSet = setChars.some(char => passwordChars.has(char));
    if (!hasCharFromSet) {
      return generatePassword(length, charSets, excludeChars);
    }
  }

  return password;
}

export const buildEmptyVault = (): Vault => ({
  version: 1 as const,
  vault_version: 1,
  entries: [],
  settings: {
    autoLockMinutes: 3,
    clipboardTimeoutSeconds: 20,
  },
});
