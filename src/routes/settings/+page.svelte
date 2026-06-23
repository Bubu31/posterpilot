<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import { SvelteSet } from 'svelte/reactivity';
	import { m } from '$lib/paraglide/messages';
	import { setLocale } from '$lib/paraglide/runtime';

	let { data } = $props();
	const env = data.config.envManaged;

	const allSectionKeys = data.sections.map((s) => s.key);
	const selectedSections = new SvelteSet<string>(
		data.config.includedSections.length ? data.config.includedSections : allSectionKeys
	);
	function toggleSection(key: string) {
		if (selectedSections.has(key)) selectedSections.delete(key);
		else selectedSections.add(key);
	}

	let serverType = $state<'plex' | 'jellyfin' | 'emby'>(data.config.serverType);

	// Plex
	let plexUrl = $state(data.config.plexUrl ?? '');
	let plexToken = $state('');

	// Jellyfin / Emby
	let jellyfinUrl = $state(data.config.jellyfinUrl ?? '');
	let jellyfinApiKey = $state('');
	let embyUrl = $state(data.config.embyUrl ?? '');
	let embyApiKey = $state('');

	let tmdbKey = $state('');
	let kometaAssetsDir = $state(data.config.kometaAssetsDir);
	let mediuxDelayMs = $state(String(data.config.mediuxDelayMs));
	let mediuxConcurrency = $state(String(data.config.mediuxConcurrency));
	let httpCacheTtlDays = $state(String(data.config.httpCacheTtlDays));
	let defaultApplyMethod = $state(data.config.defaultApplyMethod);
	// Preferred UI language — reflects the active locale and writes the same
	// `language` setting as the header switcher.
	let language = $state(data.locale);

	let providerMediux = $state(data.config.providerMediux);
	let providerTmdb = $state(data.config.providerTmdb);
	let providerFanart = $state(data.config.providerFanart);
	let providerThePosterDb = $state(data.config.providerThePosterDb);
	let fanartKey = $state('');

	let saving = $state(false);
	let testing = $state(false);
	let saved = $state(false);
	let testResult = $state<{
		serverType?: string;
		plex: { ok: boolean; error?: string };
		tmdb: { ok: boolean; error?: string };
	} | null>(null);

	// --- Plex PIN login ---
	let plexTokenSet = $state(data.config.plexTokenSet);
	let login = $state<{
		code: string;
		authUrl: string;
		linkUrl: string;
		status: 'pending' | 'done' | 'error';
		error?: string;
	} | null>(null);
	let pollTimer: ReturnType<typeof setInterval> | null = null;

	function stopPolling() {
		if (pollTimer) {
			clearInterval(pollTimer);
			pollTimer = null;
		}
	}

	async function startPlexLogin() {
		stopPolling();
		login = null;
		try {
			const res = await fetch('/api/plex/pin', { method: 'POST' });
			const body = await res.json();
			if (!res.ok) throw new Error(body.error ?? 'Could not create a PIN');
			login = {
				code: body.code,
				authUrl: body.authUrl,
				linkUrl: body.linkUrl,
				status: 'pending'
			};
			const id = body.id as number;
			const expiresAt = body.expiresAt ? new Date(body.expiresAt).getTime() : Date.now() + 600_000;
			pollTimer = setInterval(async () => {
				if (Date.now() > expiresAt) {
					stopPolling();
					if (login) login = { ...login, status: 'error', error: 'The PIN expired. Try again.' };
					return;
				}
				try {
					const pr = await fetch(`/api/plex/pin/${id}`);
					const pb = await pr.json();
					if (pb.authorized) {
						stopPolling();
						plexTokenSet = true;
						if (login) login = { ...login, status: 'done' };
						await invalidateAll();
						await loadConnections();
					}
				} catch {
					// transient; keep polling until expiry
				}
			}, 2000);
		} catch (e) {
			login = {
				code: '',
				authUrl: '',
				linkUrl: '',
				status: 'error',
				error: e instanceof Error ? e.message : String(e)
			};
		}
	}

	// --- Plex connection discovery ---
	type Connection = {
		serverName: string;
		uri: string;
		address: string;
		local: boolean;
		relay: boolean;
		https: boolean;
	};
	let connections = $state<Connection[]>([]);
	let loadingConnections = $state(false);
	let connectionError = $state<string | null>(null);

	async function loadConnections() {
		loadingConnections = true;
		connectionError = null;
		try {
			const res = await fetch('/api/plex/connections');
			const body = await res.json();
			if (!res.ok) throw new Error(body.error ?? 'Discovery failed');
			connections = body.connections ?? [];
		} catch (e) {
			connectionError = e instanceof Error ? e.message : String(e);
		} finally {
			loadingConnections = false;
		}
	}

	function pickConnection(uri: string) {
		plexUrl = uri;
	}

	async function save() {
		saving = true;
		saved = false;
		try {
			const payload: Record<string, unknown> = {
				serverType,
				plexUrl,
				jellyfinUrl,
				embyUrl,
				kometaAssetsDir,
				mediuxDelayMs,
				mediuxConcurrency,
				httpCacheTtlDays,
				defaultApplyMethod
			};
			// Only send secrets when (re)entered, so a blank field keeps the stored value.
			if (plexToken) payload.plexToken = plexToken;
			if (jellyfinApiKey) payload.jellyfinApiKey = jellyfinApiKey;
			if (embyApiKey) payload.embyApiKey = embyApiKey;
			if (tmdbKey) payload.tmdbKey = tmdbKey;
			if (fanartKey) payload.fanartKey = fanartKey;
			payload.providerMediux = String(providerMediux);
			payload.providerTmdb = String(providerTmdb);
			payload.providerFanart = String(providerFanart);
			payload.providerThePosterDb = String(providerThePosterDb);
			// All sections selected → [] (sync everything, incl. future libraries).
			const sel = [...selectedSections];
			payload.includedSections = sel.length === allSectionKeys.length ? [] : sel;

			await fetch('/api/settings', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify(payload)
			});
			plexToken = '';
			jellyfinApiKey = '';
			embyApiKey = '';
			tmdbKey = '';
			fanartKey = '';
			saved = true;
			await invalidateAll();
		} finally {
			saving = false;
		}
	}

	async function test() {
		testing = true;
		testResult = null;
		try {
			const res = await fetch('/api/settings/test', { method: 'POST' });
			testResult = await res.json();
		} finally {
			testing = false;
		}
	}

	const serverLabel = $derived(
		serverType === 'jellyfin' ? 'Jellyfin' : serverType === 'emby' ? 'Emby' : 'Plex'
	);

	// Persist the preferred language through the same path as the header switcher
	// (writes the `language` setting, then reloads so SSR re-renders in the locale).
	function changeLanguage(event: Event) {
		const value = (event.currentTarget as HTMLSelectElement).value;
		language = value as typeof language;
		setLocale(value as Parameters<typeof setLocale>[0]);
	}
