import { useEffect, useState, type FormEvent } from 'react';
import { CheckCircle2, Download, LockKeyhole, Mail, Printer } from 'lucide-react';
import { questions } from '../data/exam';
import { counts, dateTime, downloadSubmission, totals, type Attempt } from '../lib/model';
import { Brand, Footer, Saved } from './UI';
import { SubmissionAnswers } from './Submission';

export default function SubmissionPage({ attempt, logout, saved, update }: { attempt: Attempt; logout: () => void; saved: boolean; update: (id: string, fn: (a: Attempt) => Attempt) => void }) {
  const stats = counts(attempt);
  const marks = totals(attempt);
  const [email, setEmail] = useState(attempt.email || '');
  const [emailStatus, setEmailStatus] = useState(attempt.emailStatus || '');
  const [error, setError] = useState('');
  useEffect(() => { if (attempt.email) setEmail(attempt.email); setEmailStatus(attempt.emailStatus || ''); }, [attempt.email, attempt.emailStatus]);

  function saveEmail(event: FormEvent) {
    event.preventDefault(); setError('');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) { setError('Enter a valid email address.'); return; }
    update(attempt.id, current => ({ ...current, email, emailStatus: 'provided' }));
    setEmailStatus('provided');
  }

  const reviewed = attempt.review.reviewedAt !== null;
  return <>
    <header className="public-header no-print"><Brand /><button className="button text-button" onClick={logout}>Sign out</button></header>
    <main className="submission-page">
      <section className="card submission-summary">
        <div className="success-icon"><CheckCircle2 size={33} /></div>
        <div className="eyebrow">EXAMINATION COMPLETE</div>
        <h1>{attempt.submissionReason === 'expired' ? 'Time is up. Your work is submitted.' : 'Your work is submitted.'}</h1>
        <p>{reviewed ? 'Your final result is ready.' : 'Your fill-in-the-blank score is shown here. Download your submission and share it with the organizer for manual coding review.'}</p>
        <div className="submission-tags"><span className="pill success">Submitted</span><Saved error={!saved} /></div>
        <dl className="submission-details">
          <div><dt>Student</dt><dd>{attempt.studentName}</dd></div>
          <div><dt>Attempt ID</dt><dd className="attempt-id">{attempt.id}</dd></div>
          <div><dt>Started</dt><dd>{dateTime(attempt.startedAt)}</dd></div>
          <div><dt>Submitted</dt><dd>{dateTime(attempt.submittedAt!)}</dd></div>
        </dl>
        <div className="submission-counts">
          <div><strong>{stats.answered}<small> / {questions.length}</small></strong><span>Answered</span></div>
          <div><strong>{marks.blanks}<small> / 30</small></strong><span>Fill in the blanks</span></div>
          <div><strong>{reviewed ? marks.total : '—'}<small> / 100</small></strong><span>{reviewed ? 'Final score' : 'Coding review pending'}</span></div>
        </div>
        {reviewed && <div className="pending-note">Coding: {marks.coding}/70 · Fill in the blanks: {marks.blanks}/30</div>}
        {attempt.review.feedback && <div className="feedback-display"><h3>Examiner feedback</h3><p>{attempt.review.feedback}</p></div>}
      </section>
      <section className="card certificate-card">
        <div className="section-heading"><span className="icon-tile"><Mail size={21} /></span><h2>Share your email address</h2></div>
        <p>Your email address is saved with this submission on this browser. Download your submission to share it with the exam organizer.</p>
        <form onSubmit={saveEmail} className="certificate-form">
          <label htmlFor="certificate-email">Your email address</label>
          <div className="certificate-form-row"><input id="certificate-email" type="email" autoComplete="email" required maxLength={254} value={email} onChange={event => setEmail(event.target.value)} placeholder="you@example.com" /><button className="button primary" type="submit">Save email</button></div>
        </form>
        {error && <p className="form-error" role="alert">{error}</p>}
        {emailStatus === 'provided' && <p className="certificate-status" role="status">Email saved in this browser: {email}.</p>}
      </section>
      <div className="submission-buttons no-print"><button className="button secondary" onClick={() => downloadSubmission(attempt)}><Download size={17} /> Download submission</button><button className="button secondary" onClick={() => window.print()}><Printer size={17} /> Print result</button></div>
      <div className="answers-title"><div><h2>Your submitted answers</h2><p>Saved with your examination record.</p></div><span><LockKeyhole size={16} /> Editing locked</span></div>
      <SubmissionAnswers attempt={attempt} />
    </main><Footer />
  </>;
}
