import type { RequestHandler } from './$types';
import { onProgress, type JobProgress } from '$lib/server/jobs/events';
import { getJob } from '$lib/server/queries';

const TERMINAL = new Set(['completed', 'failed', 'cancelled', 'interrupted']);

/** Server-Sent Events stream of a single job's progress (snapshot, then live). */
export const GET: RequestHandler = async ({ params }) => {
	const jobId = Number(params.id);
	const encoder = new TextEncoder();
	let unsubscribe: (() => void) | null = null;

	const stream = new ReadableStream({
		async start(controller) {
			const send = (data: JobProgress) =>
				controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));

			// Snapshot on subscribe.
			const job = await getJob(jobId);
			if (job) {
				send({
					jobId,
					processed: job.processed,
					total: job.total,
					currentItem: job.currentItem,
					status: job.status
				});
				if (TERMINAL.has(job.status)) {
					controller.close();
					return;
				}
			}

			unsubscribe = onProgress(jobId, (p) => {
				send(p);
				if (TERMINAL.has(p.status)) {
					unsubscribe?.();
					unsubscribe = null;
					try {
						controller.close();
					} catch {
						// already closed
					}
				}
			});
		},
		cancel() {
			unsubscribe?.();
			unsubscribe = null;
		}
	});

	return new Response(stream, {
		headers: {
			'Content-Type': 'text/event-stream',
			'Cache-Control': 'no-cache',
			Connection: 'keep-alive'
		}
	});
};
