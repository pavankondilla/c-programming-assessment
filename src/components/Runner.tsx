import { useEffect, useRef, useState } from 'react';
import { CircleAlert, LoaderCircle, Play, Square, Terminal } from 'lucide-react';
import type { Answer, RunResult } from '../lib/model';
import { runCode } from '../execution/runCode';

const labels = { success: 'Run completed', 'compile-error': 'Compilation failed', 'runtime-error': 'Runtime error', timeout: 'Timed out', unavailable: 'Compiler unavailable', cancelled: 'Stopped' };
export default function Runner({ answer, changeInput, saveRun }: { answer: Answer; changeInput: (input: string) => void; saveRun: (result: RunResult) => void }) {
  const [phase, setPhase] = useState('');
  const job = useRef<ReturnType<typeof runCode> | null>(null);
  const alive = useRef(true);
  const save = useRef(saveRun); save.current = saveRun;
  useEffect(() => { alive.current = true; return () => { alive.current = false; job.current?.cancel(); }; }, []);
  async function run() {
    if (job.current || !answer.value.trim()) return;
    setPhase('compiling');
    const current = runCode(answer.value, answer.stdin, setPhase); job.current = current;
    const result = await current.promise;
    if (alive.current) { save.current(result); setPhase(''); }
    job.current = null;
  }
  const result = answer.lastRun;
  const stale = result && (result.source !== answer.value || result.stdin !== answer.stdin);
  return <section className="runner card" aria-label="Code testing"><div className="runner-heading"><div><Terminal size={19} /><h3>Test your solution</h3><span className="pill neutral">C17 · WebAssembly</span></div><div>{phase && <button className="button secondary compact" onClick={() => job.current?.cancel()}><Square size={14} /> Stop</button>}<button className="button primary compact" onClick={run} disabled={!!phase || !answer.value.trim()}>{phase ? <LoaderCircle className="spin" size={16} /> : <Play size={16} />}{phase === 'compiling' ? 'Compiling…' : phase === 'running' ? 'Running…' : 'Run Code'}</button></div></div>
    <div className="execution-grid"><div className="stdin-panel"><label htmlFor="stdin">Standard input <span>Optional</span></label><textarea id="stdin" value={answer.stdin} maxLength={20000} onChange={e => changeInput(e.target.value)} placeholder={'Enter program input here.\nOne value or menu choice per line.'} spellCheck={false} /><p>Supply every value before running. For menus, add each choice and its values on separate lines, ending with Exit. Input ends at the last supplied character.</p></div><div className="stdout-panel"><div className="output-label"><span>Standard output</span><span className="terminal-dot" /></div><pre aria-label="Standard output" className={!result?.stdout ? 'empty-output' : ''}>{result?.stdout || (phase ? 'Waiting for program output…' : result ? 'This run produced no standard output.' : 'Your program’s output will appear here.')}</pre></div></div>
    <div className="diagnostics"><strong>Compilation errors & warnings</strong><pre aria-label="Compilation errors">{result?.diagnostics || (result ? result.status === 'unavailable' || result.status === 'timeout' || result.status === 'cancelled' ? 'No compiler diagnostics were returned.' : 'No compiler diagnostics.' : 'No compilation has been run.')}</pre></div>
    {result?.error && <div className={`run-message ${result.status === 'success' ? '' : 'error'}`} role="status"><CircleAlert size={18} /><div><strong>{result.status === 'success' ? 'Standard error' : labels[result.status]}</strong><pre>{result.error}</pre></div></div>}
    <div className="run-status" aria-live="polite"><span className={`status-dot ${result?.status === 'success' ? 'green' : ''}`} /><span>{phase ? phase === 'compiling' ? 'Loading compiler and compiling in a worker…' : 'Executing in an isolated worker…' : `Last run: ${result ? labels[result.status] : 'Not run'}`}{stale && !phase ? ' · Code or input has changed since this run.' : ''}</span></div>
    <details className="execution-help"><summary>About running C in your browser</summary><p>Code runs locally. The first run loads about 94.5 MB of compiler assets. Compilation has a 90-second limit; execution has a 5-second limit and 64 MB of program memory. Output is limited to 64 KB.</p><p><code>student.txt</code> exists only inside an isolated virtual filesystem. It persists throughout one execution, including closing and reopening the file. Each run starts with an empty filesystem. No files are written to your computer. Run Code is for testing; coding marks are awarded by the examiner.</p></details>
  </section>;
}
