import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { pathToFileURL } from 'node:url';
import { DatabaseSync } from 'node:sqlite';

export function backupDatabase(source, destination) {
  mkdirSync(dirname(destination), { recursive: true });
  const database = new DatabaseSync(source);
  try {
    database.exec('PRAGMA wal_checkpoint(TRUNCATE);');
    database.exec(`VACUUM INTO '${String(destination).replaceAll("'", "''")}';`);
  } finally {
    database.close();
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const [source, destination] = process.argv.slice(2);
  if (!source || !destination) throw new Error('Usage: node backup.mjs <source> <destination>');
  backupDatabase(source, destination);
}
