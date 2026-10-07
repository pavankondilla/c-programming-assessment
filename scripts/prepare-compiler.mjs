import { mkdir, copyFile, readdir, cp, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
const target = resolve('public/compiler');
await mkdir(target, { recursive: true });
for (const file of ['index.js', 'clang.js', 'clang.wasm', 'lld.js', 'lld.wasm', 'sysroot.tar']) {
  await copyFile(resolve('node_modules/browsercc/dist', file), resolve(target, file));
}
await copyFile('node_modules/browsercc/LICENSE', resolve(target, 'LICENSE-browsercc.txt'));
await mkdir('public/licenses', { recursive: true });
for (const [folder, output] of [['@bjorn3/browser_wasi_shim', 'wasi-shim'], ['react', 'react'], ['react-dom', 'react-dom'], ['lucide-react', 'lucide'], ['@fontsource/dm-sans', 'font-dm-sans'], ['@fontsource/manrope', 'font-manrope']]) {
  const files = await readdir(`node_modules/${folder}`);
  for (const file of files.filter(f => /^license/i.test(f))) await copyFile(`node_modules/${folder}/${file}`, `public/licenses/${output}-${file}.txt`);
}
for (const module of await readdir('node_modules/@codemirror')) {
  await copyFile(`node_modules/@codemirror/${module}/LICENSE`, `public/licenses/codemirror-${module}.txt`);
}
const lock = JSON.parse(await readFile('package-lock.json', 'utf8'));
const manifest = [];
for (const [path, meta] of Object.entries(lock.packages)) {
  if (!path.startsWith('node_modules/') || meta.dev) continue;
  const name = path.replaceAll('node_modules/', '').replaceAll('/', '-');
  manifest.push(`${name}@${meta.version}: ${meta.license ?? 'See retained license notice'}`);
  for (const file of (await readdir(path)).filter(f => /^(LICENSE|COPYING|NOTICE)(\.|-|$)/i.test(f))) {
    await copyFile(`${path}/${file}`, `public/licenses/${name}-${file}.txt`);
  }
}
await writeFile('public/licenses/DEPENDENCIES.txt', manifest.join('\n') + '\n');
try { await cp('third-party-licenses', 'public/licenses', { recursive: true }); } catch (e) { if (e.code !== 'ENOENT') throw e; }
console.log('Self-hosted compiler assets prepared (94.5 MB, loaded only on Run Code).');
