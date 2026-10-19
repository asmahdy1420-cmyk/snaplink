import type { RequestEvent } from '@sveltejs/kit';
import { TokenBucketLimiter } from './rate-limit';

/** Ten actions per key in a burst, refilling one every six seconds. */
export const defaultLimiter = new TokenBucketLimiter({ capacity: 10, refillPerSecond: 1 / 6 });

export function clientIp(event: Pick<RequestEvent, 'getClientAddress'>): string {
	try {
		return event.getClientAddress();
	} catch {
		return 'unknown';
	}
}
