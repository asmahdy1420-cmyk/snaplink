import Database from 'better-sqlite3';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

export type SqliteDatabase = Database.Database;

export function openDatabase(path: string): SqliteDatabase {
	const inMemory = path === ':memory:';
	if (!inMemory) mkdirSync(dirname(path), { recursive: true });
	const db = new Database(path);
	if (!inMemory) db.pragma('journal_mode = WAL');
	db.pragma('foreign_keys = ON');
	db.pragma('busy_timeout = 5000');
	return db;
}
