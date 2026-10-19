// See https://svelte.dev/docs/kit/types#app.d.ts
import type { RateLimiter } from '$lib/server/rate-limit';
import type { LinkRepository } from '$lib/server/types';

declare global {
	namespace App {
		interface Locals {
			repo: LinkRepository;
			limiter: RateLimiter;
			isAdmin: boolean;
		}
	}
}

export {};
