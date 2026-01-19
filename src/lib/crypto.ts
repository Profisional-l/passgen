'use client';

import type { KDFParams, Vault, CharacterSet } from './types';

const KDF_ITERATIONS = 500000;
const KDF_HASH = 'SHA-256';

// UTILITY FUNCTIONS
const stringToArrayBuffer = (str: string): Uint8Array => new TextEncoder().encode(str);
const arrayBufferToString = (buffer: ArrayBuffer): string => new TextDecoder().decode(buffer);
const arrayBufferToBase64 = (buffer: ArrayBuffer): string => btoa(String.fromCharCode(...new Uint8Array(buffer)));
const base64ToArrayBuffer = (base64: string): Uint8Array => Uint8Array.from(atob(base64), c => c.charCodeAt(0));

// --- KEY DERIVATION ---
export const generateSalt = (): Uint8Array => crypto.getRandomValues(new Uint8Array(16));

export const getKDFParams = (): KDFParams => ({
  iterations: KDF_ITERATIONS,
  hash: KDF_HASH,
});

async function deriveKey(password: string, salt: Uint8Array, params: KDFParams): Promise<CryptoKey> {
  const masterKey = await crypto.subtle.importKey(
    'raw',
    stringToArrayBuffer(password),
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt,
      iterations: params.iterations,
      hash: params.hash,
    },
    masterKey,
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt']
  );
}

// --- VAULT ENCRYPTION/DECRYPTION ---
export async function encryptVault(
  vault: Vault,
  password: string
): Promise<{ encrypted: { ciphertext: string; nonce: string }; salt: string; params: KDFParams }> {
  const salt = generateSalt();
  const params = getKDFParams();
  const key = await deriveKey(password, salt, params);
  const nonce = crypto.getRandomValues(new Uint8Array(12));

  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: nonce },
    key,
    stringToArrayBuffer(JSON.stringify(vault))
  );

  return {
    encrypted: {
      ciphertext: arrayBufferToBase64(ciphertext),
      nonce: arrayBufferToBase64(nonce),
    },
    salt: arrayBufferToBase64(salt),
    params,
  };
}

export async function decryptVault(
  ciphertext: string,
  nonce: string,
  salt: string,
  params: KDFParams,
  password: string
): Promise<Vault> {
  const key = await deriveKey(password, base64ToArrayBuffer(salt), params);

  try {
    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: base64ToArrayBuffer(nonce) },
      key,
      base64ToArrayBuffer(ciphertext)
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
    // Ensure there's at least one character to pick from
    availableChars = charPools.lowercase;
  }

  const randomValues = new Uint32Array(length);
  crypto.getRandomValues(randomValues);

  let password = '';
  for (let i = 0; i < length; i++) {
    password += availableChars[randomValues[i] % availableChars.length];
  }

  // Ensure password contains at least one character from each selected set
  const passwordChars = new Set(password.split(''));
  for (const set of charSets) {
      const setChars = charPools[set].split('');
      const hasCharFromSet = setChars.some(char => passwordChars.has(char));
      if (!hasCharFromSet) {
          // If a required character set is missing, regenerate the password.
          // This is a simple strategy; more complex ones could insert missing chars.
          return generatePassword(length, charSets, excludeChars);
      }
  }

  return password;
}
