<script lang="ts">
	import type { MediaItem } from '$lib/server/db/schema';

	let {
		item,
		selectable = false,
		selected = false,
		onToggle
	}: {
		item: MediaItem;
		selectable?: boolean;
		selected?: boolean;
		onToggle?: () => void;
	} = $props();
</script>

<div
	class="group relative overflow-hidden rounded-lg border border-neutral-800 bg-neutral-900 transition hover:border-neutral-600"
>
	<a href={`/item/${item.id}`} class="block">
		<div class="aspect-[2/3] w-full overflow-hidden bg-neutral-950">
			{#if item.currentPosterUrl}
				<img
					src={item.currentPosterUrl}
					alt={item.title}
					loading="lazy"
					class="h-full w-full object-cover transition group-hover:scale-[1.03]"
				/>
			{:else}
				<div class="flex h-full items-center justify-center text-xs text-neutral-600">No poster</div>
			{/if}
		</div>
		<div class="p-2">
			<p class="truncate text-sm font-medium text-neutral-100" title={item.title}>{item.title}</p>
			<p class="text-xs text-neutral-500">{item.year ?? '—'} · {item.type}</p>
		</div>
	</a>

	<div class="pointer-events-none absolute left-2 top-2 flex gap-1">
		{#if item.hasMediux}
			<span class="rounded bg-violet-600/90 px-1.5 py-0.5 text-[10px] font-semibold text-white"
				>MediaUX</span
			>
		{/if}
		{#if item.selectedPosterUrl}
			<span class="rounded bg-emerald-600/90 px-1.5 py-0.5 text-[10px] font-semibold text-white"
				>picked</span
			>
		{/if}
	</div>

	{#if selectable}
		<button
			type="button"
			onclick={onToggle}
			aria-label={selected ? 'Deselect' : 'Select'}
			class="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded border text-xs font-bold transition {selected
				? 'border-indigo-400 bg-indigo-500 text-white'
				: 'border-neutral-600 bg-neutral-900/80 text-transparent hover:border-neutral-400'}"
		>
			✓
		</button>
	{/if}
</div>
