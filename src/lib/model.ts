import { DURATION_MS, EXAM_VERSION, questions, codingQuestions, blankQuestions } from '../data/exam';

export type RunStatus = 'success' | 'compile-error' | 'runtime-error' | 'timeout' | 'unavailable' | 'cancelled';
export type RunResult = { status: RunStatus; stdout: string; diagnostics: string; error: string; at: number; exitCode?: number; source: string; stdin: string };
export type Answer = { value: string; stdin: string; flagged: boolean; timeMs: number; lastRun: RunResult | null };
export type Review = { scores: Record<string, number | null>; feedback: string; reviewedAt: number | null };
export type Attempt = {
  id: string; examVersion: string; studentName: string; startedAt: number; deadline: number;
  submittedAt: number | null; submissionReason: 'manual' | 'expired' | null; selected: string;
  answers: Record<string, Answer>; review: Review;
};
export type Store = { schemaVersion: 1; activeId: string | null; attempts: Attempt[] };
export const STORAGE_KEY = 'c-assessment.store.v1';
export const emptyStore = (): Store => ({ schemaVersion: 1, activeId: null, attempts: [] });
export function newAttempt(now = Date.now()): Attempt {
  return { id: crypto.randomUUID(), examVersion: EXAM_VERSION, studentName: 'trainee', startedAt: now, deadline: now + DURATION_MS,
    submittedAt: null, submissionReason: null, selected: 'c1',
    answers: Object.fromEntries(questions.map(q => [q.id, { value: '', stdin: '', flagged: false, timeMs: 0, lastRun: null }])),
    review: { scores: Object.fromEntries(questions.map(q => [q.id, null])), feedback: '', reviewedAt: null },
  };
}
export const isAnswered = (answer: Answer) => answer.value.trim().length > 0;
export function counts(attempt: Attempt) {
  const coding = codingQuestions.filter(q => isAnswered(attempt.answers[q.id])).length;
  const blanks = blankQuestions.filter(q => isAnswered(attempt.answers[q.id])).length;
  return { coding, blanks, answered: coding + blanks, unanswered: 42 - coding - blanks, flagged: questions.filter(q => attempt.answers[q.id].flagged).length };
}
export function totals(attempt: Attempt) {
  const sum = (ids: string[]) => ids.reduce((total, id) => total + (attempt.review.scores[id] ?? 0), 0);
  return { coding: sum(codingQuestions.map(q => q.id)), blanks: sum(blankQuestions.map(q => q.id)), total: sum(questions.map(q => q.id)), pending: questions.filter(q => attempt.review.scores[q.id] === null).length };
}
export function submitAttempt(attempt: Attempt, reason: 'manual' | 'expired', now = Date.now()): Attempt {
  if (attempt.submittedAt !== null) return attempt;
  return { ...attempt, submittedAt: reason === 'expired' ? attempt.deadline : Math.min(now, attempt.deadline), submissionReason: reason };
}
export function formatTime(ms: number) {
  const s = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(s / 3600).toString().padStart(2, '0')}:${Math.floor(s / 60) % 60 < 10 ? '0' : ''}${Math.floor(s / 60) % 60}:${(s % 60).toString().padStart(2, '0')}`;
}
export function dateTime(value: number) { return new Date(value).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }); }
export function exportSubmission(attempt: Attempt) {
  return JSON.stringify({ format: 'c-programming-assessment', schemaVersion: 1, exportedAt: Date.now(), summary: { ...counts(attempt), marks: { ...totals(attempt), maximum: 100, final: attempt.review.reviewedAt !== null } }, attempt }, null, 2);
}
export function downloadSubmission(attempt: Attempt) {
  const url = URL.createObjectURL(new Blob([exportSubmission(attempt)], { type: 'application/json' }));
  const link = document.createElement('a'); link.href = url;
  link.download = `c-assessment-${attempt.id}${attempt.review.reviewedAt ? '-reviewed' : ''}.json`;
  link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
}
