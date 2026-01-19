import fs from 'fs';
import path from 'path';
import Database from 'better-sqlite3';

const projectRoot = process.cwd();
const dataDir = path.join(projectRoot, 'data');
const dbPath = path.join(dataDir, 'vault.db');
const backupsDir = path.join(projectRoot, 'backups');

function isoForFilename(d = new Date()) {
  return d.toISOString().replace(/[:.]/g, '-');
}

if (!fs.existsSync(dbPath)) {
  console.error(`DB not found at: ${dbPath}`);
  process.exit(1);
}

if (!fs.existsSync(backupsDir)) {
  fs.mkdirSync(backupsDir, { recursive: true });
}

const ts = isoForFilename();
const outPath = path.join(backupsDir, `vault-${ts}.db`);

const db = new Database(dbPath);
try {
  // Ensure WAL contents are checkpointed so the backup is consistent and self-contained.
  db.pragma('wal_checkpoint(FULL)');
  // Use SQLite online backup API (safe even if DB is in use).
  await db.backup(outPath);
  console.log(`Backup created: ${outPath}`);
} finally {
  db.close();
}

