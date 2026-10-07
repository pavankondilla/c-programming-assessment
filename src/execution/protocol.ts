import type { RunResult } from '../lib/model';
export type RunRequest = { source: string; stdin: string; compilerUrl: string };
export type WorkerMessage = { type: 'phase'; phase: 'compiling' | 'running' } | { type: 'result'; result: RunResult };
export const EXECUTION_TIMEOUT_MS = 5000;
export const COMPILE_TIMEOUT_MS = 90000;
