import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

// ponytail: temporary build-freshness probe — remove once the deploy pipeline is trusted.
export const GET: RequestHandler = async () => json({ build: '6100ad4-ping' });
