export type VaultItem = {
  id: string;
  name: string;
  username: string;
  password?: string; // a dedicated one, or one generated
  url: string;
  notes: string;
};

export type Vault = {
  version: number;
  items: VaultItem[];
};

export type KDFParams = {
  iterations: number;
  hash: 'SHA-256';
};

export type EncryptedVault = {
  ciphertext: string;
  nonce: string;
  salt: string;
  params: KDFParams;
  version: number;
};

export type CharacterSet = 'lowercase' | 'uppercase' | 'digits' | 'symbols';
