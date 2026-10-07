import { test, expect, type Page } from '@playwright/test';
import { readFile } from 'node:fs/promises';

async function login(page: Page, role: 'student' | 'examiner' = 'student') {
  await page.getByLabel('Name', { exact: true }).fill(role === 'student' ? 'trainee' : 'charan');
  await page.getByLabel('Password', { exact: true }).fill(role === 'student' ? 'CExam@123' : 'Review@123');
  await page.getByRole('button', { name: 'Login', exact: true }).click();
}
const saved = (page: Page) => page.evaluate(() => JSON.parse(localStorage.getItem('c-assessment.store.v1')!));

test('student flow: validation, independent answers, keyboard access, refresh, submission and print', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
  await page.goto('/');
  await page.screenshot({ path: 'test-results/login-desktop.png', fullPage: true });
  await page.getByRole('button', { name: 'Login', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('Enter both');
  await page.getByLabel('Password', { exact: true }).fill('abc');
  await page.getByRole('button', { name: 'Show password' }).click();
  await expect(page.getByLabel('Password', { exact: true })).toHaveAttribute('type', 'text');
  await login(page);
  expect(await saved(page)).toBeNull();
  await page.screenshot({ path: 'test-results/welcome-desktop.png', fullPage: true });
  await page.getByRole('button', { name: 'Start Examination' }).click();
  const original = (await saved(page)).attempts[0];
  const editor = page.getByRole('textbox', { name: 'Code answer for question 1', exact: true });
  expect((await saved(page)).attempts[0].answers.c1.value).toBe('');
  await editor.fill('#include <stdio.h>\nint main(void) {\nreturn 0;\n}');
  await editor.press('Control+Home'); await editor.press('Tab');
  expect((await saved(page)).attempts[0].answers.c1.value).toMatch(/^    #include/);
  await editor.press('Escape'); await editor.press('Tab');
  await expect(editor).not.toBeFocused();
  await page.getByRole('button', { name: 'Flag for Review', exact: true }).click();
  await page.getByRole('button', { name: 'Next', exact: true }).click();
  await page.getByRole('textbox', { name: 'Code answer for question 2', exact: true }).fill('// independently saved question two');
  await page.getByRole('button', { name: 'Previous', exact: true }).click();
  await expect(editor).toContainText('#include');
  await page.screenshot({ path: 'test-results/exam-desktop.png', fullPage: true });
  await page.getByRole('tab', { name: /Fill in the Blanks/ }).click();
  await expect(page.locator('input[id^="answer-b"]')).toHaveCount(30);
  for (let i = 1; i <= 30; i++) await page.getByRole('textbox', { name: `Answer to blank ${i}`, exact: true }).fill(`blank-${i}`);
  await page.reload();
  await expect(page.getByRole('textbox', { name: 'Answer to blank 30', exact: true })).toHaveValue('blank-30');
  const recovered = (await saved(page)).attempts[0];
  expect(recovered.deadline).toBe(original.deadline); expect(recovered.startedAt).toBe(original.startedAt);
  expect(recovered.answers.c1.flagged).toBe(true);
  for (let i = 1; i <= 30; i++) expect(recovered.answers[`b${i}`].value).toBe(`blank-${i}`);
  await page.getByRole('button', { name: 'Submit Exam' }).click();
  await expect(page.getByRole('dialog')).toContainText('32');
  await expect(page.getByRole('dialog')).toContainText('10');
  await page.getByRole('button', { name: 'Confirm Submission' }).click();
  await expect(page.getByRole('heading', { name: 'Your work is submitted.' })).toBeVisible();
  await expect(page.locator('[contenteditable="true"]')).toHaveCount(0);
  await expect(page.locator('input[id^="answer-b"]')).toHaveCount(0);
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download submission as JSON' }).click();
  const content = JSON.parse(await readFile((await (await download).path())!, 'utf8'));
  expect(content.attempt.answers).toEqual((await saved(page)).attempts[0].answers);
  expect(JSON.stringify(content)).not.toContain('CExam@123');
  await page.emulateMedia({ media: 'print' });
  await expect(page.locator('.submission-buttons')).toBeHidden();
  await expect(page.locator('.submitted-answer')).toHaveCount(42);
  await page.emulateMedia({ media: 'screen' });
  await page.reload(); await expect(page.getByRole('heading', { name: 'Your work is submitted.' })).toBeVisible();
  await page.getByRole('button', { name: 'Sign out', exact: true }).click();
  await login(page, 'examiner');
  await expect(page.locator('.submission-item')).toHaveCount(1);
  await expect(page.getByLabel('Submitted code for question 1', { exact: true })).toContainText('#include');
  expect(errors).toEqual([]);
});

test('deadline, warning thresholds, hidden viewing time, and auto-submit on reload', async ({ page }) => {
  await page.clock.install();
  await page.addInitScript(() => { (window as any).testHidden = false; Object.defineProperty(document, 'hidden', { get: () => (window as any).testHidden }); });
  await page.goto('/'); await login(page); await page.getByRole('button', { name: 'Start Examination' }).click();
  await page.clock.runFor(3500);
  const viewed = (await saved(page)).attempts[0].answers.c1.timeMs;
  expect(viewed).toBeGreaterThanOrEqual(3000);
  await page.evaluate(() => { (window as any).testHidden = true; document.dispatchEvent(new Event('visibilitychange')); });
  const hidden = (await saved(page)).attempts[0].answers.c1.timeMs;
  await page.clock.runFor(10000);
  expect((await saved(page)).attempts[0].answers.c1.timeMs).toBe(hidden);
  await page.evaluate(() => { (window as any).testHidden = false; document.dispatchEvent(new Event('visibilitychange')); });
  await page.clock.runFor(2500);
  expect((await saved(page)).attempts[0].answers.c1.timeMs).toBeGreaterThan(hidden);
  const data = await saved(page);
  await page.clock.setSystemTime(data.attempts[0].deadline - 14 * 60000);
  await page.clock.runFor(1000); await expect(page.getByRole('alert')).toContainText('15 minutes');
  await page.clock.setSystemTime(data.attempts[0].deadline - 4 * 60000);
  await page.clock.runFor(1000); await expect(page.getByRole('alert')).toContainText('5 minutes');
  await page.clock.setSystemTime(data.attempts[0].deadline + 1000);
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Time’s up. Your work is submitted.' })).toBeVisible();
  expect((await saved(page)).attempts[0].submittedAt).toBe(data.attempts[0].deadline);
});

test('examiner imports, rejects invalid files, reviews equivalent answers and exports marks', async ({ page }) => {
  await page.goto('/');
  const json = await page.evaluate(async () => {
    const { newAttempt, submitAttempt, exportSubmission } = await import('/src/lib/model.ts');
    const { questions } = await import('/src/data/exam.ts');
    const { answerKey } = await import('/src/data/answerKey.ts');
    const a = newAttempt();
    for (const q of questions) { a.answers[q.id].value = q.id.startsWith('c') ? `// ${q.title}\nint main(void){return 0;}` : answerKey[q.id][0]; a.answers[q.id].timeMs = 1000; }
    a.answers.b19.value = 'linear search';
    return exportSubmission(submitAttempt(a, 'manual'));
  });
  await login(page, 'examiner');
  const input = page.getByLabel('Import submission JSON file');
  await input.setInputFiles({ name: 'bad.json', mimeType: 'application/json', buffer: Buffer.from('{not json') });
  await expect(page.getByRole('alert')).toContainText('not a valid JSON');
  await input.setInputFiles({ name: 'submission.json', mimeType: 'application/json', buffer: Buffer.from(json) });
  await expect(page.getByRole('status').filter({ hasText: 'Imported' })).toBeVisible();
  expect((await saved(page)).attempts[0].answers).toEqual(JSON.parse(json).attempt.answers);
  await page.getByRole('button', { name: 'Apply reviewed answer key' }).click();
  await expect(page.getByLabel('Marks for b19', { exact: true })).toHaveValue('0');
  await page.getByLabel('Marks for b19', { exact: true }).fill('1');
  for (let i = 1; i <= 12; i++) {
    const details = page.locator('.coding-review').nth(i - 1);
    if (await details.getAttribute('open') === null) await details.locator('summary').click();
    await page.getByLabel(`Marks for c${i}`, { exact: true }).fill(i < 5 ? '10' : i < 9 ? '5' : '2.5');
  }
  await page.getByLabel('Marks for c1', { exact: true }).fill('11');
  await expect(page.getByRole('alert')).toContainText('0 to 10');
  expect((await saved(page)).attempts[0].review.scores.c1).toBe(10);
  await page.getByLabel('Marks for c1', { exact: true }).fill('9.5');
  await page.getByLabel('Notes for the student').fill('Clear structure. Review input validation.');
  await page.getByRole('button', { name: 'Complete review', exact: true }).click();
  await expect(page.getByText('99.5', { exact: false }).first()).toBeVisible();
  const download = page.waitForEvent('download'); await page.getByRole('button', { name: 'Export reviewed result' }).click();
  const reviewed = JSON.parse(await readFile((await (await download).path())!, 'utf8'));
  expect(reviewed.attempt.review.scores.c1).toBe(9.5); expect(reviewed.attempt.review.scores.b19).toBe(1);
  expect(reviewed.attempt.review.reviewedAt).toBeTruthy();
  expect(reviewed.attempt.answers).toEqual(JSON.parse(json).attempt.answers);
  await input.setInputFiles({ name: 'duplicate.json', mimeType: 'application/json', buffer: Buffer.from(json) });
  await expect(page.getByRole('alert')).toContainText('already stored');
  await page.screenshot({ path: 'test-results/examiner-desktop.png', fullPage: true });
});

test('mobile layout, collapsible navigator and horizontal code scroll', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await page.screenshot({ path: 'test-results/login-mobile.png', fullPage: true });
  await login(page); await page.getByRole('button', { name: 'Start Examination' }).click();
  const toggle = page.getByRole('button', { name: 'Toggle question navigator' });
  await expect(toggle).toHaveAttribute('aria-expanded', 'false');
  await toggle.click(); await expect(toggle).toHaveAttribute('aria-expanded', 'true');
  await page.getByRole('button', { name: 'Coding question 2: Not answered', exact: true }).click();
  await expect(toggle).toHaveAttribute('aria-expanded', 'false');
  await page.getByRole('textbox', { name: 'Code answer for question 2', exact: true }).fill(`// ${'a very long line '.repeat(50)}`);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect(await page.locator('.cm-scroller').evaluate(el => el.scrollWidth > el.clientWidth)).toBe(true);
  await page.screenshot({ path: 'test-results/exam-mobile.png', fullPage: true });
  await page.getByRole('tab', { name: /Fill in the Blanks/ }).click();
  await expect(page.locator('input[id^="answer-b"]')).toHaveCount(30);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await expect(page.locator('.timer')).toBeInViewport();
});

test('storage failures are visible and corrupted data is not overwritten', async ({ page }) => {
  await page.addInitScript(() => { const original = Storage.prototype.setItem; Storage.prototype.setItem = function(key, value) { if (key === 'c-assessment.store.v1') throw new DOMException('Quota exceeded', 'QuotaExceededError'); return original.call(this, key, value); }; });
  await page.goto('/'); await login(page); await page.getByRole('button', { name: 'Start Examination' }).click();
  await expect(page.getByRole('alert')).toContainText('Saving failed');
  await page.getByRole('textbox', { name: 'Code answer for question 1', exact: true }).fill('// retained in memory');
  await page.getByRole('button', { name: 'Submit Exam' }).click(); await page.getByRole('button', { name: 'Confirm Submission' }).click();
  await expect(page.getByText('// retained in memory', { exact: true })).toBeVisible();
});

test('unreadable saved data remains intact until explicit reset', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('c-assessment.store.v1', '{broken data'));
  await page.goto('/');
  await expect(page.getByRole('alert')).toContainText('Existing data has not been overwritten');
  await login(page);
  await expect(page.getByRole('button', { name: 'Start Examination' })).toBeDisabled();
  expect(await page.evaluate(() => localStorage.getItem('c-assessment.store.v1'))).toBe('{broken data');
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download raw backup' }).click();
  expect(await readFile((await (await download).path())!, 'utf8')).toBe('{broken data');
});

test('expiry during a live exam and when the tab becomes visible submits without a click', async ({ page }) => {
  await page.clock.install();
  await page.goto('/'); await login(page); await page.getByRole('button', { name: 'Start Examination' }).click();
  const deadline = (await saved(page)).attempts[0].deadline;
  await page.clock.setSystemTime(deadline - 500);
  await page.clock.runFor(1500);
  await expect(page.getByRole('heading', { name: 'Time’s up. Your work is submitted.' })).toBeVisible();
  expect((await saved(page)).attempts[0].submittedAt).toBe(deadline);
  // Reset this isolated test browser to another already-expired, active fixture.
  await page.evaluate(async () => {
    const { newAttempt, DURATION_MS } = { ...(await import('/src/lib/model.ts')), ...(await import('/src/data/exam.ts')) };
    const a = newAttempt(Date.now() - DURATION_MS - 1000);
    localStorage.setItem('c-assessment.store.v1', JSON.stringify({ schemaVersion: 1, activeId: a.id, attempts: [a] }));
  });
  await page.reload();
  await page.evaluate(() => document.dispatchEvent(new Event('visibilitychange')));
  await expect(page.getByRole('heading', { name: 'Time’s up. Your work is submitted.' })).toBeVisible();
});
