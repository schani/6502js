# SyncCPU Implementation Summary

## Overview

SyncCPU (`src/core/sync-cpu.ts`) runs three independent 6502 implementations in lockstep, enabling us to detect differences between them. This approach provides multiple benefits:

1. Validates all implementations against each other
2. Identifies subtle implementation differences and edge cases
3. Ensures accurate 6502 behavior through cross-verification
4. Makes testing more robust against implementation bugs

## Architecture

- A shared async `CPU` interface (`src/core/cpu-interface.ts`) defines the contract: `step`, `reset`, `getState`, memory accessors, and register mutators. `CPUState` covers the registers A, X, Y, SP, P, and PC.
- Three implementations of the interface:
  - **CPU1** (`src/core/cpu1.ts`) — the original, readability-focused implementation
  - **CPU2** (`src/core/cpu2.ts`) — an independent implementation with different internal organization
  - **PGCPU** (`src/core/pgcpu.ts`) — the 6502 implemented as PostgreSQL stored procedures running on PGlite; CPU state and memory are database tables, and `step` is a SQL function call
- **SyncCPU** wraps all three. Every mutating interface call is applied to all CPUs; reads are served from CPU1. After each `step`, it compares the full register state of all three CPUs and throws a descriptive error (e.g. `CPU1/PGCPU divergence: SP 250 != 248`) on any mismatch.

## Current Status

- All 268 tests pass (`npm test`)
- MS-BASIC (OSI build) boots and runs programs in `--sync` mode with no divergences between the three implementations
- Cycle counting was removed from the project — comparison covers register state only

## History

The dual-implementation approach (originally just CPU1 vs. CPU2) surfaced real bugs that the test suite alone had missed, including:

- **JSR/RTS differences** in how the program counter was pushed and restored
- **Memory boundary handling** bugs in word writes at 0xFFFF
- **Missing opcodes** in CPU2 (several ORA/AND/EOR addressing modes)
- **Trap address errors** in the BASIC runner host glue, which were the final blocker to running BASIC

See `DEV-LOG.md` for the detailed history.

## Benefits of Multiple Implementations

Having independent parallel implementations provides significant advantages:

- Acts as a cross-verification mechanism
- Reveals subtle bugs and edge cases
- Provides confidence in the correctness of the emulation
- Follows the principle that "two implementations are better than one test suite" — and three are better still, especially when one of them is written in an entirely different paradigm (SQL)

Whenever the implementations diverge, the 6502 specification in `6502.md` is the arbiter of which one is correct. See [README-SYNC-CPU.md](README-SYNC-CPU.md) for the debugging workflow.
