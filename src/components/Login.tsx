import { useState, type FormEvent } from 'react';
import { ArrowRight, BookOpen, Eye, EyeOff, KeyRound, UserRound } from 'lucide-react';
import { Brand, Footer } from './UI';
import { authenticate, type Session } from '../lib/auth';
import { questions } from '../data/exam';

export default function Login({ onLogin }: { onLogin: (session: Session) => void }) {
  const [name, setName] = useState(''), [password, setPassword] = useState(''), [show, setShow] = useState(false), [error, setError] = useState(''), [busy, setBusy] = useState(false);
  async function login(event: FormEvent) {
    event.preventDefault();
    if (!name.trim() || !password) { setError('Enter both your name and password to continue.'); return; }
    setBusy(true); setError('');
    try {
      const session = authenticate(name, password);
      if (!session) throw new Error('Name or password is incorrect.');
      onLogin(session);
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Sign-in failed.'); }
    finally { setBusy(false); setPassword(''); }
  }
  return <div className="login-page"><header className="public-header"><Brand /><span className="small-label">LEARN. THINK. BUILD.</span></header><main className="login-layout">
    <section className="login-story"><div className="eyebrow"><span className="blue-dash" /> THE C PROGRAMMING EXAMINATION</div><h1>Great programs<br />start with<br /><span>clear thinking.</span></h1><p>A focused space to put your C programming knowledge into practice. Take your time, work through the problems, and make every line count.</p>
      <div className="login-facts"><div><strong>100</strong><span>Total marks</span></div><div><strong>{questions.length}</strong><span>Questions</span></div><div><strong>3 hrs</strong><span>Duration</span></div></div>
      <div className="story-note"><BookOpen size={20} /><span>From core concepts to complete C programs.</span></div>
    </section>
    <section className="login-card card"><div className="login-icon"><KeyRound size={24} /></div><h2>Welcome to your workspace</h2><p className="muted">Sign in to begin your assessment or review submissions.</p>
      <form onSubmit={login} noValidate><label htmlFor="name">Name</label><div className="input-icon"><UserRound size={18} /><input id="name" autoComplete="username" placeholder="Enter your name" value={name} onChange={e => { setName(e.target.value); setError(''); }} aria-invalid={!!error} aria-describedby={error ? 'login-error' : undefined} /></div>
        <label htmlFor="password">Password</label><div className="password-input"><input id="password" autoComplete="current-password" type={show ? 'text' : 'password'} placeholder="Enter your password" value={password} onChange={e => { setPassword(e.target.value); setError(''); }} aria-invalid={!!error} aria-describedby={error ? 'login-error' : undefined} /><button type="button" className="icon-button" aria-label={show ? 'Hide password' : 'Show password'} aria-pressed={show} onClick={() => setShow(!show)}>{show ? <EyeOff size={19} /> : <Eye size={19} />}</button></div>
        {error && <p id="login-error" className="form-error" role="alert">{error}</p>}<button className="button primary login-button" type="submit" disabled={busy}>{busy ? 'Signing in…' : 'Login'} <ArrowRight size={18} /></button>
      </form>
    </section>
  </main><Footer /></div>;
}
