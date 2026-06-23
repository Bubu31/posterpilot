import { EventEmitter } from 'node:events';

export interface JobProgress {
	jobId: number;
	processed: number;
	total: number;
	currentItem: string | null;
	status: string;
}

const emitter = new EventEmitter();
emitter.setMaxListeners(0);

/** Broadcast a job's progress to per-job and global subscribers. */
export function emitProgress(progress: JobProgress): void {
	emitter.emit(`job:${progress.jobId}`, progress);
	emitter.emit('job:any', progress);
}

/** Subscribe to a single job's progress. Returns an unsubscribe function. */
export function onProgress(jobId: number, fn: (p: JobProgress) => void): () => void {
	const channel = `job:${jobId}`;
	emitter.on(channel, fn);
	return () => emitter.off(channel, fn);
}

/** Subscribe to progress from any job. Returns an unsubscribe function. */
export function onAnyProgress(fn: (p: JobProgress) => void): () => void {
	emitter.on('job:any', fn);
	return () => emitter.off('job:any', fn);
}
