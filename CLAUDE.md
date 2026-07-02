# CLAUDE.md

We've implemented three 6502 emulators: two in TypeScript (`CPU1`, `CPU2`) and one
in PostgreSQL stored procedures running on PGlite (`PGCPU`). A `SyncCPU` abstraction
runs all three in lockstep and throws on any state difference, which is how we find
bugs. MS-BASIC (OSI build, `data/osi.bin`) now boots and runs correctly in `--sync`
mode with no divergences. Whenever a divergence does appear, we must consult the spec
in `6502.md` and carefully determine which of the implementations (if any) are correct.

## Guidelines

- Write tests first, then implement the code to make them pass. You must always have 100% code coverage!
- Always put tasks to do in `TODO.md`, and check them off once done
- If you learn anything interesting, or went down a wrong path that you don't want to repeat, write it down in `DEV-LOG.md`

## Build/Test Commands
- Install dependencies first: `npm install` (Node version in `.nvmrc`)
- Build/typecheck: `npm run typecheck`
- Run tests: `npm test`
- Run tests with coverage: `npm run test:coverage`
- Run specific test: `node --experimental-strip-types --test <test-file-path>`
- Run basic-runner: `npm run basic` (flags after `--`, e.g. `npm run basic -- --sync`)
- Run DSL runner: `npm run dsl example.dsl`
- Run with tracing: pass `--trace` to the runners

Notes:
- `src/web/` is excluded from the root tsconfig because it needs DOM lib types;
  it has its own `src/web/tsconfig.json`, and `npm run typecheck` checks both.
