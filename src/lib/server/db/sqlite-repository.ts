import { randomBytes } from 'node:crypto';
import type { SqliteDatabase } from './database';
import {
	SlugTakenError,
	type CountRow,
	type DailyCount,
	type Link,
	type LinkRepository,
	type LinkStats,
	type NewClick,
	type NewLink
} from '../types';

interface LinkRow {
	id: number;
	slug: string;
	target_url: string;
	password_hash: string | null;
	expires_at: number | null;
	max_clicks: number | null;
	click_count: number;
	created_at: number;
}

const toLink = (row: LinkRow): Link => ({
	id: row.id,
	slug: row.slug,
	targetUrl: row.target_url,
	passwordHash: row.password_hash,
	expiresAt: row.expires_at === null ? null : new Date(row.expires_at),
	maxClicks: row.max_clicks,
	clickCount: row.click_count,
	createdAt: new Date(row.created_at)
});

const isUniqueViolation = (err: unknown): boolean =>
	typeof err === 'object' &&
	err !== null &&
	'code' in err &&
	(err as { code: unknown }).code === 'SQLITE_CONSTRAINT_UNIQUE';

function prepareStatements(db: SqliteDatabase) {
	return {
		insert: db.prepare(
			`INSERT INTO links (slug, target_url, password_hash, expires_at, max_clicks, created_at)
				 VALUES (@slug, @targetUrl, @passwordHash, @expiresAt, @maxClicks, @createdAt)
				 RETURNING *`
		),
		bySlug: db.prepare('SELECT * FROM links WHERE slug = ?'),
		list: db.prepare('SELECT * FROM links ORDER BY created_at DESC, id DESC LIMIT ? OFFSET ?'),
		count: db.prepare('SELECT COUNT(*) FROM links').pluck(),
		delete: db.prepare('DELETE FROM links WHERE slug = ?'),
		// The guard makes the limit check and the increment one atomic statement, so two
		// concurrent visitors can never both take the last remaining click.
		bump: db.prepare(
			`UPDATE links SET click_count = click_count + 1
				 WHERE id = ?
				   AND (max_clicks IS NULL OR click_count < max_clicks)
				   AND (expires_at IS NULL OR expires_at > ?)`
		),
		insertClick: db.prepare(
			`INSERT INTO clicks (link_id, created_at, referrer_host, country, browser, visitor_hash)
				 VALUES (?, ?, ?, ?, ?, ?)`
		),
		salt: db.prepare('SELECT salt FROM daily_salts WHERE day = ?').pluck(),
		insertSalt: db.prepare('INSERT OR IGNORE INTO daily_salts (day, salt) VALUES (?, ?)'),
		pruneSalts: db.prepare('DELETE FROM daily_salts WHERE day < ?'),
		daily: db.prepare(
			`SELECT strftime('%Y-%m-%d', created_at / 1000, 'unixepoch') AS day,
				        COUNT(*) AS clicks,
				        COUNT(DISTINCT visitor_hash) AS visitors
				 FROM clicks WHERE link_id = ? AND created_at >= ?
				 GROUP BY day ORDER BY day`
		),
		referrers: db.prepare(
			`SELECT COALESCE(referrer_host, 'Direct') AS label, COUNT(*) AS count
				 FROM clicks WHERE link_id = ? AND created_at >= ?
				 GROUP BY label ORDER BY count DESC, label LIMIT ?`
		),
		browsers: db.prepare(
			`SELECT browser AS label, COUNT(*) AS count
				 FROM clicks WHERE link_id = ? AND created_at >= ?
				 GROUP BY label ORDER BY count DESC, label LIMIT ?`
		),
		countries: db.prepare(
			`SELECT COALESCE(country, 'Unknown') AS label, COUNT(*) AS count
				 FROM clicks WHERE link_id = ? AND created_at >= ?
				 GROUP BY label ORDER BY count DESC, label LIMIT ?`
		)
	};
}

export class SqliteLinkRepository implements LinkRepository {
	readonly #db: SqliteDatabase;
	readonly #q: ReturnType<typeof prepareStatements>;

	constructor(db: SqliteDatabase) {
		this.#db = db;
		this.#q = prepareStatements(db);
	}

	async insertLink(link: NewLink): Promise<Link> {
		try {
			const row = this.#q.insert.get({
				slug: link.slug,
				targetUrl: link.targetUrl,
				passwordHash: link.passwordHash,
				expiresAt: link.expiresAt?.getTime() ?? null,
				maxClicks: link.maxClicks,
				createdAt: link.createdAt.getTime()
			}) as LinkRow;
			return toLink(row);
		} catch (err) {
			if (isUniqueViolation(err)) throw new SlugTakenError(link.slug);
			throw err;
		}
	}

	async findBySlug(slug: string): Promise<Link | null> {
		const row = this.#q.bySlug.get(slug) as LinkRow | undefined;
		return row ? toLink(row) : null;
	}

	async listLinks({ limit = 50, offset = 0 } = {}): Promise<Link[]> {
		return (this.#q.list.all(limit, offset) as LinkRow[]).map(toLink);
	}

	async countLinks(): Promise<number> {
		return this.#q.count.get() as number;
	}

	async deleteLink(slug: string): Promise<boolean> {
		return this.#q.delete.run(slug).changes > 0;
	}

	async registerClick(linkId: number, click: NewClick): Promise<boolean> {
		const at = click.at.getTime();
		return this.#db.transaction(() => {
			if (this.#q.bump.run(linkId, at).changes === 0) return false;
			this.#q.insertClick.run(
				linkId,
				at,
				click.referrerHost,
				click.country,
				click.browser,
				click.visitorHash
			);
			return true;
		})();
	}

	async dailySalt(day: string): Promise<Buffer> {
		return this.#db.transaction(() => {
			this.#q.insertSalt.run(day, randomBytes(32));
			this.#q.pruneSalts.run(day);
			return this.#q.salt.get(day) as Buffer;
		})();
	}

	async stats(linkId: number, since: Date, top = 10): Promise<LinkStats> {
		const from = since.getTime();
		const daily = this.#q.daily.all(linkId, from) as DailyCount[];
		return {
			totalClicks: daily.reduce((sum, d) => sum + d.clicks, 0),
			uniqueVisitors: daily.reduce((sum, d) => sum + d.visitors, 0),
			daily,
			referrers: this.#q.referrers.all(linkId, from, top) as CountRow[],
			browsers: this.#q.browsers.all(linkId, from, top) as CountRow[],
			countries: this.#q.countries.all(linkId, from, top) as CountRow[]
		};
	}
}
