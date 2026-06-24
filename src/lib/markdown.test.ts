import { describe, it, expect } from 'vitest';
import { renderReleaseNotes } from './markdown';

describe('renderReleaseNotes', () => {
	it('renders ## and ### as headings', () => {
		const html = renderReleaseNotes('## Title\n\n### Bug Fixes');
		expect(html).toContain('<h2>Title</h2>');
		expect(html).toContain('<h3>Bug Fixes</h3>');
	});

	it('renders **bold** as <strong>', () => {
		expect(renderReleaseNotes('a **b** c')).toContain('a <strong>b</strong> c');
	});

	it('renders [text](url) as a safe external link', () => {
		const html = renderReleaseNotes('[5415fc5](https://github.com/x/y/commit/5415fc5)');
		expect(html).toContain(
			'<a href="https://github.com/x/y/commit/5415fc5" target="_blank" rel="noopener noreferrer">5415fc5</a>'
		);
	});

	it('groups "* item" lines into a single <ul> with <li>s', () => {
		const html = renderReleaseNotes('* one\n* two');
		expect(html).toContain('<ul><li>one</li><li>two</li></ul>');
	});

	it('renders inline `code` as <code>', () => {
		expect(renderReleaseNotes('use `bun run check`')).toContain('use <code>bun run check</code>');
	});

	it('escapes HTML so the release body cannot inject markup', () => {
		const html = renderReleaseNotes('<img src=x onerror=alert(1)>');
		expect(html).not.toContain('<img');
		expect(html).toContain('&lt;img');
	});

	it('drops javascript: links but keeps the visible text', () => {
		const html = renderReleaseNotes('[click](javascript:alert(1))');
		expect(html).not.toContain('href="javascript:');
		expect(html).toContain('click');
	});

	it('returns an empty string for empty input', () => {
		expect(renderReleaseNotes('')).toBe('');
		expect(renderReleaseNotes('   \n  ')).toBe('');
	});

	it('renders a plain line as a paragraph', () => {
		expect(renderReleaseNotes('just text')).toBe('<p>just text</p>');
	});

	it('renders the bold label + commit-link pattern release-please emits', () => {
		const html = renderReleaseNotes(
			'* **a11y:** keep focus visible ([5415fc5](https://github.com/x/y/commit/5415fc5))'
		);
		expect(html).toContain('<li><strong>a11y:</strong> keep focus visible (');
		expect(html).toContain('>5415fc5</a>)</li>');
	});
});
