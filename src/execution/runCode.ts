import { COMPILE_TIMEOUT_MS, EXECUTION_TIMEOUT_MS, type WorkerMessage } from './protocol';
import type { RunResult } from '../lib/model';

export function runCode(source: string, stdin: string, onPhase: (phase: string) => void) {
  let worker: Worker | undefined, timeout: ReturnType<typeof setTimeout>;
  let done = false;
  let resolveResult: (result: RunResult) => void;
  const promise = new Promise<RunResult>(resolve => { resolveResult = resolve; });
  const finish = (result: RunResult) => {
    if (done) return; done = true; clearTimeout(timeout); worker?.terminate(); resolveResult(result);
  };
  const fail = (status: RunResult['status'], error: string) => finish({ status, error, stdout: '', diagnostics: '', at: Date.now(), source, stdin });
  try {
    if (!globalThis.Worker || !globalThis.WebAssembly) throw new Error('This browser does not support Web Workers and WebAssembly. Use a current desktop browser to test C code.');
    worker = new Worker(new URL('./compiler.worker.ts', import.meta.url), { type: 'module' });
    timeout = setTimeout(() => fail('timeout', 'Compiler loading or compilation exceeded 90 seconds. The worker was stopped. Check your connection or try a smaller program.'), COMPILE_TIMEOUT_MS);
    worker.onmessage = (event: MessageEvent<WorkerMessage>) => {
      if (event.data.type === 'result') finish(event.data.result);
      else {
        onPhase(event.data.phase);
        if (event.data.phase === 'running') {
          clearTimeout(timeout);
          timeout = setTimeout(() => fail('timeout', 'Execution timed out after 5 seconds. The worker was terminated. Check your loops and supply all required input before running.'), EXECUTION_TIMEOUT_MS);
        }
      }
    };
    worker.onerror = event => { event.preventDefault(); fail('unavailable', event.message || 'The compiler worker could not start. Check browser support and hosted compiler files.'); };
    const compilerUrl = new URL(`${import.meta.env.BASE_URL}compiler/index.js`, document.baseURI).href;
    worker.postMessage({ source, stdin, compilerUrl });
  } catch (error) { fail('unavailable', error instanceof Error ? error.message : String(error)); }
  return { promise, cancel: () => fail('cancelled', 'Run stopped. No marks were awarded.') };
}
