export interface RateLimitResult {
	allowed: boolean;
	remaining: number;
	retryAfterSeconds: number;
}

export interface RateLimiter {
	take(key: string, cost?: number): RateLimitResult;
}

export interface TokenBucketOptions {
	/** Maximum burst size. */
	capacity: number;
	/** Tokens added back per second. */
	refillPerSecond: number;
	/** Bucket count that triggers pruning of idle buckets. */
	maxKeys?: number;
	now?: () => number;
}

interface Bucket {
	tokens: number;
	updatedAt: number;
}

/**
 * In-memory token bucket keyed by an arbitrary string (usually `action:ip`). State lives in
 * one process, which fits a single-container deployment; it resets on restart.
 */
export class TokenBucketLimiter implements RateLimiter {
	readonly #buckets = new Map<string, Bucket>();
	readonly #capacity: number;
	readonly #refill: number;
	readonly #maxKeys: number;
	readonly #now: () => number;

	constructor(options: TokenBucketOptions) {
		if (options.capacity <= 0 || options.refillPerSecond <= 0) {
			throw new RangeError('capacity and refillPerSecond must be positive');
		}
		this.#capacity = options.capacity;
		this.#refill = options.refillPerSecond;
		this.#maxKeys = options.maxKeys ?? 10_000;
		this.#now = options.now ?? Date.now;
	}

	get size(): number {
		return this.#buckets.size;
	}

	take(key: string, cost = 1): RateLimitResult {
		const now = this.#now();
		const bucket = this.#refilled(this.#buckets.get(key), now);
		this.#buckets.set(key, bucket);

		if (this.#buckets.size > this.#maxKeys) this.prune();

		if (bucket.tokens >= cost) {
			bucket.tokens -= cost;
			return { allowed: true, remaining: Math.floor(bucket.tokens), retryAfterSeconds: 0 };
		}
		return {
			allowed: false,
			remaining: 0,
			retryAfterSeconds: Math.ceil((cost - bucket.tokens) / this.#refill)
		};
	}

	/** Drops buckets that have refilled completely; they carry no information. */
	prune(): void {
		const now = this.#now();
		for (const [key, bucket] of this.#buckets) {
			if (this.#refilled(bucket, now).tokens >= this.#capacity) this.#buckets.delete(key);
		}
	}

	#refilled(bucket: Bucket | undefined, now: number): Bucket {
		if (!bucket) return { tokens: this.#capacity, updatedAt: now };
		const elapsed = Math.max(0, now - bucket.updatedAt) / 1000;
		bucket.tokens = Math.min(this.#capacity, bucket.tokens + elapsed * this.#refill);
		bucket.updatedAt = now;
		return bucket;
	}
}
