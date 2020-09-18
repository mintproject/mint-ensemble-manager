export const REDIS_URL = process.env.REDIS_URL || 'redis://127.0.0.1:26379';
export const EXECUTION_QUEUE_NAME = "EnsembleManagerLocalExecution";
export const MONITOR_QUEUE_NAME = "EnsembleManagerLocalMonitor";
export const REPEATED_THREAD_QUEUE = "RepeatedThreadQueue";
export const CONCURRENCY = 10;
