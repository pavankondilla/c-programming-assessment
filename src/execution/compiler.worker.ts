import { WASI, File, OpenFile, ConsoleStdout, PreopenDirectory } from '@bjorn3/browser_wasi_shim';
import type { RunRequest, WorkerMessage } from './protocol';
import type { RunResult } from '../lib/model';

const send = (message: WorkerMessage) => self.postMessage(message);
self.onmessage = async (event: MessageEvent<RunRequest>) => {
  const { source, stdin, compilerUrl } = event.data;
  let stdout = '', stderr = '', diagnostics = '';
  let phase: 'compiling' | 'running' = 'compiling';
  const finish = (status: RunResult['status'], error = '', exitCode?: number) => send({ type: 'result', result: { status, stdout, diagnostics, error, exitCode, at: Date.now(), source, stdin } });
  try {
    send({ type: 'phase', phase });
    // The self-hosted toolchain stays outside the UI bundle. No source is sent to a service.
    const compiler = await import(/* @vite-ignore */ compilerUrl);
    const result = await compiler.compile({ source, fileName: 'main.c', flags: ['--driver-mode=gcc', '-std=c17', '-O0', '-Wall', '-Wextra', '-Wl,--max-memory=67108864'] });
    diagnostics = String(result.compileOutput).slice(0, 65536);
    if (!result.module) { finish('compile-error'); return; }
    phase = 'running'; send({ type: 'phase', phase });
    const outputDecoder = new TextDecoder(), errorDecoder = new TextDecoder();
    const capture = (isError: boolean) => (bytes: Uint8Array) => {
      if (stdout.length + stderr.length + bytes.length > 65536) throw new Error('Output limit exceeded (64 KB). Check for an endless printing loop.');
      if (isError) stderr += errorDecoder.decode(bytes, { stream: true });
      else stdout += outputDecoder.decode(bytes, { stream: true });
    };
    const wasi = new WASI(['main'], [], [
      new OpenFile(new File(new TextEncoder().encode(stdin))),
      new ConsoleStdout(capture(false)), new ConsoleStdout(capture(true)),
      new PreopenDirectory('.', new Map()),
    ]);
    const instance = await WebAssembly.instantiate(result.module as WebAssembly.Module, { wasi_snapshot_preview1: wasi.wasiImport });
    const exitCode = wasi.start(instance as Parameters<WASI['start']>[0]);
    stdout += outputDecoder.decode(); stderr += errorDecoder.decode();
    finish(exitCode === 0 ? 'success' : 'runtime-error', exitCode === 0 ? stderr : `Program exited with code ${exitCode}.\n${stderr}`, exitCode);
  } catch (error) {
    finish(phase === 'compiling' ? 'unavailable' : 'runtime-error', `${phase === 'compiling' ? 'Compiler could not complete. Check that compiler assets are hosted and your browser supports WebAssembly. ' : ''}${error instanceof Error ? error.message : String(error)}${stderr ? `\n${stderr}` : ''}`);
  }
};
