import { DURATION_MS, EXAM_VERSION, questions } from '../data/exam';
import type { Attempt, RunResult, Store } from './model';

type Obj = Record<string, unknown>;
function object(value: unknown, label: string): Obj {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error(`${label} must be an object.`);
  return value as Obj;
}
function str(value: unknown, label: string, max = 100000): string {
  if (typeof value !== 'string' || value.length > max) throw new Error(`${label} must be text (up to ${max.toLocaleString()} characters).`);
  return value;
}
function num(value: unknown, label: string, min = 0, max = Number.MAX_SAFE_INTEGER): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < min || value > max) throw new Error(`${label} is outside the allowed range.`);
  return value;
}
export function validateAttempt(input: unknown, requireSubmitted = false): Attempt {
  const a = object(input, 'Attempt');
  if (a.examVersion !== EXAM_VERSION) throw new Error(`Unsupported exam version. Expected ${EXAM_VERSION}.`);
  const id = str(a.id, 'Attempt ID', 100);
  if (!/^[a-zA-Z0-9-]{1,100}$/.test(id)) throw new Error('Attempt ID must contain only letters, numbers, or hyphens.');
  const startedAt = num(a.startedAt, 'Start time');
  const deadline = num(a.deadline, 'Deadline', startedAt);
  if (deadline - startedAt !== DURATION_MS) throw new Error('The deadline must be exactly 180 minutes after the start time.');
  const submittedAt = a.submittedAt === null ? null : num(a.submittedAt, 'Submission time', startedAt, deadline);
  if (requireSubmitted && submittedAt === null) throw new Error('This attempt is still in progress. Import a submitted examination.');
  if (submittedAt === null ? a.submissionReason !== null : !['manual', 'expired'].includes(String(a.submissionReason))) throw new Error('Invalid submission status.');
  if (a.submissionReason === 'expired' && submittedAt !== deadline) throw new Error('An expired attempt must be submitted at its deadline.');
  const selected = str(a.selected, 'Selected question', 10);
  if (!questions.some(q => q.id === selected)) throw new Error('Selected question is not part of this examination.');
  const sourceAnswers = object(a.answers, 'Answers');
  if (Object.keys(sourceAnswers).length !== 42) throw new Error('The submission must contain all 12 coding answers and all 30 blank answers, including empty answers.');
  const answers = Object.fromEntries(questions.map(q => {
    const ans = object(sourceAnswers[q.id], `Answer ${q.id}`);
    if (typeof ans.flagged !== 'boolean') throw new Error(`The review flag for ${q.id} is invalid.`);
    let lastRun: RunResult | null = null;
    if (ans.lastRun !== null) {
      const run = object(ans.lastRun, `Last run for ${q.id}`);
      const statuses = ['success', 'compile-error', 'runtime-error', 'timeout', 'unavailable', 'cancelled'];
      if (!statuses.includes(String(run.status))) throw new Error(`Invalid run status for ${q.id}.`);
      lastRun = { status: run.status as RunResult['status'], stdout: str(run.stdout, 'Output', 70000), diagnostics: str(run.diagnostics, 'Diagnostics', 70000), error: str(run.error, 'Run error', 70000), at: num(run.at, 'Run time'), source: str(run.source, 'Run source'), stdin: str(run.stdin, 'Run input', 20000) };
      if (run.exitCode !== undefined) lastRun.exitCode = num(run.exitCode, 'Exit code', -2147483648, 4294967295);
    }
    return [q.id, { value: str(ans.value, `Answer ${q.id}`, q.id.startsWith('b') ? 200 : 100000), stdin: str(ans.stdin, `Standard input ${q.id}`, 20000), flagged: ans.flagged, timeMs: num(ans.timeMs, `Time spent ${q.id}`, 0, DURATION_MS), lastRun }];
  }));
  if (Object.values(answers).reduce((sum, ans) => sum + ans.timeMs, 0) > DURATION_MS + 1000) throw new Error('Total question viewing time exceeds the exam duration.');
  const r = object(a.review, 'Review'); const scoresIn = object(r.scores, 'Scores');
  const scores = Object.fromEntries(questions.map(q => {
    const score = scoresIn[q.id] === null ? null : num(scoresIn[q.id], `Score for ${q.id}`, 0, q.marks);
    if (score !== null && !Number.isInteger(score * 2)) throw new Error(`Score for ${q.id} must use half-mark increments.`);
    return [q.id, score];
  }));
  const reviewedAt = r.reviewedAt === null ? null : num(r.reviewedAt, 'Review time', submittedAt ?? startedAt);
  if (reviewedAt !== null && Object.values(scores).some(score => score === null)) throw new Error('A completed review must have a score for every question.');
  if (submittedAt === null && (reviewedAt !== null || Object.values(scores).some(score => score !== null))) throw new Error('An active attempt cannot contain examiner marks.');
  const studentName = str(a.studentName, 'Student name', 100).trim();
  if (!studentName) throw new Error('Student name cannot be empty.');
  return { id, examVersion: EXAM_VERSION, studentName, startedAt, deadline, submittedAt, submissionReason: a.submissionReason as Attempt['submissionReason'], selected, answers, review: { scores, feedback: str(r.feedback, 'Feedback', 10000), reviewedAt } };
}
export function importSubmission(text: string): Attempt {
  if (text.length > 5_000_000) throw new Error('This file is too large. Maximum submission size is 5 MB.');
  let data: Obj;
  try { data = object(JSON.parse(text), 'Submission'); } catch { throw new Error('This is not a valid JSON submission. Choose a JSON file downloaded from this application.'); }
  if (data.format !== 'c-programming-assessment' || data.schemaVersion !== 1) throw new Error('Unrecognized submission format. Use a submission JSON downloaded from C Programming Assessment.');
  return validateAttempt(data.attempt, true);
}
export function validateStore(input: unknown): Store {
  const s = object(input, 'Saved examination');
  if (s.schemaVersion !== 1 || !Array.isArray(s.attempts)) throw new Error('Saved examination format is not supported.');
  const attempts = s.attempts.map(a => validateAttempt(a));
  if (new Set(attempts.map(a => a.id)).size !== attempts.length) throw new Error('Duplicate attempt IDs in saved data.');
  const activeId = s.activeId === null ? null : str(s.activeId, 'Active attempt ID', 100);
  if (activeId !== null && !attempts.some(a => a.id === activeId)) throw new Error('The saved active attempt is missing.');
  return { schemaVersion: 1, activeId, attempts };
}
