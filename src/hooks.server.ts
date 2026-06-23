import type { Handle } from '@sveltejs/kit';
import { migrateDb } from '$lib/server/db';
import { markInterruptedJobs } from '$lib/server/jobs/runner';
import { paraglideMiddleware } from '$lib/paraglide/server';
import { registerServerLocaleStrategy } from '$lib/i18n/strategy.server';

// Run database migrations once at server startup, before any request is handled.
await migrateDb();

// Any job left "pending"/"running" by a previous crash is marked interrupted.
await markInterruptedJobs();

// Register the highest-precedence "custom-setting" locale strategy (reads the
// persisted `language` app setting) before any request is handled.
registerServerLocaleStrategy();

// Resolve the active locale per request via Paraglide (custom-setting setting →
// Accept-Language → English) and make it the ambient locale for SSR. The
// resolved locale is stashed on `event.locals` for the root layout load, which
// surfaces it to the client and sets `<html lang>`.
export const handle: Handle = ({ event, resolve }) =>
	paraglideMiddleware(event.request, ({ request, locale }) => {
		event.locals.locale = locale;
		return resolve(
			{ ...event, request },
			{
				transformPageChunk: ({ html }) => html.replace('%lang%', locale)
			}
		);
	});
