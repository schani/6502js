# Repository Guidelines

## Project Structure & Modules
- `src/core/`: `cpu-interface.ts` (shared async `CPU` interface), `cpu1.ts`/`cpu2.ts` (two TypeScript implementations), `pgcpu.ts` (PostgreSQL/PGlite implementation), `sync-cpu.ts` (lockstep validator), `constants.ts` (status flag bits).
- `src/runners/`: `basic-runner.ts` (interactive MS-BASIC), `dsl-runner.ts` (scripted BASIC sessions, see `example.dsl`).
- `src/tests/`: Comprehensive 6502 behavior tests plus shared `utils.ts`/`compat.ts`.
- `src/utils/`: `disasm.ts` (disassembler), `6502.ts` (legacy re-exports).
- `src/web/`: Browser-based debugger UI.
- Docs/assets: `README.md`, `SYNC-CPU-SUMMARY.md`, `README-SYNC-CPU.md`, `BASIC-RUNNER-README.md`, `6502.md` (the instruction-set spec), ROMs in `data/` (`osi.bin`, `kb9.bin`).

## Build, Test, and Development
- Runtime: Node (version in `.nvmrc`) with `--experimental-strip-types`; run `npm install` first.
- Type check: `npm run typecheck`.
- Run tests: `npm test` (all) or `node --experimental-strip-types --test src/tests/arithmetic.test.ts` (single file). Coverage: `npm run test:coverage`.
- Run BASIC demo: `npm run basic` (flags: `--cpu1|--cpu2|--pgcpu|--sync|--debug|--trace`).
- Run DSL script: `npm run dsl example.dsl`.

## Coding Style & Naming
- TypeScript, ESNext modules, strict mode. Prefer explicit types at public boundaries.
- Import with explicit `.ts` extensions (required for `--experimental-strip-types`).
- Files: kebab-case for modules (`sync-cpu.ts`), `PascalCase` for classes (`CPU1`, `CPU2`, `PGCPU`, `SyncCPU`).
- Tests: name `*.test.ts`; place in `src/tests/`.

## Testing Guidelines
- Framework: Node's built-in test runner (`node --test`).
- Write deterministic, minimal tests; cover new addressing modes and flag behavior.
- When changing CPU behavior, keep all implementations consistent and, if relevant, add a `SyncCPU` check.
- Aim to keep coverage high; use `npm run test:coverage` locally before PRs.

## Commit & Pull Request Guidelines
- Commits: short, imperative, scoped when helpful (e.g., "Fix missing opcodes in CPU2").
- PRs must include: what/why, affected opcodes/modes, added tests, and any trace snippets when debugging CPU divergence.
- Checklist: `npm run typecheck` passes; `npm test` is green; no large binaries or secrets added; docs updated when behavior changes.

## Architecture Overview
- Three CPU implementations (`CPU1`, `CPU2`, `PGCPU`) validated by `SyncCPU`, which runs all of them in lockstep and compares register state after each step. Divergences are bugs: consult the spec in `6502.md` to determine which implementation is correct, and fix it.
