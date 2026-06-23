import { migrateDb } from '$lib/server/db';

// Run database migrations once at server startup, before any request is handled.
await migrateDb();
