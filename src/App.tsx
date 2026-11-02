import { useEffect, useState } from 'react';
import { CircleAlert } from 'lucide-react';
import Login from './components/Login';
import Welcome from './components/Welcome';
import Exam from './components/Exam';
import Submission from './components/SubmissionPage';
import { useStaticExamStore } from './lib/useStaticExamStore';
import type { Session } from './lib/auth';
const SESSION_KEY = 'c-assessment.session.v1';

export default function App() {
  const [session, setSession] = useState<Session | null>(null), [entered, setEntered] = useState(false), [checkingSession, setCheckingSession] = useState(true);
  const role = session?.role ?? null;
  const engine = useStaticExamStore(role === 'student' && entered, role, session?.name ?? '');
  useEffect(() => {
    try {
      const saved = localStorage.getItem(SESSION_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed?.role === 'student' && typeof parsed.name === 'string') setSession(parsed);
      }
    } catch { localStorage.removeItem(SESSION_KEY); }
    setCheckingSession(false);
  }, []);
  function login(next: Session) { setSession(next); setEntered(false); localStorage.setItem(SESSION_KEY, JSON.stringify(next)); }
  const logout = () => { localStorage.removeItem(SESSION_KEY); setSession(null); setEntered(false); };
  // An existing active attempt resumes after refresh; its deadline is never reset.
  const active = engine.active;
  // Entering the student screen is independent of starting the stored timer.
  return <><a className="skip-link" href="#app-content">Skip to content</a>{engine.storageError && role && <div className="storage-error no-print" role="alert"><CircleAlert size={20} /><div><strong>Browser storage needs attention</strong><p>{engine.storageError}</p><button onClick={engine.retrySave}>Retry saving</button></div></div>}<div id="app-content">
    {checkingSession || (role && !engine.loaded) ? <p className="loading-screen" role="status">Opening examination…</p> : role === null ? <Login onLogin={login} /> : active?.submittedAt ? <Submission attempt={active} logout={logout} saved={!engine.storageError} update={engine.update} /> : active && entered ? <Exam attempt={active} now={engine.now} saved={!engine.storageError} edit={engine.edit} select={engine.select} submit={engine.submit} logout={logout} /> : <Welcome attempt={active} start={() => { engine.start(); setEntered(true); }} enter={() => setEntered(true)} logout={logout} blocked={engine.blocked} />}
  </div></>;
}
