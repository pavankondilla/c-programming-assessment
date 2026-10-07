# C Programming Assessment

A frontend-only React + TypeScript + Vite examination application. The exam has **100 marks**, **180 minutes**, **12 coding questions** (hard → medium → easy), and **30 fill-in-the-blanks**. C compilation and execution happen in the browser using self-hosted WebAssembly assets; no compiler service or API key is required.

**Live examination:** [https://pavankondilla.github.io/c-programming-assessment/](https://pavankondilla.github.io/c-programming-assessment/)

**Source repository:** [github.com/pavankondilla/c-programming-assessment](https://github.com/pavankondilla/c-programming-assessment). Every push to `main` runs the unit tests, builds the app and compiler assets, and deploys the static site with GitHub Actions.

## Run locally

Use Node.js 22.12+ or a current supported Node release (tested with Node 24).

```sh
npm ci
npm run dev
```

Open the local URL printed by Vite. On Windows PowerShell systems that block `npm.ps1`, use `npm.cmd` instead of `npm`. The `predev` step copies the pinned compiler assets into `public/compiler/`.

## Demo credentials

| Role | Name | Password |
| --- | --- | --- |
| Student | `trainee` | `CExam@123` |
| Examiner | `charan` | `Review@123` |

These credentials are public demo authentication. Passwords are never written into attempts or exported submissions. This is not secure authentication: source code, local storage, credentials, and the examiner answer key can be inspected by someone with browser developer tools.

## Using the examination

1. Sign in as the student and read the instructions. The timer starts only when **Start Examination** is clicked.
2. Work through the coding and blank sections. Each answer, standard-input field, review flag, last run, and viewing time is independently saved. Coding editors start empty; starter code is optional.
3. Use **Run Code** to compile and test. Supply all input in advance, with values or menu choices on separate lines; include the Exit choice for menu programs. Names may include spaces. After the supplied input is consumed, `stdin` reaches EOF rather than waiting for interactive input.
4. Use Previous, Next, the navigator, and review flags. In the editor, Tab indents and Shift+Tab unindents. Press Escape, then Tab to move focus out of the editor. Standard keyboard selection, clipboard, and undo/redo are supported.
5. Submit manually after reviewing the confirmation counts, or let the deadline auto-submit. Unanswered work can be submitted. Editing is locked through the interface afterward.
6. Download the submission JSON and keep a copy. Print submission produces a view with all 42 answers. Give the JSON file to an examiner when using another device.
7. The examiner can open local submissions or import a JSON file, inspect every answer, enter coding marks, apply the reviewed blank key, override equivalent answers, add feedback, and complete/export the review. Marks use 0.5 increments. A draft total treats unscored questions as zero and labels the number still pending. A final result requires all 42 scores.

Blank 7's supplied statement (`n % 2 == ...`) does not explicitly say even or odd. The interface clarifies that it means the even-number check, and the examiner documentation records that interpretation.

## Static hosting

```sh
npm ci
npm run build
npm run preview
```

Publish **the entire `dist/` directory** to a static HTTP(S) host. There are no server routes, environment variables, private keys, or backend dependencies. Vite uses a relative base (`./`), so it can be hosted at a domain root or under a directory such as `/c-exam/`. Open the directory URL with a trailing slash. Do not open `index.html` directly as a `file://` URL: browser module workers require HTTP(S).

Hosting requirements:

- Keep `dist/compiler/` and `dist/licenses/` alongside the application assets.
- Serve `.wasm` as `application/wasm`, JavaScript as `text/javascript` or `application/javascript`, and `.tar` as binary content. Avoid routing missing assets to `index.html`.
- The compiler assets total about **94.5 MB uncompressed**, loaded only on first Run Code. The largest individual file is `clang.wasm` at about **42.6 MB**. A host with a 25 MB per-file cap needs a different artifact delivery arrangement; ordinary HTTP static hosting with a higher limit works. Enable HTTP compression and caching for compiler assets.
- When changing compiler versions, invalidate the stable `/compiler/` URLs in your host/CDN cache. Application JS/CSS bundles have content hashes.
- No cross-origin isolation headers are needed for this single-threaded compiler/runtime. A strict Content Security Policy must permit same-origin module workers, WebAssembly compilation (`'wasm-unsafe-eval'` where supported), local fonts, and CodeMirror's generated styles. Test your chosen policy on the target host.
- Runtime assets and fonts are self-hosted. After `npm ci`, normal builds do not fetch compiler or font files from a CDN. An initial page visit is not an offline installation: browser HTTP cache availability is not guaranteed, and there is no service worker.

## C execution and limits

See [compiler research and licensing](docs/compiler-research.md). The chosen stack is `browsercc@0.1.1` (Clang/LLVM 20.1.2 + WASI SDK 25 assets) and `@bjorn3/browser_wasi_shim@0.4.2`.

- Uses real C17 compilation with `--driver-mode=gcc`, warnings enabled, and no C execution simulation in JavaScript. The JavaScript WASI shim implements operating-system interfaces for actual compiled WebAssembly.
- Each test run creates a new Web Worker. Compilation/loading is limited to 90 seconds; execution is limited to 5 seconds. The main page terminates the worker on timeout. Stop, changing questions, and leaving the exam also dispose of the active worker.
- The compiled program has a 64 MB WebAssembly memory ceiling and 64 KB captured output limit. The compiler itself uses substantially more browser memory; this is not a hardened system-level memory quota. Worker timers may be delayed by background-tab throttling. Low-memory mobile devices may fail to load/compile, and those failures are reported rather than presented as success.
- `malloc`, `free`, `scanf`, `printf`, and sandboxed `fopen` / `fprintf` / `fclose` / reopen/read operations are supported for these questions.
- `student.txt` is held only in the worker's isolated, in-memory filesystem. Closing/reopening works during the same run. Every new run starts with an empty filesystem. There is no access to the user's computer files.
- No threads, subprocesses, native OS access, or general POSIX compatibility is promised. The WASI shim implements a subset of WASI preview1.
- Run results store the source and input used; the interface indicates when an answer has changed since its last run. Runs never mark questions, award coding marks, or submit an exam.
- If assets fail to load or the browser lacks Worker/WebAssembly support, the app reports compiler unavailability. It never invents output. The examination and answer saving can still be used.

No external execution service is currently needed. If replacing this browser compiler, keep the `src/execution/runCode.ts` adapter. A minimal external alternative would be a backend endpoint accepting `{source, stdin}` and returning compilation diagnostics, stdout, stderr, exit status, and timeout status from an isolated C17 container with CPU/memory/output limits and a fresh filesystem. Service credentials would belong on that backend, never in this frontend.

## Persistence and timing boundaries

- One student attempt is resumed on this browser; there is intentionally no destructive “start over” action in the normal examination flow.
- `localStorage['c-assessment.store.v1']` stores attempts, answers, review data, fixed start timestamps and deadlines. `sessionStorage` stores only the selected demo role; it may require sign-in again after the browser session ends.
- Every answer/state change is saved, as are one-second viewing-time updates. Storage quota, privacy-mode, and malformed-data errors are visible. Unreadable existing storage is preserved until an explicit reset; the UI can download a raw backup. A failed save leaves current work in memory and offers retry and submission export.
- Question viewing time uses monotonic `performance.now()` deltas while the student exam is open and the tab is visible. It is cumulative and is not another deadline. Very abrupt browser/process termination can lose the final sub-second interval.
- Remaining exam time is recalculated from the fixed deadline. Checks run on reload, visibility changes, and a one-second interval. Returning after expiry submits at the original deadline. A closed browser cannot execute submission code until it is opened again.
- Warnings appear at 15 and 5 minutes. A before-unload warning is requested while an attempt is active, subject to browser restrictions.
- Device-clock manipulation and local storage editing cannot be prevented by a frontend. The submission lock is a UI restriction, not tamper-proof security. Use one active exam tab; simultaneous tabs are not coordinated.
- Results are not sent anywhere automatically. There is no live monitoring or cross-device synchronization. Central authentication, trusted timestamps, shared submissions, and live results require a backend or connected database.

## Verification

```sh
npm test
npm run test:e2e
npm run build
npm run test:static
```

The Playwright configuration uses installed Microsoft Edge by default and port 5174. To use an installed Chrome, set `PW_CHANNEL=chrome`. Alternatively install Playwright Chromium with `npx playwright install chromium` and set `PW_CHANNEL=chromium`. On PowerShell: `$env:PW_CHANNEL = 'chromium'`.

The unit tests cover marks, counts, difficulty order, empty initial answers, deadline handling, reviewed equivalents, half marks, complete JSON round-trips, and malformed imports. Browser tests cover student/examiner workflows, navigation, refresh, submission locking, expiry, hidden-tab viewing time, storage failures, printing, mobile overflow, keyboard escape, accessibility, and actual C compilation/runtime features. See [verification record](docs/verification.md) for the observed result and limits.

## Project layout

```text
src/data/          Exam questions and separate examiner answer key
src/components/    Student, examination, submission, and examiner interfaces
src/lib/           Attempt model, persistence/timing, import validation
src/execution/     Modular compiler adapter, protocol, disposable worker
scripts/           Compiler asset preparation and license retrieval
third-party-licenses/  Upstream license texts included in builds
tests/unit/        Data, scoring, and import validation tests
tests/e2e/         Browser and actual compiler tests
```

Third-party notices are retained in `third-party-licenses/`, `public/licenses/`, and the built `dist/licenses/`; the compiler wrapper's notice is also copied beside its files. Exact npm versions and integrity hashes are locked in `package-lock.json`.
