import type { PageServerLoad } from './$types';
import { getStats, listJobs } from '$lib/server/queries';

export const load: PageServerLoad = async () => ({
	stats: await getStats(),
	jobs: await listJobs(8)
});
