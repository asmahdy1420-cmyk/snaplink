import { env } from '$env/dynamic/private';

export interface AppConfig {
	/** Shared secret for the admin dashboard. Admin access is disabled when unset. */
	adminToken: string | undefined;
	databasePath: string;
	/** When false, only a signed-in admin may create links. */
	publicCreation: boolean;
}

export function getConfig(): AppConfig {
	const token = env.ADMIN_TOKEN?.trim();
	return {
		adminToken: token ? token : undefined,
		databasePath: env.DATABASE_PATH?.trim() || './data/snaplink.db',
		publicCreation: (env.PUBLIC_CREATION ?? 'true').toLowerCase() !== 'false'
	};
}
