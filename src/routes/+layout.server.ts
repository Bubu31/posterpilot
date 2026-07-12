import type { LayoutServerLoad } from './$types';
import { resolveConfig } from '$lib/server/config';
import { activeJobCount } from '$lib/server/queries';
import { listManagedServers } from '$lib/server/server-instances';
import { SUPPORTED_LOCALES, LOCALE_NAMES } from '$lib/i18n/resolve';
import { version } from '$lib/version';

export const load: LayoutServerLoad = async ({ locals }) => {
	const [config, serverManagement] = await Promise.all([resolveConfig(), listManagedServers()]);
	const activeJobs = serverManagement.activeServerId
		? await activeJobCount(serverManagement.activeServerId)
		: 0;
	const selectableServers = serverManagement.servers.filter(
		(server) => server.enabled && !server.disconnectedAt
	);
	return {
		activeJobs,
		version,
		// Ready when the active media server is configured and TMDB is set.
		configReady: Boolean(serverManagement.activeServerId && config.tmdbKey),
		serverSelection: {
			activeServerId: serverManagement.activeServerId,
			servers: selectableServers.map(({ id, name, type }) => ({ id, name, type }))
		},
		// Gates the "Fun" nav entry (the /fun route also 404s server-side when off).
		funEnabled: config.funEnabled,
		// Active locale (resolved per request in hooks.server.ts) plus the available
		// locales, so the header switcher and client runtime stay in sync with SSR.
		locale: locals.locale,
		availableLocales: SUPPORTED_LOCALES.map((code) => ({ code, name: LOCALE_NAMES[code] })),
		// Whether to show the logout control: auth is on and this request is a real
		// authenticated session (not the `disabled`/local-bypass passthrough).
		showLogout: locals.authMode !== 'disabled' && !!locals.authUser
	};
};
