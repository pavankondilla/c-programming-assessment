import { describe, expect, it } from 'vitest';
import { blankQuestions, codingQuestions, DURATION_MS, questions } from '../../src/data/exam';
import { answerKey, markBlank } from '../../src/data/answerKey';
import { counts, exportSubmission, newAttempt, submitAttempt, totals } from '../../src/lib/model';
import { importSubmission, validateAttempt } from '../../src/lib/validation';

describe('examination contract', () => {
  it('contains exactly 100 marks, 4 coding questions per difficulty, and 30 unique blanks', () => {
    expect(questions.reduce((sum, q) => sum + q.marks, 0)).toBe(100);
    expect(codingQuestions.reduce((sum, q) => sum + q.marks, 0)).toBe(70);
    expect(blankQuestions).toHaveLength(30);
    expect(new Set(questions.map(q => q.id)).size).toBe(42);
    for (const difficulty of ['Hard', 'Medium', 'Easy']) expect(codingQuestions.filter(q => q.difficulty === difficulty)).toHaveLength(4);
    expect(codingQuestions.map(q => q.difficulty)).toEqual([...Array(4).fill('Hard'), ...Array(4).fill('Medium'), ...Array(4).fill('Easy')]);
  });
  it('starts empty with an immutable three-hour deadline', () => {
    const a = newAttempt(1000000);
    expect(a.deadline).toBe(1000000 + DURATION_MS);
    expect(counts(a)).toMatchObject({ answered: 0, unanswered: 42 });
    expect(Object.values(a.answers).every(answer => answer.value === '' && answer.timeMs === 0)).toBe(true);
  });
  it('exports and imports all answers, stdin, flags, run metadata, timing and review exactly', () => {
    const a = newAttempt(1000000);
    for (const q of questions) a.answers[q.id] = { value: `${q.id} answer\nwith spaces`, stdin: '1\n2\n', flagged: true, timeMs: q.number * 100, lastRun: null };
    a.answers.c1.lastRun = { status: 'compile-error', stdout: '', diagnostics: 'error', error: '', at: 1000050, source: a.answers.c1.value, stdin: '1\n2\n' };
    const submitted = submitAttempt(a, 'manual', 1003000);
    const json = exportSubmission(submitted);
    expect(importSubmission(json)).toEqual(submitted);
    expect(JSON.parse(json).summary).toMatchObject({ answered: 42, unanswered: 0, marks: { maximum: 100, final: false } });
    expect(json).not.toMatch(/password|CExam@123|Review@123/);
    expect(counts(importSubmission(json))).toMatchObject({ answered: 42, unanswered: 0 });
  });
  it('submits expired work at its stored deadline, once only', () => {
    const a = newAttempt(1000000);
    const submitted = submitAttempt(a, 'expired', a.deadline + 60000);
    expect(submitted.submittedAt).toBe(a.deadline);
    expect(submitAttempt(submitted, 'manual', a.deadline + 70000)).toBe(submitted);
  });
  it('accepts reviewed equivalent answers without relaxing C case sensitivity', () => {
    expect(Object.keys(answerKey)).toHaveLength(30);
    for (const q of blankQuestions) expect(markBlank(q.id, answerKey[q.id][0])).toBe(1);
    expect(markBlank('b15', ' n - 1 ')).toBe(1);
    expect(markBlank('b17', 'arr [ i ]')).toBe(1);
    expect(markBlank('b19', 'Sequential')).toBe(1);
    expect(markBlank('b2', 'PRINTF')).toBe(0);
    expect(markBlank('b21', '0')).toBe(0);
    expect(markBlank('b1', '')).toBe(0);
  });
  it('handles half marks and full totals', () => {
    const a = submitAttempt(newAttempt(), 'manual');
    questions.forEach(q => { a.review.scores[q.id] = q.marks; });
    expect(totals(a)).toEqual({ coding: 70, blanks: 30, total: 100, pending: 0 });
    a.review.scores.c9 = 1.5; a.review.scores.b1 = 0.5;
    expect(totals(validateAttempt(a)).total).toBe(98.5);
  });
  it.each([
    ['malformed JSON', '{', /valid JSON/],
    ['wrong envelope', '{}', /Unrecognized/],
    ['oversized file', ' '.repeat(5000001), /too large/],
    ['active attempt', exportSubmission(newAttempt()), /still in progress/],
  ])('rejects %s with a helpful error', (_, content, error) => expect(() => importSubmission(content)).toThrow(error));
  it.each([
    ['missing answer', (a: any) => { delete a.answers.b30; }, /all 12/],
    ['unknown exam', (a: any) => { a.examVersion = 'invalid'; }, /exam version/],
    ['invalid score', (a: any) => { a.review.scores.c1 = 11; }, /allowed range/],
    ['quarter marks', (a: any) => { a.review.scores.c1 = 1.25; }, /half-mark/],
    ['invalid deadline', (a: any) => { a.deadline += 1; }, /180 minutes/],
    ['missing review score', (a: any) => { delete a.review.scores.b1; }, /allowed range/],
  ])('rejects %s', (_, change, error) => {
    const data = JSON.parse(exportSubmission(submitAttempt(newAttempt(), 'manual')));
    change(data.attempt);
    expect(() => importSubmission(JSON.stringify(data))).toThrow(error);
  });
});
