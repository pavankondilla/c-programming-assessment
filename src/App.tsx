import { lazy, Suspense, useState } from 'react';
import { CircleAlert } from 'lucide-react';
import Login from './components/Login';
import Welcome from './components/Welcome';
import Exam from './components/Exam';
import Submission from './components/Submission';
import { useExamStore } from './lib/useExamStore';
const Examiner = lazy(() => import('./components/Examiner'));
type Role = 'student' | 'examiner' | null;
function loadRole(): Role { try { const r = sessionStorage.getItem('c-assessment.role'); return r === 'student' || r === 'examiner' ? r : null; } catch { return null; } }

export default function App() {
  const [role, setRole] = useState<Role>(loadRole), [entered, setEntered] = useState(() => loadRole() === 'student');
  const engine = useExamStore(role === 'student' && entered);
  function login(next: Role) { engine.flush(); setRole(next); setEntered(next === 'student' && engine.active !== null); try { if (next) sessionStorage.setItem('c-assessment.role', next); else sessionStorage.removeItem('c-assessment.role'); } catch { /* Refresh may require demo login again; answers still use localStorage. */ } }
  const logout = () => login(null);
  // An existing active attempt resumes after refresh; its deadline is never reset.
  const active = engine.active;
  // Entering the student screen is independent of starting the stored timer.
  return <><a className="skip-link" href="#app-content">Skip to content</a>{engine.storageError && <div className="storage-error no-print" role="alert"><CircleAlert size={20} /><div><strong>Device storage needs attention</strong><p>{engine.storageError}</p><div>{engine.blocked ? <><button onClick={engine.rawBackup}>Download raw backup</button><button onClick={engine.resetCorrupt}>Clear unreadable data</button></> : <button onClick={engine.retrySave}>Retry saving</button>}</div></div></div>}<div id="app-content">
    {role === null ? <Login onLogin={login} /> : role === 'examiner' ? <Suspense fallback={<p className="loading-screen" role="status">Opening examiner workspace…</p>}><Examiner attempts={engine.store.attempts} update={engine.update} importAttempt={engine.importAttempt} logout={logout} saved={!engine.storageError} blocked={engine.blocked} /></Suspense> : active?.submittedAt ? <Submission attempt={active} logout={logout} saved={!engine.storageError} /> : active && entered ? <Exam attempt={active} now={engine.now} saved={!engine.storageError} edit={engine.edit} select={engine.select} submit={engine.submit} logout={logout} /> : <Welcome attempt={active} start={() => { engine.start(); setEntered(true); }} enter={() => setEntered(true)} logout={logout} blocked={engine.blocked} />}
  </div></>;
}
