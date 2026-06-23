<script lang="ts">
	import { invalidateAll, goto } from '$app/navigation';
	import { m } from '$lib/paraglide/messages';
	import { setLocale } from '$lib/paraglide/runtime';
	import PlexLogin from '$lib/components/PlexLogin.svelte';

	let { data } = $props();

	const steps = [
		{ title: m.setup_step_language, desc: m.setup_step_language_desc },
		{ title: m.setup_step_server, desc: m.setup_step_server_desc },
		{ title: m.setup_step_tmdb, desc: m.setup_step_tmdb_desc },
		{ title: m.setup_step_providers, desc: m.setup_step_providers_desc },
		{ title: m.setup_step_sync, desc: m.setup_step_sync_desc }
	];
	const total = steps.length;
	let step = $state(0);

	// Step values, seeded from current config (so re-running the wizard is sane).
	let language = $state(data.locale);
	let serverType = $state<'plex' | 'jellyfin' | 'emby'>(data.config.serverType);

	let plexUrl = $state(data.config.plexUrl ?? '');
	let plexTokenSet = $state(data.config.plexTokenSet);

	let jellyfinUrl = $state(data.config.jellyfinUrl ?? '');
	let jellyfinApiKey = $state('');
	let embyUrl = $state(data.config.embyUrl ?? '');
	let embyApiKey = $state('');

	let tmdbKey = $state('');

	let providerMediux = $state(data.config.providerMediux);
	let providerTmdb = $state(data.config.providerTmdb);
	let providerFanart = $state(data.config.providerFanart);
	let providerThePosterDb = $state(data.config.providerThePosterDb);
	let fanartKey = $state('');

	let busy = $state(false);
	let testing = $state(false);
	let testMsg = $state<{ ok: boolean; text: string } | null>(null);
	let syncing = $state(false);
	let synced = $state(false);

	async function postSettings(payload: Record<string, unknown>) {
		await fetch('/api/settings', {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify(payload)
		});
	}

	function changeLanguage(event: Event) {
		const value = (event.currentTarget as HTMLSelectElement).value;
		language = value as typeof language;
		// setLocale persists `language` and reloads SSR in the chosen locale.
		setLocale(value as Parameters<typeof setLocale>[0]);
	}

	/** Persist the current step's values, then advance. */
	async function next() {
		busy = true;
		testMsg = null;
		try {
			if (step === 1) {
				const payload: Record<string, unknown> = { serverType };
				if (serverType === 'plex') {
					payload.plexUrl = plexUrl;
				} else if (serverType === 'jellyfin') {
					payload.jellyfinUrl = jellyfinUrl;
					if (jellyfinApiKey) payload.jellyfinApiKey = jellyfinApiKey;
				} else {
					payload.embyUrl = embyUrl;
					if (embyApiKey) payload.embyApiKey = embyApiKey;
				}
				await postSettings(payload);
			} else if (step === 2) {
				if (tmdbKey) await postSettings({ tmdbKey });
			} else if (step === 3) {
				const payload: Record<string, unknown> = {
					providerMediux: String(providerMediux),
					providerTmdb: String(providerTmdb),
					providerFanart: String(providerFanart),
					providerThePosterDb: String(providerThePosterDb)
				};
				if (fanartKey) payload.fanartKey = fanartKey;
				await postSettings(payload);
			}
			await invalidateAll();
			if (step < total - 1) step += 1;
		} finally {
			busy = false;
		}
	}

	function back() {
		testMsg = null;
		if (step > 0) step -= 1;
	}

	/** Save the current server fields, then test the stored config. */
	async function testServer() {
		testing = true;
		testMsg = null;
		try {
			const payload: Record<string, unknown> = { serverType };
			if (serverType === 'plex') {
				payload.plexUrl = plexUrl;
			} else if (serverType === 'jellyfin') {
				payload.jellyfinUrl = jellyfinUrl;
				if (jellyfinApiKey) payload.jellyfinApiKey = jellyfinApiKey;
			} else {
				payload.embyUrl = embyUrl;
				if (embyApiKey) payload.embyApiKey = embyApiKey;
			}
			await postSettings(payload);
			const res = await fetch('/api/settings/test', { method: 'POST' });
			const body = await res.json();
			testMsg = body.plex?.ok
				? { ok: true, text: m.setup_test_ok() }
				: { ok: false, text: m.setup_test_fail({ error: body.plex?.error ?? '' }) };
		} catch (e) {
			testMsg = {
				ok: false,
				text: m.setup_test_fail({ error: e instanceof Error ? e.message : String(e) })
			};
		} finally {
			testing = false;
		}
	}

	async function startSync() {
		syncing = true;
		try {
			await fetch('/api/sync', { method: 'POST' });
			synced = true;
		} finally {
			syncing = false;
		}
	}
