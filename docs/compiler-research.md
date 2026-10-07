# Browser C execution research

Documentation and package metadata checked on **2026-10-07**, before choosing the compiler. The npm package versions and source references below are pinned for this application; newer releases may differ.

| Option | Practical fit | Documentation / license finding | Decision |
| --- | --- | --- | --- |
| `browsercc` with `browser_wasi_shim` | Self-hosted Clang and LLD WebAssembly assets, WASI sysroot, simple compile API; can run in a disposable module worker. | [browsercc documentation](https://github.com/BertalanD/browsercc), [MIT wrapper license](https://github.com/BertalanD/browsercc/blob/main/LICENSE), [build recipe](https://github.com/BertalanD/browsercc/blob/main/build.sh). Upstream compiler components use their own LLVM and libc notices. | Selected after inspecting the package and verifying the required C features with real browser execution. |
| Emception | A complete Emscripten toolchain in the browser, useful for broader Emscripten applications. The original build requires compiling the toolchain and substantial infrastructure. | [Official Emception repository](https://github.com/jprendes/emception) publishes MIT and Apache license files. Emscripten itself is available under [MIT/UIUC terms](https://github.com/emscripten-core/emscripten/blob/main/LICENSE); other bundled components retain their licenses. | More infrastructure than this standard-C examination needs. The license of the whole compiler distribution cannot be inferred from the wrapper alone. |
| Conventional Emscripten precompilation | Good for running C that the application author compiles ahead of time, but not by itself a compiler for newly typed student source. | [Emscripten compilation documentation](https://emscripten.org/docs/compiling/Building-Projects.html), [filesystem documentation](https://emscripten.org/docs/porting/files/file_systems_overview.html), [license](https://github.com/emscripten-core/emscripten/blob/main/LICENSE). | Does not meet arbitrary student-source compilation without shipping a compiler or adding a service. |
| Remote native C executor | Small frontend download and mature native C libraries, but needs an independently operated service and isolation. | No service was selected and no frontend compiler API secret was added. Licensing would depend on the chosen executor and toolchain. | Unnecessary for the working local browser implementation. |

## Why the selected runtime meets the questions

[WASI libc](https://github.com/WebAssembly/wasi-libc) documents standard I/O, file I/O and memory management. The [`browser_wasi_shim` documentation](https://github.com/bjorn3/browser_wasi_shim) supplies stdin through `OpenFile`, captures output, and mounts in-memory directories through `PreopenDirectory`. Its implementation is explicitly partial; that is why this application tests the required features instead of promising all native C behavior.

The installed browsercc compile wrapper creates its compiler as `clang++` and puts options after the input filename. A trailing `-x c` does not change an already encountered input file. The adapter supplies the global `--driver-mode=gcc` option and `-std=c17` so `main.c` is compiled as C, including C's `void *` conversion rules for `malloc`.

The worker exposes a fresh preopened `.` directory. This makes `fopen("student.txt", "w")`, closing, reopening with `"r"`, and reading possible without accessing a host filesystem. Program stdin is a UTF-8 byte buffer consumed synchronously; EOF is returned when exhausted. That avoids an interactive main-thread bridge and SharedArrayBuffer requirements.

Browser tests exercise valid/invalid C, `scanf`, `malloc/free`, floating averages, a name containing spaces written to and read from a virtual file, filesystem reset across runs, traps, nonzero exits, and an infinite loop. Test outputs come only from the actual compiler/runtime. See the verification record for the final observed result.

## Licensing and artifact handling

- **browsercc 0.1.1:** MIT; the upstream notice is copied beside the compiler files.
- **LLVM/Clang/LLD 20.1.2 and compiler-rt/libc++ components:** Apache-2.0 with LLVM exceptions and component-specific retained notices. [LLVM licensing policy](https://llvm.org/docs/DeveloperPolicy.html#license) and the versioned notices in `third-party-licenses/` are the references used.
- **WASI SDK 25's wasi-libc revision `574b88da481569b65a237cb80daf9a2d5aeaf82d`:** multiple permissive licenses. The [upstream license summary](https://github.com/WebAssembly/wasi-libc/blob/main/LICENSE) identifies LLVM/Apache/MIT and third-party BSD/MIT/CC0 components. Matching revision license files and musl/cloudlibc notices were retrieved and retained.
- **browser_wasi_shim 0.4.2:** MIT OR Apache-2.0, per its published package and official repository. Both license texts are copied into the build.
- **Emscripten glue:** retain the upstream MIT/UIUC notice; generated compiler glue is distributed with browsercc. The wrapper's build recipe does not pin every historical build-environment detail, so its precompiled artifact provenance should not be described as a fully reproducible supply-chain audit.
- **UI dependencies:** React, CodeMirror, and Lucide notices plus font licenses are included with the static output. `package-lock.json` records exact npm integrity hashes.

`scripts/fetch-licenses.mjs` is a maintainer-only network operation. Retrieved files are checked into the project so regular development and production builds do not need to repeat it. `scripts/prepare-compiler.mjs` copies the installed package artifacts and notices. The C++ precompiled-header payload is omitted because this application compiles C.

The delivered compiler assets total **94,528,345 bytes** (about 94.5 MB decimal / 90.1 MiB); confirm with filesystem metadata if changing packages. Compilation is lazy and happens away from the UI thread. These sizes, compiler memory costs, and incomplete general WASI support remain practical limitations despite the supported assessment programs.
