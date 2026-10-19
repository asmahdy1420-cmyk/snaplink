import { getConfig } from '../config';
import { openDatabase } from './database';
import { migrate } from './migrations';
import { SqliteLinkRepository } from './sqlite-repository';
import type { LinkRepository } from '../types';

let repository: LinkRepository | undefined;

/** Lazily opens the database on first use so importing server modules has no side effects. */
export function getRepository(): LinkRepository {
	if (!repository) {
		const db = openDatabase(getConfig().databasePath);
		migrate(db);
		repository = new SqliteLinkRepository(db);
	}
	return repository;
}

/** Opens a migrated in-memory repository. Used by tests and local experiments. */
export function createMemoryRepository(): SqliteLinkRepository {
	const db = openDatabase(':memory:');
	migrate(db);
	return new SqliteLinkRepository(db);
}
