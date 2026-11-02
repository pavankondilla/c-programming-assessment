import { useCallback, useEffect, useRef, useState } from 'react';
import { DURATION_MS } from '../data/exam';
import { markBlank } from '../data/answerKey';
import { emptyStore, newAttempt, STORAGE_KEY, submitAttempt, type Attempt, type Store } from './model';
import { validateStore } from './validation';

export function useStaticExamStore(studentViewing: boolean, role: 'student' | null, username: string) {
  const [store, setStore] = useState<Store>(emptyStore);
  const storeRef = useRef(store);
  const [storageError, setStorageError] = useState('');
  const [blocked, setBlocked] = useState(true);
  const [loaded, setLoaded] = useState(false);
  const [now, setNow] = useState(Date.now());
  const flushView = useRef<() => void>(() => {});
  const activeStorageKey = `${STORAGE_KEY}.${encodeURIComponent(username.toLowerCase())}`;
  const submitLocally = useCallback((attempt: Attempt, reason: 'manual' | 'expired', at = Date.now()) => {
    const submitted = submitAttempt(attempt, reason, at);
    const scores = { ...submitted.review.scores };
    for (const id of Object.keys(scores).filter(key => key.startsWith('b'))) scores[id] = markBlank(id, submitted.answers[id]?.value ?? '');
    return { ...submitted, review: { ...submitted.review, scores } };
  }, []);

  const persist = useCallback((next: Store) => {
    storeRef.current = next;
    setStore(next);
    try {
      localStorage.setItem(activeStorageKey, JSON.stringify(next));
      setStorageError('');
    } catch {
      setStorageError('This browser could not save your progress. Free storage space or use another browser.');
    }
  }, [activeStorageKey]);

  const update = useCallback((id: string, fn: (attempt: Attempt) => Attempt) => {
    const current = storeRef.current;
    persist({ ...current, attempts: current.attempts.map(attempt => attempt.id === id ? fn(attempt) : attempt) });
  }, [persist]);
  const active = store.attempts.find(attempt => attempt.id === store.activeId) ?? null;

  useEffect(() => {
    if (!role || !username) {
      const empty = emptyStore();
      storeRef.current = empty;
      setStore(empty);
      setLoaded(false);
      setBlocked(true);
      return;
    }
    setLoaded(false);
    setBlocked(true);
    try {
      const saved = localStorage.getItem(activeStorageKey);
      const next = saved ? validateStore(JSON.parse(saved)) : emptyStore();
      storeRef.current = next;
      setStore(next);
      setStorageError('');
      setBlocked(false);
    } catch (error) {
      setStorageError(error instanceof Error ? error.message : 'Could not read this browser’s saved examination.');
    } finally {
      setLoaded(true);
    }
  }, [activeStorageKey, role, username]);

  useEffect(() => {
    const check = () => {
      const time = Date.now();
      setNow(time);
      if (storeRef.current.attempts.some(attempt => attempt.submittedAt === null && time >= attempt.deadline)) {
        flushView.current();
        persist({ ...storeRef.current, attempts: storeRef.current.attempts.map(attempt => attempt.submittedAt === null && time >= attempt.deadline ? submitLocally(attempt, 'expired', time) : attempt) });
      }
    };
    check();
    const timer = window.setInterval(check, 1000);
    document.addEventListener('visibilitychange', check);
    window.addEventListener('pageshow', check);
    return () => { clearInterval(timer); document.removeEventListener('visibilitychange', check); window.removeEventListener('pageshow', check); };
  }, [persist, submitLocally]);

  useEffect(() => {
    if (!active || active.submittedAt !== null || !studentViewing) { flushView.current = () => {}; return; }
    const id = active.id, key = active.selected;
    let last = performance.now(), wallLast = Date.now(), visible = !document.hidden;
    const flush = () => {
      const tick = performance.now(), wall = Date.now();
      const elapsed = visible ? Math.max(0, Math.min(tick - last, active.deadline - wallLast)) : 0;
      last = tick; wallLast = wall; visible = !document.hidden;
      if (elapsed > 0) update(id, attempt => {
        if (attempt.submittedAt !== null) return attempt;
        const total = Object.values(attempt.answers).reduce((sum, answer) => sum + answer.timeMs, 0);
        const delta = Math.min(Math.round(elapsed), Math.max(0, DURATION_MS - total));
        return { ...attempt, answers: { ...attempt.answers, [key]: { ...attempt.answers[key], timeMs: attempt.answers[key].timeMs + delta } } };
      });
    };
    flushView.current = flush;
    const timer = window.setInterval(flush, 1000);
    document.addEventListener('visibilitychange', flush);
    window.addEventListener('pagehide', flush);
    return () => { flush(); clearInterval(timer); document.removeEventListener('visibilitychange', flush); window.removeEventListener('pagehide', flush); flushView.current = () => {}; };
  }, [active?.id, active?.selected, active?.submittedAt, studentViewing, update]);

  useEffect(() => {
    if (!active || active.submittedAt !== null) return;
    const warn = (event: BeforeUnloadEvent) => { flushView.current(); event.preventDefault(); event.returnValue = ''; };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [active?.id, active?.submittedAt]);

  const edit = (fn: (attempt: Attempt) => Attempt) => {
    if (!active || blocked) return;
    update(active.id, attempt => attempt.submittedAt !== null ? attempt : Date.now() >= attempt.deadline ? submitLocally(attempt, 'expired') : fn(attempt));
  };
  return {
    store, active, now, storageError, blocked, loaded, update,
    start: () => {
      if (blocked || storeRef.current.activeId) return;
      const attempt = newAttempt(Date.now(), username);
      persist({ ...storeRef.current, activeId: attempt.id, attempts: [...storeRef.current.attempts, attempt] });
    },
    edit,
    select: (key: string) => { flushView.current(); edit(attempt => ({ ...attempt, selected: key })); },
    submit: () => { flushView.current(); if (active) update(active.id, attempt => submitLocally(attempt, Date.now() >= attempt.deadline ? 'expired' : 'manual')); },
    flush: () => flushView.current(),
    flushRemote: async () => { flushView.current(); return !storageError; },
    importAttempt: (attempt: Attempt) => {
      if (storeRef.current.attempts.some(saved => saved.id === attempt.id)) throw new Error('This attempt ID is already stored here. Open the existing submission; it was not overwritten.');
      persist({ ...storeRef.current, attempts: [...storeRef.current.attempts, attempt] });
    },
    retrySave: () => persist(storeRef.current),
    resetCorrupt: () => {
      if (window.confirm('Clear the unreadable saved data on this browser? Download a raw backup first if it may contain answers.')) {
        setBlocked(false);
        persist(emptyStore());
      }
    },
    rawBackup: () => {
      try { const data = localStorage.getItem(activeStorageKey) ?? ''; const url = URL.createObjectURL(new Blob([data], { type: 'application/json' })); const a = document.createElement('a'); a.href = url; a.download = 'c-assessment-storage-backup.json'; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); }
      catch { setStorageError('Browser storage is inaccessible. A backup could not be read.'); }
    },
  };
}
