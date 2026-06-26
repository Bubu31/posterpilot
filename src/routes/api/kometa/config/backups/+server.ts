import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getBackups } from '$lib/server/kometa/sync';

/** List the timestamped backups for the configured config.yml. */
export const GET: RequestHandler = async () => json({ backups: await getBackups() });
