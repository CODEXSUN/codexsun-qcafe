import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { DatabaseSync } from 'node:sqlite';
import { backupDatabase } from './backup.mjs';

test('creates a consistent SQLite backup without modifying the source database', () => {
  const directory = mkdtempSync(join(tmpdir(), 'q-cafe-backup-'));
  const source = join(directory, 'q-cafe.sqlite');
  const destination = join(directory, 'backups', 'q-cafe.sqlite');
  const database = new DatabaseSync(source);
  database.exec('CREATE TABLE receipts (id INTEGER PRIMARY KEY, amount INTEGER NOT NULL); INSERT INTO receipts(amount) VALUES (125);');
  database.close();

  backupDatabase(source, destination);

  const backup = new DatabaseSync(destination, { readOnly: true });
  assert.equal(existsSync(destination), true);
  assert.equal(backup.prepare('SELECT amount FROM receipts').get().amount, 125);
  backup.close();
  rmSync(directory, { recursive: true, force: true });
});
