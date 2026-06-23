import { migrateDb } from '$lib/server/db';
import { markInterruptedJobs } from '$lib/server/jobs/runner';

// Run database migrations once at server startup, before any request is handled.
await migrateDb();

// Any job left "pending"/"running" by a previous crash is marked interrupted.
await markInterruptedJobs();
