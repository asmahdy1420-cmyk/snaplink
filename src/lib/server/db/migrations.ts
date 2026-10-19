import type { SqliteDatabase } from './database';

export interface Migration {
	version: number;
	name: string;
	sql: string;
}

export const MIGRATIONS: readonly Migration[] = [
	{
		version: 1,
		name: 'links_and_clicks',
		sql: `
			CREATE TABLE links (
				id            INTEGER PRIMARY KEY,
				slug          TEXT    NOT NULL UNIQUE,
				target_url    TEXT    NOT NULL,
				password_hash TEXT,
				expires_at    INTEGER,
				max_clicks    INTEGER CHECK (max_clicks IS NULL OR max_clicks > 0),
				click_count   INTEGER NOT NULL DEFAULT 0,
				created_at    INTEGER NOT NULL
			);
			CREATE TABLE clicks (
				id            INTEGER PRIMARY KEY,
				link_id       INTEGER NOT NULL REFERENCES links (id) ON DELETE CASCADE,
				created_at    INTEGER NOT NULL,
				referrer_host TEXT,
				country       TEXT,
				browser       TEXT    NOT NULL,
				visitor_hash  TEXT    NOT NULL
			);
			CREATE INDEX clicks_link_time ON clicks (link_id, created_at);
		`
	},
	{
		version: 2,
		name: 'daily_salts',
		sql: `
			CREATE TABLE daily_salts (
				day  TEXT PRIMARY KEY,
				salt BLOB NOT NULL
			);
		`
	}
];

/**
 * Applies pending migrations in version order, each inside its own transaction, and records
 * them in `schema_migrations`. Safe to call on every start-up. Returns the versions applied.
 */
export function migrate(
	db: SqliteDatabase,
	migrations: readonly Migration[] = MIGRATIONS
): number[] {
	const versions = migrations.map((m) => m.version);
	if (versions.some((v, i) => i > 0 && v <= versions[i - 1])) {
		throw new Error('Migration versions must be unique and strictly increasing');
	}

	db.exec(`
		CREATE TABLE IF NOT EXISTS schema_migrations (
			version    INTEGER PRIMARY KEY,
			name       TEXT    NOT NULL,
			applied_at INTEGER NOT NULL
		)
	`);
	const applied = new Set(
		db.prepare('SELECT version FROM schema_migrations').pluck().all() as number[]
	);
	const record = db.prepare(
		'INSERT INTO schema_migrations (version, name, applied_at) VALUES (?, ?, ?)'
	);

	const done: number[] = [];
	for (const migration of migrations) {
		if (applied.has(migration.version)) continue;
		db.transaction(() => {
			db.exec(migration.sql);
			record.run(migration.version, migration.name, Date.now());
		})();
		done.push(migration.version);
	}
	return done;
}
