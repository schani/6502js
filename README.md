# 6502-js

This is an emulator of the MOS 6502 CPU. It only implements the official, documented instruction set.

The specification of the instruction set is in the file [6502.md](6502.md).

## Features

- Complete implementation of all documented 6502 instructions
- Detailed trace functionality for debugging
- Memory and addressing mode support for the entire 64K address space
- Three independent CPU implementations for cross-validation
- SyncCPU mode that runs all implementations in lockstep for verification
- Async, TypeScript interface-based design (`CPU` in `src/core/cpu-interface.ts`)
- Runs Microsoft BASIC (OSI 6502 BASIC 1.0 REV 3.2)
- Disassembler, a line-based DSL runner for scripted BASIC sessions, and a web-based debugger

## CPU Implementations

This project features three separate CPU implementations, all implementing the shared async `CPU` interface:

1. **CPU1** (`src/core/cpu1.ts`): The original implementation with a focus on readability and correctness
2. **CPU2** (`src/core/cpu2.ts`): An alternative implementation with different internal organization
3. **PGCPU** (`src/core/pgcpu.ts`): A 6502 implemented in PostgreSQL stored procedures, running on [PGlite](https://pglite.dev/) — CPU state and memory live in database tables

The **SyncCPU** wrapper (`src/core/sync-cpu.ts`) runs all three implementations in lockstep, comparing their register state after every instruction and throwing on any divergence. This cross-validation approach helps catch subtle bugs and edge cases that might not be detected by tests alone.

See [SYNC-CPU-SUMMARY.md](SYNC-CPU-SUMMARY.md) for details on the multi-CPU architecture.

## Project Structure

- `src/core/` — CPU interface, the three CPU implementations, SyncCPU, status flag constants
- `src/runners/` — `basic-runner.ts` (interactive MS-BASIC) and `dsl-runner.ts` (scripted BASIC sessions, see `example.dsl`)
- `src/tests/` — the test suite
- `src/utils/` — disassembler and legacy re-exports
- `src/web/` — browser-based debugger UI
- `data/` — BASIC ROM images (`osi.bin`, `kb9.bin`)

## Running MS-BASIC

```bash
npm run basic                  # CPU1 (default)
npm run basic -- --cpu2        # CPU2
npm run basic -- --pgcpu       # PostgreSQL-based CPU
npm run basic -- --sync        # all three in lockstep, exits on divergence
```

See [BASIC-RUNNER-README.md](BASIC-RUNNER-README.md) for details.

## Running Tests

The project uses Node (see `.nvmrc`) with the built-in test runner and `--experimental-strip-types`.

```bash
npm test                       # all tests
npm run test:coverage          # with coverage
npm run typecheck              # TypeScript type checking
```

To run a specific test file:

```bash
node --experimental-strip-types --test src/tests/arithmetic.test.ts
```

## Development

Please see the [TODO.md](TODO.md) file for planned features and the [DEV-LOG.md](DEV-LOG.md) for development history.
