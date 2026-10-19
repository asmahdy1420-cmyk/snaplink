export interface Link {
	id: number;
	slug: string;
	targetUrl: string;
	passwordHash: string | null;
	expiresAt: Date | null;
	maxClicks: number | null;
	clickCount: number;
	createdAt: Date;
}

export type NewLink = Omit<Link, 'id' | 'clickCount'>;

export interface NewClick {
	at: Date;
	referrerHost: string | null;
	country: string | null;
	browser: string;
	visitorHash: string;
}

export interface CountRow {
	label: string;
	count: number;
}

export interface DailyCount {
	/** UTC day in `YYYY-MM-DD` form. */
	day: string;
	clicks: number;
	/** Distinct visitor hashes on that day. Hashes are not comparable across days. */
	visitors: number;
}

export interface LinkStats {
	totalClicks: number;
	uniqueVisitors: number;
	daily: DailyCount[];
	referrers: CountRow[];
	browsers: CountRow[];
	countries: CountRow[];
}

/** Raised when an insert collides with an existing slug. */
export class SlugTakenError extends Error {
	constructor(readonly slug: string) {
		super(`Slug "${slug}" is already taken`);
		this.name = 'SlugTakenError';
	}
}

/**
 * Storage boundary for links and clicks. Methods are async so the SQLite implementation can
 * be swapped for a networked database without touching routes or services.
 */
export interface LinkRepository {
	insertLink(link: NewLink): Promise<Link>;
	findBySlug(slug: string): Promise<Link | null>;
	listLinks(options?: { limit?: number; offset?: number }): Promise<Link[]>;
	countLinks(): Promise<number>;
	deleteLink(slug: string): Promise<boolean>;
	/**
	 * Atomically counts a click and stores it. Returns false (and stores nothing) when the
	 * link has expired or already reached its click limit at the time of the write.
	 */
	registerClick(linkId: number, click: NewClick): Promise<boolean>;
	/** Returns the random salt for a UTC day, creating it and discarding older salts. */
	dailySalt(day: string): Promise<Buffer>;
	stats(linkId: number, since: Date, top?: number): Promise<LinkStats>;
}
