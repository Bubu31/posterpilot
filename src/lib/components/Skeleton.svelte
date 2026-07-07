<script lang="ts">
	// A shimmer placeholder. `class` sizes/shapes it (e.g. aspect-[2/3] rounded-lg).
	let { class: className = '' }: { class?: string } = $props();
</script>

<div class="skeleton {className}" aria-hidden="true"></div>

<style>
	.skeleton {
		background: linear-gradient(
			100deg,
			var(--color-neutral-900) 30%,
			var(--color-neutral-800) 50%,
			var(--color-neutral-900) 70%
		);
		background-size: 200% 100%;
		animation: skeleton-shimmer 1.4s ease-in-out infinite;
	}
	@keyframes skeleton-shimmer {
		to {
			background-position: -200% 0;
		}
	}
	/* Motion-safety: a static muted block instead of the shimmer sweep. */
	@media (prefers-reduced-motion: reduce) {
		.skeleton {
			animation: none;
			background: var(--color-neutral-900);
		}
	}
</style>
