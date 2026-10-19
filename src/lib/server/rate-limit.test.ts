import { describe, expect, it } from 'vitest';
import { TokenBucketLimiter } from './rate-limit';

function clock(start = 0) {
	let t = start;
	return { now: () => t, advance: (ms: number) => (t += ms) };
}

describe('TokenBucketLimiter', () => {
	it('allows a burst up to capacity, then denies with a retry hint', () => {
		const c = clock();
		const limiter = new TokenBucketLimiter({ capacity: 3, refillPerSecond: 0.5, now: c.now });
		expect([1, 2, 3].map(() => limiter.take('ip').allowed)).toEqual([true, true, true]);
		const denied = limiter.take('ip');
		expect(denied).toEqual({ allowed: false, remaining: 0, retryAfterSeconds: 2 });
	});

	it('refills over time without exceeding capacity', () => {
		const c = clock();
		const limiter = new TokenBucketLimiter({ capacity: 2, refillPerSecond: 1, now: c.now });
		limiter.take('ip');
		limiter.take('ip');
		expect(limiter.take('ip').allowed).toBe(false);
		c.advance(1000);
		expect(limiter.take('ip').allowed).toBe(true);
		c.advance(60_000);
		expect(limiter.take('ip').remaining).toBe(1);
	});

	it('keeps keys independent and prunes idle buckets', () => {
		const c = clock();
		const limiter = new TokenBucketLimiter({ capacity: 1, refillPerSecond: 1, now: c.now });
		expect(limiter.take('a').allowed).toBe(true);
		expect(limiter.take('b').allowed).toBe(true);
		expect(limiter.take('a').allowed).toBe(false);
		expect(limiter.size).toBe(2);
		c.advance(5000);
		limiter.prune();
		expect(limiter.size).toBe(0);
	});

	it('validates its options', () => {
		expect(() => new TokenBucketLimiter({ capacity: 0, refillPerSecond: 1 })).toThrow(RangeError);
	});
});
