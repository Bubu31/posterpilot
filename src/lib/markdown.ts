/**
 * Minimal, safe Markdown renderer for GitHub release notes (the What's New modal).
 *
 * Supports just what release-please emits: `##`/`###`/`####` headings, `* `/`- `
 * bullet lists, `**bold**`, `[text](url)` links, and inline `code`. It is NOT a
 * general Markdown engine.
 *
 * Security: the input (a GitHub release body) is HTML-escaped first, then only a
 * fixed whitelist of tags is produced. Link hrefs are restricted to http(s)/mailto,
 * so the result is safe to inject with `{@html}`.
 */

function escapeHtml(input: string): string {
	return input
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&#39;');
}

/** Allow only safe link schemes; everything else renders as plain text. */
function safeHref(url: string): string | null {
	const trimmed = url.trim();
	if (/^https?:\/\//i.test(trimmed) || /^mailto:/i.test(trimmed)) return trimmed;
	return null;
}

/** Inline formatting applied to already-escaped text: links, bold, code. */
function renderInline(escaped: string): string {
	// Links first so later passes operate on the visible text, not the href.
	let out = escaped.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_match, text: string, url: string) => {
		const href = safeHref(url);
		if (!href) return text;
		return `<a href="${href}" target="_blank" rel="noopener noreferrer">${text}</a>`;
	});
	out = out.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
	out = out.replace(/`([^`]+)`/g, '<code>$1</code>');
	return out;
}

export function renderReleaseNotes(markdown: string): string {
	if (!markdown || !markdown.trim()) return '';

	const lines = escapeHtml(markdown).split('\n');
	const blocks: string[] = [];
	let listItems: string[] = [];

	const flushList = () => {
		if (listItems.length) {
			blocks.push(`<ul>${listItems.join('')}</ul>`);
			listItems = [];
		}
	};

	for (const raw of lines) {
		const line = raw.trim();
		if (!line) {
			flushList();
			continue;
		}

		const heading = line.match(/^(#{1,4})\s+(.*)$/);
		if (heading) {
			flushList();
			const level = heading[1].length;
			blocks.push(`<h${level}>${renderInline(heading[2])}</h${level}>`);
			continue;
		}

		const bullet = line.match(/^[*-]\s+(.*)$/);
		if (bullet) {
			listItems.push(`<li>${renderInline(bullet[1])}</li>`);
			continue;
		}

		flushList();
		blocks.push(`<p>${renderInline(line)}</p>`);
	}

	flushList();
	return blocks.join('');
}
