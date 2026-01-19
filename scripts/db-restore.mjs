import fs from 'fs';
import path from 'path';

const projectRoot = process.cwd();
const dataDir = path.join(projectRoot, 'data');
const dbPath = path.join(dataDir, 'vault.db');

const input = process.argv[2];
if (!input) {
  console.error('Usage: node scripts/db-restore.mjs <path-to-backup-db>');
  process.exit(1);
}

const backupPath = path.isAbsolute(input) ? input : path.join(projectRoot, input);
if (!fs.existsSync(backupPath)) {
  console.error(`Backup file not found: ${backupPath}`);
  process.exit(1);
}

if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Safety: keep current DB (if present) as .bak copy
if (fs.existsSync(dbPath)) {
  const bak = `${dbPath}.bak-${Date.now()}`;
  fs.copyFileSync(dbPath, bak);
  console.log(`Existing DB copied to: ${bak}`);
}

fs.copyFileSync(backupPath, dbPath);
console.log(`DB restored to: ${dbPath}`);

