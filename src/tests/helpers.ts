import {
	isActionFailure,
	type ActionFailure,
	type Cookies,
	type RequestEvent
} from '@sveltejs/kit';
import { createMemoryRepository } from '$lib/server/db';
import { TokenBucketLimiter } from '$lib/server/rate-limit';

export interface CookieRecord {
	value: string;
	options: Record<string, unknown>;
}

export function mockCookies(initial: Record<string, string> = {}) {
	const jar = new Map<string, CookieRecord>(
		Object.entries(initial).map(([name, value]) => [name, { value, options: {} }])
	);
	const cookies = {
		get: (name: string) => jar.get(name)?.value,
		getAll: () => [...jar].map(([name, c]) => ({ name, value: c.value })),
		set: (name: string, value: string, options: Record<string, unknown>) => {
			jar.set(name, { value, options });
		},
		delete: (name: string) => {
			jar.delete(name);
		},
		serialize: () => ''
	};
	return { cookies: cookies as unknown as Cookies, jar };
}

export interface MockEventOptions {
	url?: string;
	method?: string;
	form?: Record<string, string>;
	headers?: Record<string, string>;
	params?: Record<string, string>;
	locals?: Partial<App.Locals>;
	cookies?: Cookies;
	ip?: string;
}

export function testLocals(overrides: Partial<App.Locals> = {}): App.Locals {
	return {
		repo: createMemoryRepository(),
		limiter: new TokenBucketLimiter({ capacity: 100, refillPerSecond: 1 }),
		isAdmin: false,
		...overrides
	};
}

/** Builds the subset of RequestEvent that snaplink's handlers use. */
export function mockEvent<E = RequestEvent>(options: MockEventOptions = {}): E {
	const url = new URL(options.url ?? 'http://sn.test/');
	const method = options.method ?? (options.form ? 'POST' : 'GET');
	const body = options.form ? new URLSearchParams(options.form) : undefined;
	const request = new Request(url, { method, headers: options.headers, body });
	const event = {
		url,
		request,
		params: options.params ?? {},
		locals: testLocals(options.locals),
		cookies: options.cookies ?? mockCookies().cookies,
		getClientAddress: () => options.ip ?? '203.0.113.10',
		setHeaders: () => {},
		route: { id: null },
		isDataRequest: false,
		isSubRequest: false
	};
	return event as unknown as E;
}

/** Runs a handler that is expected to throw (redirect/error) and returns what it threw. */
export async function thrown(fn: () => unknown): Promise<unknown> {
	try {
		await fn();
	} catch (err) {
		return err;
	}
	throw new Error('Expected the handler to throw');
}

type FailureData<T> = T extends ActionFailure<infer D> ? D : never;

/** Asserts that an action returned `fail(...)` and exposes its status and data. */
export function failure<T>(result: T): { status: number; data: FailureData<T> } {
	if (!isActionFailure(result)) throw new Error('Expected the action to return a failure');
	return result as unknown as { status: number; data: FailureData<T> };
}
