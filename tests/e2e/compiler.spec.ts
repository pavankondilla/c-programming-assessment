import { test, expect } from '@playwright/test';

test('real C compiler: valid, invalid, stdin, malloc, files, runtime errors, timeout and reset', async ({ page }) => {
  await page.goto('/');
  const run = (source: string, stdin = '') => page.evaluate(async ({ source, stdin }) => {
    // Exercise the same worker adapter used by the UI, without typing test fixtures into an exam.
    const { runCode } = await import('/src/execution/runCode.ts');
    return await runCode(source, stdin, () => {}).promise;
  }, { source, stdin });
  const valid = await run('#include <stdio.h>\nint main(void){ printf("Hello C!\\n"); return 0; }');
  expect(valid, JSON.stringify(valid)).toMatchObject({ status: 'success', stdout: 'Hello C!\n', exitCode: 0 });
  const invalid = await run('int main(void) { not valid C; }');
  expect(invalid.status).toBe('compile-error'); expect(invalid.diagnostics).toMatch(/error:/);
  const allocation = await run('#include <stdio.h>\n#include <stdlib.h>\nint main(void){ int n; if(scanf("%d", &n)!=1 || n<1) return 1; int *a=malloc(n*sizeof(int)); if(!a)return 2; int sum=0; for(int i=0;i<n;i++){scanf("%d",&a[i]);sum+=a[i];} printf("sum=%d avg=%.2f\\n",sum,(double)sum/n);free(a);return 0;}', '3\n4\n5\n9\n');
  expect(allocation, JSON.stringify(allocation)).toMatchObject({ status: 'success', stdout: 'sum=18 avg=6.00\n' });
  const file = await run('#include <stdio.h>\nint main(void){ char name[60]; if(!fgets(name,sizeof(name),stdin))return 1; FILE *f=fopen("student.txt","w");if(!f)return 2;fprintf(f,"%s",name);fclose(f);f=fopen("student.txt","r");if(!f)return 3;int c;while((c=fgetc(f))!=EOF)putchar(c);fclose(f);return 0;}', 'Ada Lovelace\n');
  expect(file, JSON.stringify(file)).toMatchObject({ status: 'success', stdout: 'Ada Lovelace\n' });
  const reset = await run('#include <stdio.h>\nint main(void){ FILE *f=fopen("student.txt","r");if(f){fclose(f);return 1;} puts("fresh filesystem");return 0;}');
  expect(reset, JSON.stringify(reset)).toMatchObject({ status: 'success', stdout: 'fresh filesystem\n' });
  const runtime = await run('int main(void){ __builtin_trap(); return 0; }'); expect(runtime.status).toBe('runtime-error');
  const exit = await run('int main(void){return 7;}'); expect(exit).toMatchObject({ status: 'runtime-error', exitCode: 7 });
  const loop = await run('int main(void){ volatile int n=0; for(;;){ n = n == 100 ? 0 : n + 1; } }');
  expect(loop.status).toBe('timeout'); expect(loop.error).toContain('5 seconds');
  await expect(page.getByRole('button', { name: 'Login', exact: true })).toBeEnabled();
});