</script>

<h1 class="text-2xl font-semibold tracking-tight">{m.settings_title()}</h1>

<div class="mt-6 max-w-xl space-y-5">
	<div>
		<label for="language" class="mb-1 block text-sm font-medium">{m.settings_language()}</label>
		<select id="language" value={language} onchange={changeLanguage} class="input">
			{#each data.availableLocales as loc (loc.code)}
				<option value={loc.code}>{loc.name}</option>
			{/each}
		</select>
		<p class="mt-1 text-xs text-neutral-500">{m.settings_language_hint()}</p>
	</div>

	<div>
		<label for="serverType" class="mb-1 block text-sm font-medium"
			>{m.settings_media_server()}</label
		>
		<select id="serverType" bind:value={serverType} disabled={env.serverType} class="input">
			<option value="plex">Plex</option>
			<option value="jellyfin">Jellyfin</option>
			<option value="emby">Emby</option>
		</select>
		{#if env.serverType}<p class="mt-1 text-xs text-amber-400">{m.settings_set_from_env()}</p>{/if}
	</div>

	{#if serverType === 'plex'}
		<div class="surface space-y-4 p-4">
			<div class="flex items-center justify-between gap-3">
				<div>
					<p class="text-sm font-medium">{m.settings_plex_account()}</p>
					<p class="text-xs text-neutral-500">
						{plexTokenSet ? m.settings_plex_token_set() : m.settings_plex_login_hint()}
					</p>
				</div>
				<button onclick={startPlexLogin} class="btn btn-subtle px-3 py-1.5">
					{plexTokenSet ? m.settings_log_in_again() : m.settings_log_in()}
				</button>
			</div>

			{#if login}
				{#if login.status === 'pending'}
					<div class="rounded-md border border-neutral-700 bg-black/40 p-3 text-sm">
						<p>
							{m.settings_plex_open_link_pre()}
							<a
								href={login.linkUrl}
								target="_blank"
								rel="noopener"
								class="text-accent-300 underline"
							>
								plex.tv/link
							</a>
							{m.settings_plex_open_link_post()}
						</p>
						<p class="mt-2 font-mono text-2xl tracking-widest text-accent-200">{login.code}</p>
						<p class="mt-2 text-xs text-neutral-500">
							{m.settings_plex_or_authorize_pre()}
							<a
								href={login.authUrl}
								target="_blank"
								rel="noopener"
								class="text-accent-300 underline">{m.settings_plex_authorize_directly()}</a
							>{m.settings_plex_waiting()}
						</p>
					</div>
				{:else if login.status === 'done'}
					<p class="text-sm text-emerald-400">{m.settings_plex_logged_in()}</p>
				{:else}
					<p class="text-sm text-red-400">{login.error}</p>
				{/if}
			{/if}

			<div>
				<div class="flex items-center justify-between">
					<label for="plexUrl" class="mb-1 block text-sm font-medium">{m.settings_plex_url()}</label
					>
					<button
						onclick={loadConnections}
						disabled={!plexTokenSet || loadingConnections}
						class="btn btn-ghost px-2 py-1 text-xs"
					>
						{loadingConnections ? m.settings_finding() : m.settings_find_servers()}
					</button>
				</div>
				<input
					id="plexUrl"
					bind:value={plexUrl}
					disabled={env.plexUrl}
					placeholder="http://192.168.1.10:32400"
					class="input w-full disabled:opacity-50"
				/>
				{#if env.plexUrl}<p class="mt-1 text-xs text-amber-400">{m.settings_set_from_env()}</p>{/if}

				{#if connectionError}<p class="mt-1 text-xs text-red-400">{connectionError}</p>{/if}
				{#if connections.length}
					<div class="mt-2 space-y-1">
						{#each connections as conn (conn.uri)}
							<button
								onclick={() => pickConnection(conn.uri)}
								class="flex w-full items-center justify-between rounded-md border px-2 py-1.5 text-left text-xs transition {plexUrl ===
								conn.uri
									? 'border-accent-600 bg-accent-950/60'
									: 'border-neutral-700 hover:border-neutral-500'}"
							>
								<span class="truncate">
									<span class="text-neutral-200">{conn.serverName}</span>
									<span class="ml-1 text-neutral-500">{conn.uri}</span>
								</span>
								<span class="ml-2 flex shrink-0 gap-1">
									<span class="badge {conn.local ? 'badge-changed' : 'badge-muted'}">
										{conn.local ? m.settings_local() : m.settings_remote()}
									</span>
									{#if conn.relay}<span class="badge badge-muted">{m.settings_relay()}</span>{/if}
								</span>
							</button>
						{/each}
					</div>
				{/if}
			</div>

			<div>
				<label for="plexToken" class="mb-1 block text-sm font-medium"
					>{m.settings_plex_token_manual()}</label
				>
				<input
					id="plexToken"
					type="password"
					bind:value={plexToken}
					disabled={env.plexToken}
					placeholder={plexTokenSet
						? m.settings_plex_token_placeholder_set()
						: m.settings_plex_token_placeholder_unset()}
					class="input w-full disabled:opacity-50"
				/>
				{#if env.plexToken}<p class="mt-1 text-xs text-amber-400">
						{m.settings_set_from_env()}
					</p>{/if}
			</div>
		</div>
	{:else if serverType === 'jellyfin'}
		<div class="surface space-y-4 p-4">
			<div>
				<label for="jellyfinUrl" class="mb-1 block text-sm font-medium"
					>{m.settings_jellyfin_url()}</label
				>
				<input
					id="jellyfinUrl"
					bind:value={jellyfinUrl}
					disabled={env.jellyfinUrl}
					placeholder="http://192.168.1.10:8096"
					class="input w-full disabled:opacity-50"
				/>
				{#if env.jellyfinUrl}<p class="mt-1 text-xs text-amber-400">
						{m.settings_set_from_env()}
					</p>{/if}
			</div>
			<div>
				<label for="jellyfinApiKey" class="mb-1 block text-sm font-medium"
					>{m.settings_jellyfin_api_key()}</label
				>
				<input
					id="jellyfinApiKey"
					type="password"
					bind:value={jellyfinApiKey}
					disabled={env.jellyfinApiKey}
					placeholder={data.config.jellyfinApiKeySet
						? m.settings_secret_placeholder_set()
						: m.settings_jellyfin_api_key_placeholder_unset()}
					class="input w-full disabled:opacity-50"
				/>
				{#if env.jellyfinApiKey}<p class="mt-1 text-xs text-amber-400">
						{m.settings_set_from_env()}
					</p>{/if}
			</div>
		</div>
	{:else}
		<div class="surface space-y-4 p-4">
			<div>
				<label for="embyUrl" class="mb-1 block text-sm font-medium">{m.settings_emby_url()}</label>
				<input
					id="embyUrl"
					bind:value={embyUrl}
					disabled={env.embyUrl}
					placeholder="http://192.168.1.10:8096"
					class="input w-full disabled:opacity-50"
				/>
				{#if env.embyUrl}<p class="mt-1 text-xs text-amber-400">{m.settings_set_from_env()}</p>{/if}
			</div>
			<div>
				<label for="embyApiKey" class="mb-1 block text-sm font-medium"
					>{m.settings_emby_api_key()}</label
				>
				<input
					id="embyApiKey"
					type="password"
					bind:value={embyApiKey}
					disabled={env.embyApiKey}
					placeholder={data.config.embyApiKeySet
						? m.settings_secret_placeholder_set()
						: m.settings_emby_api_key_placeholder_unset()}
					class="input w-full disabled:opacity-50"
				/>
				{#if env.embyApiKey}<p class="mt-1 text-xs text-amber-400">
						{m.settings_set_from_env()}
					</p>{/if}
			</div>
		</div>
	{/if}

	<div>
		<label for="tmdbKey" class="mb-1 block text-sm font-medium">{m.settings_tmdb_key()}</label>
		<input
			id="tmdbKey"
			type="password"
			bind:value={tmdbKey}
			disabled={env.tmdbKey}
			placeholder={data.config.tmdbKeySet
				? m.settings_secret_placeholder_set()
				: m.settings_tmdb_key_placeholder_unset()}
			class="input w-full disabled:opacity-50"
		/>
		{#if env.tmdbKey}<p class="mt-1 text-xs text-amber-400">{m.settings_set_from_env()}</p>{/if}
	</div>

	<div>
		<label for="kometaAssetsDir" class="mb-1 block text-sm font-medium"
			>{m.settings_kometa_dir()}</label
		>
		<input
			id="kometaAssetsDir"
			bind:value={kometaAssetsDir}
			disabled={env.kometaAssetsDir}
			class="input w-full disabled:opacity-50"
		/>
		<p class="mt-1 text-xs text-neutral-500">
			{m.settings_kometa_dir_hint()}
		</p>
	</div>

	<div class="grid grid-cols-3 gap-3">
		<div>
			<label for="delay" class="mb-1 block text-sm font-medium">{m.settings_delay()}</label>
			<input id="delay" bind:value={mediuxDelayMs} class="input w-full" />
		</div>
		<div>
			<label for="conc" class="mb-1 block text-sm font-medium">{m.settings_concurrency()}</label>
			<input id="conc" bind:value={mediuxConcurrency} class="input w-full" />
		</div>
		<div>
			<label for="ttl" class="mb-1 block text-sm font-medium">{m.settings_cache_days()}</label>
			<input id="ttl" bind:value={httpCacheTtlDays} class="input w-full" />
		</div>
	</div>

	<div>
		<label for="method" class="mb-1 block text-sm font-medium"
			>{m.settings_default_apply_method()}</label
		>
		<select id="method" bind:value={defaultApplyMethod} class="input">
			<option value="both">{m.settings_method_both({ server: serverLabel })}</option>
			<option value="plex">{m.settings_method_server_only({ server: serverLabel })}</option>
			<option value="kometa">{m.settings_method_kometa_only()}</option>
		</select>
	</div>

	<div>
		<span class="mb-1 block text-sm font-medium">{m.settings_providers()}</span>
		<p class="mb-2 text-xs text-neutral-500">
			{m.settings_providers_hint()}
		</p>
		<div class="space-y-1">
			<label class="flex items-center gap-2 text-sm text-neutral-300">
				<input
					type="checkbox"
					bind:checked={providerMediux}
					disabled={data.config.envManaged.providerMediux}
				/>
				{m.settings_provider_mediux()}
			</label>
			<label class="flex items-center gap-2 text-sm text-neutral-300">
				<input
					type="checkbox"
					bind:checked={providerTmdb}
					disabled={data.config.envManaged.providerTmdb}
				/>
				{m.settings_provider_tmdb()}
			</label>
			<label class="flex items-center gap-2 text-sm text-neutral-300">
				<input
					type="checkbox"
					bind:checked={providerFanart}
					disabled={data.config.envManaged.providerFanart}
				/>
				{m.settings_provider_fanart()}
			</label>
			<label class="flex items-center gap-2 text-sm text-neutral-300">
				<input
					type="checkbox"
					bind:checked={providerThePosterDb}
					disabled={data.config.envManaged.providerThePosterDb}
				/>
				{m.settings_provider_theposterdb()}
				<span class="text-xs text-neutral-500">{m.settings_experimental()}</span>
			</label>
		</div>
		<div class="mt-3">
			<label for="fanartKey" class="mb-1 block text-sm font-medium">{m.settings_fanart_key()}</label
			>
			<input
				id="fanartKey"
				type="password"
				bind:value={fanartKey}
				disabled={data.config.envManaged.fanartKey}
				placeholder={data.config.fanartKeySet
					? m.settings_secret_placeholder_set()
					: m.settings_fanart_key_placeholder_unset()}
				class="input w-full disabled:opacity-50"
			/>
			{#if data.config.envManaged.fanartKey}<p class="mt-1 text-xs text-amber-400">
					{m.settings_set_from_env()}
				</p>{/if}
		</div>
	</div>

	<div>
		<span class="mb-1 block text-sm font-medium">{m.settings_libraries_to_sync()}</span>
		{#if data.sections.length === 0}
			<p class="text-xs text-neutral-500">
				{m.settings_libraries_connect_first()}
			</p>
		{:else}
			<p class="mb-2 text-xs text-neutral-500">
				{m.settings_libraries_hint()}
			</p>
			<div class="space-y-1">
				{#each data.sections as section (section.key)}
					<label class="flex items-center gap-2 text-sm text-neutral-300">
						<input
							type="checkbox"
							checked={selectedSections.has(section.key)}
							onchange={() => toggleSection(section.key)}
						/>
						{section.title}
						<span class="text-xs text-neutral-500">({section.type})</span>
					</label>
				{/each}
			</div>
		{/if}
	</div>

	<div class="flex items-center gap-3 pt-2">
		<button onclick={save} disabled={saving} class="btn btn-accent px-4 py-2"
			>{saving ? m.settings_saving() : m.settings_save()}</button
		>
		<button onclick={test} disabled={testing} class="btn btn-subtle px-4 py-2"
			>{testing ? m.settings_testing() : m.settings_test_connections()}</button
		>
		{#if saved}<span class="text-sm text-emerald-400">{m.settings_saved()}</span>{/if}
	</div>

	{#if testResult}
		<div class="surface space-y-1 p-3 text-sm">
			<p>
				{serverLabel}: {testResult.plex.ok
					? m.settings_test_result_ok()
					: m.settings_test_result_fail({ error: testResult.plex.error ?? '' })}
			</p>
			<p>
				TMDB: {testResult.tmdb.ok
					? m.settings_test_result_ok()
					: m.settings_test_result_fail({ error: testResult.tmdb.error ?? '' })}
			</p>
		</div>
	{/if}
</div>
