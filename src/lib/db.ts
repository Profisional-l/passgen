import path from 'path';
import fs from 'fs';
import Database from 'better-sqlite3';

const dataDir = path.join(process.cwd(), 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}
const dbPath = path.join(dataDir, 'vault.db');
const db = new Database(dbPath);

db.pragma('journal_mode = WAL');

// Initial schema (legacy) used `email`. New schema uses anonymous `login`.
db.prepare(
  `CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    login TEXT UNIQUE NOT NULL,
    vault_ciphertext BLOB NOT NULL,
    vault_nonce BLOB NOT NULL,
    kdf_salt BLOB NOT NULL,
    kdf_params TEXT NOT NULL,
    vault_version INTEGER NOT NULL,
    updated_at TEXT NOT NULL
  )`
).run();

// Best-effort migration from legacy column `email` -> `login` (for existing local DBs).
// If the table was created previously with `email`, add `login` and backfill.
try {
  const columns: Array<{ name: string }> = db.prepare(`PRAGMA table_info(users)`).all();
  const hasLogin = columns.some(c => c.name === 'login');
  const hasEmail = columns.some(c => c.name === 'email');

  if (!hasLogin && hasEmail) {
    db.prepare(`ALTER TABLE users ADD COLUMN login TEXT`).run();
    // Copy email into login for existing rows, then enforce NOT NULL via application logic (SQLite can't easily alter).
    db.prepare(`UPDATE users SET login = LOWER(email) WHERE login IS NULL`).run();
    // Add a unique index on login (email already unique in legacy schema).
    db.prepare(`CREATE UNIQUE INDEX IF NOT EXISTS users_login_unique ON users(login)`).run();
  }
} catch (e) {
  // Ignore migration errors; app will fail fast on missing login lookups if needed.
  console.warn('DB migration check failed', e);
}

export type UserRow = {
  id: string;
  login: string;
  vault_ciphertext: Buffer;
  vault_nonce: Buffer;
  kdf_salt: Buffer;
  kdf_params: string;
  vault_version: number;
  updated_at: string;
};

export function getUserByLogin(login: string): UserRow | undefined {
  // Support both schemas during migration: prefer login, fallback to email column if present.
  const columns: Array<{ name: string }> = db.prepare(`PRAGMA table_info(users)`).all();
  const hasLogin = columns.some(c => c.name === 'login');
  if (hasLogin) {
    return db.prepare<UserRow>('SELECT id, login, vault_ciphertext, vault_nonce, kdf_salt, kdf_params, vault_version, updated_at FROM users WHERE login = ?').get(login);
  }
  // Legacy
  return db.prepare<any>('SELECT id, LOWER(email) as login, vault_ciphertext, vault_nonce, kdf_salt, kdf_params, vault_version, updated_at FROM users WHERE LOWER(email) = ?').get(login);
}

export function insertUser(user: Omit<UserRow, 'updated_at'>): void {
  db.prepare(
    `INSERT INTO users (id, login, vault_ciphertext, vault_nonce, kdf_salt, kdf_params, vault_version, updated_at)
     VALUES (@id, @login, @vault_ciphertext, @vault_nonce, @kdf_salt, @kdf_params, @vault_version, datetime('now'))`
  ).run({
    ...user,
    updated_at: new Date().toISOString(),
  } as any);
}

export function updateVault(login: string, ciphertext: Buffer, nonce: Buffer, vaultVersion: number): void {
  db.prepare(
    `UPDATE users
     SET vault_ciphertext = @ciphertext,
         vault_nonce = @nonce,
         vault_version = @vaultVersion,
         updated_at = datetime('now')
     WHERE login = @login`
  ).run({ login, ciphertext, nonce, vaultVersion });
}

