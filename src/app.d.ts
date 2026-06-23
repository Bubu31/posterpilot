// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
declare global {
	namespace App {
		// interface Error {}
		interface Locals {
			/** Active UI locale resolved per request by the Paraglide handle hook. */
			locale: import('$lib/i18n/resolve').Locale;
		}
		// interface PageData {}
		// interface PageState {}
		// interface Platform {}
	}
}

export {};
