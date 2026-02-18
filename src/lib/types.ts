export type VaultEntry = {
  id: string;
  title: string;
  username?: string;
  password: string;
  url: string;
  notes?: string;
  tags?: string[];
  createdAt: string;
  updatedAt: string;
};

export type VaultSettings = {
  autoLockMinutes: number;
  clipboardTimeoutSeconds: number;
};

export type Vault = {
  version: 1;
  vault_version: number;
  entries: VaultEntry[];
  settings: VaultSettings;
};

export type KDFParams = {
  algorithm: 'argon2id' | 'pbkdf2';
  memory?: number;
  iterations: number;
  parallelism?: number;
  hash: 'SHA-256';
};

export type EncryptedVault = {
  vault_ciphertext: string;
  vault_nonce: string;
  kdf_salt: string;
  kdf_params: KDFParams;
  vault_version: number;
};

export type CharacterSet = 'lowercase' | 'uppercase' | 'digits' | 'symbols';
