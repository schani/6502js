# Repository Guidelines

## Project Structure & Modules
- `*.ts` (root): Core source. Notables: `6502.ts` (exports types/utilities), `cpu1.ts`/`cpu2.ts` (two implementations), `sync-cpu.ts` (lockstep validator), `disasm.ts` (disassembler), `basic-runner.ts` (MS‑BASIC runner).
- `tests/`: Comprehensive 6502 behavior tests. Some legacy tests also live at repo root (e.g., `disasm.test.ts`).
- Docs/assets: `README.md`, `SYNC-CPU-SUMMARY.md`, `6502.md`, ROMs like `kb9.bin`, `osi.bin`.

## Build, Test, and Development
- Type check: `bunx tsc --noEmit` (or `bun run typecheck`).
- Run tests: `bun test` (all) or `bun test tests/arithmetic.test.ts` (single file). Add `--coverage` for coverage.
- Run BASIC demo: `bun run basic-runner.ts`.
- Tooling: Bun + TypeScript (ESNext). See `tsconfig.json` for strict flags.

## Coding Style & Naming
- TypeScript, ESNext modules, strict mode. Prefer explicit types at public boundaries.
- Indentation: 2 spaces; keep lines focused and readable.
- Files: kebab-case for modules (`disasm.ts`), `PascalCase` for classes (`CPU1`, `CPU2`, `SyncCPU`).
- Tests: name `*.test.ts`; colocate in `tests/` unless touching root-only modules.

## Testing Guidelines
- Framework: Bun test runner (`bun test`).
- Write deterministic, minimal tests; cover new addressing modes/flags and cycle counts.
- When changing CPU behavior, add parallel tests for both implementations and, if relevant, a `SyncCPU` check.
- Aim to keep coverage high; use `--coverage` locally before PRs.

## Commit & Pull Request Guidelines
- Commits: short, imperative, scoped when helpful (e.g., "Fix missing opcodes in CPU2").
- PRs must include: what/why, affected opcodes/modes, added tests, and any trace snippets when debugging CPU divergence.
- Checklist: `bunx tsc --noEmit` passes; `bun test` is green; no large binaries or secrets added; docs updated when behavior changes.

## Architecture Overview
- Two CPU implementations (`CPU1`, `CPU2`) validated by `SyncCPU` running both in lockstep and comparing state each step. Prefer fixes that keep both consistent or document divergences with tests and rationale.
