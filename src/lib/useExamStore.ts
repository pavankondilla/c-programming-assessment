import { useCallback, useEffect, useRef, useState } from 'react';
import { DURATION_MS } from '../data/exam';
import { emptyStore, newAttempt, STORAGE_KEY, submitAttempt, type Attempt, type Store } from './model';
import { validateStore } from './validation';

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return { store: raw ? validateStore(JSON.parse(raw)) : emptyStore(), error: '', blocked: false };
  } catch (error) {
    return { store: emptyStore(), error: `Could not recover saved data: ${error instanceof Error ? error.message : 'Storage is unavailable.'} Existing data has not been overwritten.`, blocked: true };
  }
}
export function useExamStore(studentViewing: boolean) {
  const [initial] = useState(load);
  const [store, setStore] = useState(initial.store);
  const storeRef = useRef(store);
  const [storageError, setStorageError] = useState(initial.error);
  const [blocked, setBlocked] = useState(initial.blocked);
  const [now, setNow] = useState(Date.now());
  const flushView = useRef<() => void>(() => {});
  const persist = useCallback((next: Store) => {
    storeRef.current = next;
    setStore(next);
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); setStorageError(''); }
    catch { setStorageError('Saving failed. Your latest work is only in this open tab. Keep it open and download your submission when finished. Free browser storage, then retry saving.'); }
  }, []);
  const update = useCallback((id: string, fn: (attempt: Attempt) => Attempt) => {
    const current = storeRef.current;
    persist({ ...current, attempts: current.attempts.map(a => a.id === id ? fn(a) : a) });
  }, [persist]);
  const active = store.attempts.find(a => a.id === store.activeId) ?? null;

  useEffect(() => {
    const check = () => {
      const time = Date.now(); setNow(time);
      const current = storeRef.current;
      if (current.attempts.some(a => a.submittedAt === null && time >= a.deadline)) {
        flushView.current();
        persist({ ...storeRef.current, attempts: storeRef.current.attempts.map(a => a.submittedAt === null && time >= a.deadline ? submitAttempt(a, 'expired', time) : a) });
      }
    };
    check(); const timer = window.setInterval(check, 1000);
    document.addEventListener('visibilitychange', check);
    window.addEventListener('pageshow', check);
    return () => { clearInterval(timer); document.removeEventListener('visibilitychange', check); window.removeEventListener('pageshow', check); };
  }, [persist]);

  useEffect(() => {
    if (!active || active.submittedAt !== null || !studentViewing) { flushView.current = () => {}; return; }
    const id = active.id, key = active.selected;
    let last = performance.now(), wallLast = Date.now(), visible = !document.hidden;
    const flush = () => {
      const tick = performance.now(), wall = Date.now();
      const elapsed = visible ? Math.max(0, Math.min(tick - last, active.deadline - wallLast)) : 0;
      last = tick; wallLast = wall; visible = !document.hidden;
      if (elapsed > 0) update(id, a => {
        if (a.submittedAt !== null) return a;
        const total = Object.values(a.answers).reduce((sum, answer) => sum + answer.timeMs, 0);
        const delta = Math.min(Math.round(elapsed), Math.max(0, DURATION_MS - total));
        return { ...a, answers: { ...a.answers, [key]: { ...a.answers[key], timeMs: a.answers[key].timeMs + delta } } };
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
    update(active.id, a => a.submittedAt !== null ? a : Date.now() >= a.deadline ? submitAttempt(a, 'expired') : fn(a));
  };
  return {
    store, active, now, storageError, blocked, update,
    start: () => {
      if (blocked || storeRef.current.activeId) return;
      const a = newAttempt(); persist({ ...storeRef.current, activeId: a.id, attempts: [...storeRef.current.attempts, a] });
    },
    edit,
    select: (key: string) => { flushView.current(); edit(a => ({ ...a, selected: key })); },
    submit: () => { flushView.current(); if (active) update(active.id, a => submitAttempt(a, Date.now() >= a.deadline ? 'expired' : 'manual')); },
    flush: () => flushView.current(),
    importAttempt: (attempt: Attempt) => {
      if (storeRef.current.attempts.some(a => a.id === attempt.id)) throw new Error('This attempt ID is already stored here. Open the existing submission; it was not overwritten.');
      persist({ ...storeRef.current, attempts: [...storeRef.current.attempts, attempt] });
    },
    retrySave: () => { if (!blocked) persist(storeRef.current); },
    resetCorrupt: () => {
      if (window.confirm('Clear the unreadable saved data on this browser? Download a raw backup first if it may contain answers.')) {
        setBlocked(false); persist(emptyStore());
      }
    },
    rawBackup: () => {
      try { const data = localStorage.getItem(STORAGE_KEY) ?? ''; const url = URL.createObjectURL(new Blob([data], { type: 'application/json' })); const a = document.createElement('a'); a.href = url; a.download = 'c-assessment-storage-backup.json'; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); }
      catch { setStorageError('Browser storage is inaccessible. A backup could not be read.'); }
    },
  };
}
