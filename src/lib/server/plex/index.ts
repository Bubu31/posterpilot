/** Public surface of the Plex integration module. */

export {
	testConnection,
	listSections,
	listItems,
	uploadPosterFromUrl,
	uploadPosterBytes,
	setPosterLock,
	uploadBackgroundFromUrl,
	uploadBackgroundBytes,
	setBackgroundLock,
	type PlexConnectionResult
} from './client';
export { parseGuids, buildPosterUrl, type PlexRawGuid } from './parse';
