// Maintainer-only: fetch upstream notices; normal installation/build stays offline after npm ci.
import { mkdir, writeFile } from 'node:fs/promises';
const out = 'third-party-licenses';
await mkdir(out, { recursive: true });
const sources = [];
async function save(name, url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`${response.status}: ${url}`);
  await writeFile(`${out}/${name}`, await response.text());
  sources.push(`${name}: ${url}`);
  console.log(`Saved ${name}`);
}
for (const component of ['llvm', 'clang', 'lld', 'libcxx', 'libcxxabi', 'compiler-rt']) {
  await save(`LLVM-${component}.txt`, `https://raw.githubusercontent.com/llvm/llvm-project/llvmorg-20.1.2/${component}/LICENSE.TXT`);
}
const sdkTree = await (await fetch('https://api.github.com/repos/WebAssembly/wasi-sdk/git/trees/wasi-sdk-25')).json();
const libcSha = sdkTree.tree.find(entry => entry.path === 'src').sha;
const subTree = await (await fetch(`https://api.github.com/repos/WebAssembly/wasi-sdk/git/trees/${libcSha}`)).json();
const wasiSha = subTree.tree.find(entry => entry.path === 'wasi-libc').sha;
const wasiTree = await (await fetch(`https://api.github.com/repos/WebAssembly/wasi-libc/git/trees/${wasiSha}?recursive=1`)).json();
if (wasiTree.truncated) throw new Error('Incomplete wasi-libc tree');
for (const entry of wasiTree.tree.filter(entry => entry.type === 'blob' && /(^|\/)(LICENSE[^/]*|COPYRIGHT|COPYING)$/.test(entry.path))) {
  await save(`wasi-libc-${entry.path.replaceAll('/', '-')}.txt`, `https://raw.githubusercontent.com/WebAssembly/wasi-libc/${wasiSha}/${entry.path}`);
}
// Emscripten glue is dual MIT / UIUC; retain both upstream notice files.
await save('emscripten-LICENSE.txt', 'https://raw.githubusercontent.com/emscripten-core/emscripten/4.0.7/LICENSE');
await writeFile(`${out}/SOURCES.txt`, `Retrieved 2026-10-07. browsercc 0.1.1 build references LLVM 20.1.2 and wasi-sdk 25.\nWASI libc revision: ${wasiSha}\n\n${sources.join('\n')}\n`);
