import type { PageServerLoad } from './$types';
import { listJobs } from '$lib/server/queries';

export const load: PageServerLoad = async () => ({ jobs: await listJobs(100) });