</script>

<svelte:head><title>{m.setup_title()} · PosterPilot</title></svelte:head>

<div class="mx-auto max-w-xl">
	<div class="flex items-center justify-between">
		<h1 class="text-2xl font-semibold tracking-tight">{m.setup_title()}</h1>
		<a href="/" class="text-sm text-neutral-400 underline hover:text-neutral-200"
			>{m.setup_skip()}</a
		>
	</div>

	<!-- Progress -->
	<div class="mt-4 flex gap-1.5">
		{#each { length: total } as _, i (i)}
			<div class="h-1.5 flex-1 rounded-full {i <= step ? 'bg-accent-500' : 'bg-neutral-800'}"></div>
		{/each}
	</div>
	<p class="mt-2 text-xs text-neutral-500">{m.setup_step({ current: step + 1, total })}</p>

	<div class="surface mt-4 space-y-4 p-5">
		<div>
			<h2 class="text-lg font-medium">{steps[step].title()}</h2>
			<p class="mt-0.5 text-sm text-neutral-500">{steps[step].desc()}</p>
		</div>

		{#if step === 0}
			<div>
				<label for="setup-lang" class="mb-1 block text-sm font-medium"
					>{m.settings_language()}</label
				>
				<select id="setup-lang" value={language} onchange={changeLanguage} class="input w-full">
					{#each data.availableLocales as loc (loc.code)}
						<option value={loc.code}>{loc.name}</option>
					{/each}
				</select>
				<p class="mt-1 text-xs text-neutral-500">{m.settings_language_hint()}</p>
			</div>
		{:else if step === 1}
			<div>
				<label for="setup-server" class="mb-1 block text-sm font-medium"
					>{m.settings_media_server()}</label
				>
				<select id="setup-server" bind:value={serverType} class="input w-full">
					<option value="plex">{m.setup_plex_choose()}</option>
					<option value="jellyfin">{m.setup_jellyfin_choose()}</option>
					<option value="emby">{m.setup_emby_choose()}</option>
				</select>
			</div>

			{#if serverType === 'plex'}
				<PlexLogin bind:plexUrl bind:plexTokenSet onLogin={() => invalidateAll()} />
			{:else if serverType === 'jellyfin'}
				<div>
					<label for="setup-jf-url" class="mb-1 block text-sm font-medium"
						>{m.settings_jellyfin_url()}</label
					>
					<input
						id="setup-jf-url"
						bind:value={jellyfinUrl}
						placeholder="http://192.168.1.10:8096"
						class="input w-full"
					/>
				</div>
				<div>
					<label for="setup-jf-key" class="mb-1 block text-sm font-medium"
						>{m.settings_jellyfin_api_key()}</label
					>
					<input
						id="setup-jf-key"
						type="password"
						bind:value={jellyfinApiKey}
						placeholder={data.config.jellyfinApiKeySet
							? m.settings_secret_placeholder_set()
							: m.settings_jellyfin_api_key_placeholder_unset()}
						class="input w-full"
					/>
				</div>
				<button onclick={testServer} disabled={testing} class="btn btn-subtle px-3 py-1.5">
					{testing ? m.setup_testing() : m.setup_test()}
				</button>
			{:else}
				<div>
					<label for="setup-emby-url" class="mb-1 block text-sm font-medium"
						>{m.settings_emby_url()}</label
					>
					<input
						id="setup-emby-url"
						bind:value={embyUrl}
						placeholder="http://192.168.1.10:8096"
						class="input w-full"
					/>
				</div>
				<div>
					<label for="setup-emby-key" class="mb-1 block text-sm font-medium"
						>{m.settings_emby_api_key()}</label
					>
					<input
						id="setup-emby-key"
						type="password"
						bind:value={embyApiKey}
						placeholder={data.config.embyApiKeySet
							? m.settings_secret_placeholder_set()
							: m.settings_emby_api_key_placeholder_unset()}
						class="input w-full"
					/>
				</div>
				<button onclick={testServer} disabled={testing} class="btn btn-subtle px-3 py-1.5">
					{testing ? m.setup_testing() : m.setup_test()}
				</button>
			{/if}

			{#if testMsg}
				<p class="text-sm {testMsg.ok ? 'text-emerald-400' : 'text-red-400'}">{testMsg.text}</p>
			{/if}
		{:else if step === 2}
			<div>
				<label for="setup-tmdb" class="mb-1 block text-sm font-medium"
					>{m.settings_tmdb_key()}</label
				>
				<input
					id="setup-tmdb"
					type="password"
					bind:value={tmdbKey}
					placeholder={data.config.tmdbKeySet
						? m.settings_secret_placeholder_set()
						: m.settings_tmdb_key_placeholder_unset()}
					class="input w-full"
				/>
				<p class="mt-1 text-xs text-neutral-500">
					{m.setup_tmdb_get_key_pre()}
					<a
						href="https://www.themoviedb.org/settings/api"
						target="_blank"
						rel="noopener"
						class="text-accent-300 underline">{m.setup_tmdb_get_key_link()}</a
					>.
				</p>
			</div>
		{:else if step === 3}
			<div class="space-y-1">
				<label class="flex items-center gap-2 text-sm text-neutral-300">
					<input type="checkbox" bind:checked={providerMediux} />
					{m.settings_provider_mediux()}
				</label>
				<label class="flex items-center gap-2 text-sm text-neutral-300">
					<input type="checkbox" bind:checked={providerTmdb} />
					{m.settings_provider_tmdb()}
				</label>
				<label class="flex items-center gap-2 text-sm text-neutral-300">
					<input type="checkbox" bind:checked={providerFanart} />
					{m.settings_provider_fanart()}
				</label>
				<label class="flex items-center gap-2 text-sm text-neutral-300">
					<input type="checkbox" bind:checked={providerThePosterDb} />
					{m.settings_provider_theposterdb()}
					<span class="text-xs text-neutral-500">{m.settings_experimental()}</span>
				</label>
			</div>
			<div>
				<label for="setup-fanart" class="mb-1 block text-sm font-medium"
					>{m.settings_fanart_key()}</label
				>
				<input
					id="setup-fanart"
					type="password"
					bind:value={fanartKey}
					placeholder={data.config.fanartKeySet
						? m.settings_secret_placeholder_set()
						: m.settings_fanart_key_placeholder_unset()}
					class="input w-full"
				/>
			</div>
		{:else}
			<div class="space-y-3">
				<button onclick={startSync} disabled={syncing || synced} class="btn btn-accent px-4 py-2">
					{syncing ? m.setup_sync_running() : m.setup_sync_start()}
				</button>
				{#if synced}
					<p class="text-sm text-emerald-400">{m.setup_done()}</p>
				{/if}
				<div>
					<button onclick={() => goto('/')} class="btn btn-subtle px-4 py-2">
						{m.setup_go_dashboard()}
					</button>
				</div>
			</div>
		{/if}

		{#if step < total - 1}
			<div class="flex items-center gap-3 border-t border-neutral-800 pt-4">
				{#if step > 0}
					<button onclick={back} class="btn btn-ghost px-4 py-2">{m.setup_back()}</button>
				{/if}
				<button onclick={next} disabled={busy} class="btn btn-accent ml-auto px-4 py-2">
					{busy ? m.setup_saving() : m.setup_next()}
				</button>
			</div>
		{:else}
			<div class="flex items-center gap-3 border-t border-neutral-800 pt-4">
				<button onclick={back} class="btn btn-ghost px-4 py-2">{m.setup_back()}</button>
			</div>
		{/if}
	</div>
</div>
