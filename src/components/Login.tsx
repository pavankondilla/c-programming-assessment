import { useState, type FormEvent } from 'react';
import { ArrowRight, BookOpen, Check, Eye, EyeOff, KeyRound, UserRound } from 'lucide-react';
import { Brand, Footer } from './UI';

export default function Login({ onLogin }: { onLogin: (role: 'student' | 'examiner') => void }) {
  const [name, setName] = useState(''), [password, setPassword] = useState(''), [show, setShow] = useState(false), [error, setError] = useState('');
  function login(event: FormEvent) {
    event.preventDefault();
    if (!name.trim() || !password) { setError('Enter both your name and password to continue.'); return; }
    if (name.trim() === 'trainee' && password === 'CExam@123') onLogin('student');
    else if (name.trim() === 'charan' && password === 'Review@123') onLogin('examiner');
    else setError('Name or password is incorrect. Check the demo credentials below and try again.');
  }
  return <div className="login-page"><header className="public-header"><Brand /><span className="small-label">LEARN. THINK. BUILD.</span></header><main className="login-layout">
    <section className="login-story"><div className="eyebrow"><span className="blue-dash" /> THE C PROGRAMMING EXAMINATION</div><h1>Great programs<br />start with<br /><span>clear thinking.</span></h1><p>A focused space to put your C programming knowledge into practice. Take your time, work through the problems, and make every line count.</p>
      <div className="login-facts"><div><strong>100</strong><span>Total marks</span></div><div><strong>42</strong><span>Questions</span></div><div><strong>3 hrs</strong><span>Duration</span></div></div>
      <div className="story-note"><BookOpen size={20} /><span>From core concepts to complete C programs.</span></div>
    </section>
    <section className="login-card card"><div className="login-icon"><KeyRound size={24} /></div><span className="pill blue">Demo authentication</span><h2>Welcome to your workspace</h2><p className="muted">Sign in to begin your assessment or review submissions.</p>
      <form onSubmit={login} noValidate><label htmlFor="name">Name</label><div className="input-icon"><UserRound size={18} /><input id="name" autoComplete="username" placeholder="Enter your name" value={name} onChange={e => { setName(e.target.value); setError(''); }} aria-invalid={!!error} aria-describedby={error ? 'login-error' : undefined} /></div>
        <label htmlFor="password">Password</label><div className="password-input"><input id="password" autoComplete="current-password" type={show ? 'text' : 'password'} placeholder="Enter your password" value={password} onChange={e => { setPassword(e.target.value); setError(''); }} aria-invalid={!!error} aria-describedby={error ? 'login-error' : undefined} /><button type="button" className="icon-button" aria-label={show ? 'Hide password' : 'Show password'} aria-pressed={show} onClick={() => setShow(!show)}>{show ? <EyeOff size={19} /> : <Eye size={19} />}</button></div>
        {error && <p id="login-error" className="form-error" role="alert">{error}</p>}<button className="button primary login-button" type="submit">Login <ArrowRight size={18} /></button>
      </form>
      <div className="demo-credentials"><span className="small-label">TRY THE DEMO</span><div><span>Student</span><code>trainee <span>/</span> CExam@123</code></div><div><span>Examiner</span><code>charan <span>/</span> Review@123</code></div></div>
      <p className="login-disclaimer"><Check size={15} /> Answers stay in this browser. Demo sign-in is not secure authentication.</p>
    </section>
  </main><Footer /></div>;
}
