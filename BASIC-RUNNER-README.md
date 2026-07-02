# MS-BASIC Runner for 6502-js

This is a minimal host implementation to run Microsoft BASIC (OSI 6502 BASIC 1.0 REV 3.2, `data/osi.bin`) using the 6502-js emulator.

## Usage

```bash
# Run with CPU1 implementation (default)
npm run basic
npm run basic -- --cpu1

# Run with CPU2 implementation
npm run basic -- --cpu2

# Run with PGCPU implementation (PostgreSQL-based)
npm run basic -- --pgcpu

# Run with SyncCPU (runs CPU1, CPU2, and PGCPU in lockstep)
npm run basic -- --sync

# Run with SyncCPU in debug mode (logs divergences to cpu-divergence.log)
npm run basic -- --debug

# Run with tracing enabled (shows each instruction)
npm run basic -- --trace
```

At startup BASIC asks `MEMORY SIZE?` (e.g. `16384`) and `TERMINAL WIDTH?` (e.g. `80`), then drops you at the `OK` prompt. Exit with Ctrl-C.

### Command Line Options

- `--cpu1`: Use CPU1 implementation (default if none specified)
- `--cpu2`: Use CPU2 implementation
- `--pgcpu`: Use PGCPU implementation (6502 in PostgreSQL stored procedures via PGlite)
- `--sync`: Use SyncCPU implementation (runs all three CPUs in lockstep)
- `--debug`: Enable debug mode with divergence logging (implies `--sync`)
- `--trace`: Enable instruction tracing (shows each instruction as it executes)

## Description

The BASIC runner loads `data/osi.bin` at memory address $A000 and provides minimal host services via emulated monitor vectors. This build of MS-BASIC expects the host to provide routines for character input/output and other system functions.

## Debug and SyncCPU Modes

The `--sync` flag runs CPU1, CPU2, and PGCPU in lockstep to ensure they behave identically. When a divergence is detected, the program immediately exits with an error message, as divergences indicate bugs that must be fixed.

The debug mode (`--debug` flag) additionally logs divergences to `cpu-divergence.log` with per-opcode statistics.

This helps identify implementation differences that might not be caught by the standard test suite, as BASIC exercises the CPU in different ways than our unit tests.

As of now, BASIC boots and runs programs in `--sync` mode without any divergence between the three implementations.

## Prerequisites

- Node.js (version in `.nvmrc`); run `npm install` first
- `data/osi.bin` (OSI BASIC ROM image, included in the repository)

## Implementation Details

- Loads `data/osi.bin` at $A000 and starts at the cold-start entry ($BD11)
- Runs the CPU until the PC reaches a monitor vector address (MONRDKEY $FFEB, MONCOUT $FFEE, and stubs for ISCNTC/LOAD/SAVE)
- Handles I/O by intercepting calls to MONRDKEY and MONCOUT
- Emulates RTS by manually popping the return address from the stack
- Converts LF to CR on input, as expected by MS-BASIC

This allows MS-BASIC to run in a minimal host environment without needing to implement a full monitor ROM or hardware.

## Scripted Sessions

For reproducible, scripted BASIC sessions (useful when debugging), use the DSL runner:

```bash
npm run dsl example.dsl
```

The DSL supports `input <text>` (queue keystrokes, `\n` for Enter), `wait` (run until BASIC requests input), and `trace on|off`. It accepts the same `--cpu1|--cpu2|--pgcpu|--sync` flags.
