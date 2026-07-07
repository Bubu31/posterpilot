/**
 * Toast notifications — a tiny runes-based store shared across the app.
 *
 * `push` a transient message; success/info auto-dismiss, errors stay until the user
 * dismisses them (so an error is never missed). The `<Toaster>` component renders the
 * list in an ARIA live region.
 */
export type ToastType = 'success' | 'error' | 'info';

export interface Toast {
	id: number;
	message: string;
	type: ToastType;
}

const DEFAULT_TTL_MS = 4000;

let items = $state<Toast[]>([]);
let nextId = 0;

export const toasts = {
	/** The current toasts (reactive). */
	get items(): Toast[] {
		return items;
	},

	/**
	 * Show a toast. Errors persist (ttlMs = 0) so they can't be missed; success/info
	 * auto-dismiss. Returns the toast id.
	 */
	push(message: string, type: ToastType = 'info', ttlMs?: number): number {
		const id = nextId++;
		items = [...items, { id, message, type }];
		const ttl = ttlMs ?? (type === 'error' ? 0 : DEFAULT_TTL_MS);
		if (ttl > 0) setTimeout(() => toasts.dismiss(id), ttl);
		return id;
	},

	success(message: string, ttlMs?: number): number {
		return toasts.push(message, 'success', ttlMs);
	},

	error(message: string, ttlMs?: number): number {
		return toasts.push(message, 'error', ttlMs);
	},

	dismiss(id: number): void {
		items = items.filter((t) => t.id !== id);
	}
};
