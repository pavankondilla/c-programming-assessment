# C Programming Assessment

A static React, TypeScript, and Vite C examination site that can run on GitHub Pages without an application backend.

## Question set

The paper contains 15 C coding questions worth 70 marks and 30 fill-in-the-blank questions worth 30 marks. The 180-minute exam runs C code in a browser Web Worker using a self-hosted C17 WebAssembly compiler.

## Local setup

Use Node.js 24 or newer.

1. Run `npm ci`.
2. Run `npm run dev` and open the Vite URL it prints.
3. Run `npm run build` to create the static site in `dist`.

The frontend login accounts are defined in `src/lib/auth.ts`. Since this is a static site, anyone can inspect the published JavaScript and find those credentials. Do not use these accounts to protect private information.

## Storage and review

Login sessions and exam answers are kept in browser storage on the current device. They do not sync across devices or to an organizer. Blank questions are scored in the browser. Coding answers need manual review; students can download and share their submission JSON. The static site does not send email or provide centralized examiner review.

Browser storage can be cleared by the user or browser. Download the submission after finishing to keep a separate copy.

## GitHub Pages

The workflow in `.github/workflows/pages.yml` builds the static site and deploys `dist` to GitHub Pages when changes are pushed to `main`.

## Compiler

The browser compiler assets are prepared by `scripts/prepare-compiler.mjs` during development and build. The assets total about 94.5 MB and load on first Run Code. See [compiler research and licensing](docs/compiler-research.md) for implementation details and limitations.

## Checks

Run `npm test` for the unit suite and `npm run build` for TypeScript and static build checks.
