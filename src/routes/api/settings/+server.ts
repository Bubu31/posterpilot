import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { saveSettings, type AppConfig } from '$lib/server/config';

export const POST: RequestHandler = async ({ request }) => {
	const body = (await request.json().catch(() => ({}))) as Partial<Record<keyof AppConfig, string>>;
	await saveSettings(body);
	return json({ ok: true });
};
