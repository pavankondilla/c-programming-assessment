import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test('login, instructions, code workspace and blanks meet automated WCAG AA checks', async ({ page }) => {
  await page.goto('/');
  const check = async (screen: string) => {
    const result = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
    expect(result.violations.map(v => ({ id: v.id, nodes: v.nodes.map(n => ({ target: n.target, summary: n.failureSummary })) })), screen).toEqual([]);
  };
  await check('login');
  await page.getByLabel('Name', { exact: true }).fill('trainee');
  await page.getByLabel('Password', { exact: true }).fill('CExam@123');
  await page.getByRole('button', { name: 'Login', exact: true }).click(); await check('welcome');
  await page.getByRole('button', { name: 'Start Examination' }).click(); await check('coding');
  await page.getByRole('tab', { name: /Fill in the Blanks/ }).click(); await check('blanks');
});
