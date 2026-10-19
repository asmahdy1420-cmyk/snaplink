import { describe, expect, it } from 'vitest';
import { openDatabase } from './database';
import { migrate, MIGRATIONS } from './migrations';

const tables = (db: ReturnType<typeof openDatabase>) =>
	db.prepare("SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name").pluck().all();

describe('migrate', () => {
	it('applies every migration on a fresh database', () => {
		const db = openDatabase(':memory:');
		expect(migrate(db)).toEqual(MIGRATIONS.map((m) => m.version));
		expect(tables(db)).toEqual(['clicks', 'daily_salts', 'links', 'schema_migrations']);
	});

	it('is idempotent', () => {
		const db = openDatabase(':memory:');
		migrate(db);
		expect(migrate(db)).toEqual([]);
		expect(db.prepare('SELECT COUNT(*) FROM schema_migrations').pluck().get()).toBe(
			MIGRATIONS.length
		);
	});

	it('applies only migrations added since the last run', () => {
		const db = openDatabase(':memory:');
		migrate(db, MIGRATIONS.slice(0, 1));
		expect(migrate(db)).toEqual([2]);
	});

	it('rolls back a failing migration and leaves it pending', () => {
		const db = openDatabase(':memory:');
		const broken = [
			...MIGRATIONS,
			{ version: 99, name: 'broken', sql: 'CREATE TABLE x (a); SELECT nope FROM missing;' }
		];
		expect(() => migrate(db, broken)).toThrow();
		expect(tables(db)).not.toContain('x');
		expect(migrate(db)).toEqual([]);
	});

	it('rejects out-of-order versions', () => {
		const db = openDatabase(':memory:');
		expect(() => migrate(db, [MIGRATIONS[1], MIGRATIONS[0]])).toThrow(/strictly increasing/);
	});
});
