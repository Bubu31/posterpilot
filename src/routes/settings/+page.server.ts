import type { PageServerLoad } from './$types';
import { publicConfig } from '$lib/server/config';

export const load: PageServerLoad = async () => ({ config: await publicConfig() });
