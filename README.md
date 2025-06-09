# 6502-js

This is an emulator of the MOS 6502 CPU. It only implements the official, documented instruction set.

The specification of the instruction set is in the file [6502.md](6502.md).

## Features

- Complete implementation of all documented 6502 instructions
- Accurate cycle counting for each instruction
- Detailed trace functionality for debugging
- Memory and addressing mode support for the entire 64K address space
- Dual CPU implementations for cross-validation (CPU1 and CPU2)
- SyncCPU mode that runs both implementations in parallel for verification
- TypeScript interface-based design for extensibility

## CPU Implementations

This project features two separate CPU implementations:

1. **CPU1**: The original implementation with a focus on readability and correctness
2. **CPU2**: An alternative implementation with different internal organization

The **SyncCPU** wrapper runs both implementations in parallel, comparing their states after each instruction to ensure identical behavior. This dual-implementation approach helps catch subtle bugs and edge cases that might not be detected by tests alone.

See [SYNC-CPU-SUMMARY.md](SYNC-CPU-SUMMARY.md) for details on the dual-CPU architecture.

## Running MS-BASIC

```bash
bun run basic-runner.ts
```

## Running Tests

The test suite is organized by instruction categories in the `tests/` directory to improve maintainability. To run all tests:

```bash
bun test
```

To run a specific test category:

```bash
bun test tests/arithmetic.test.ts
```

To run tests with coverage information:

```bash
bun test --coverage
```

## Development

Please see the [TODO.md](TODO.md) file for planned features and the [DEV-LOG.md](DEV-LOG.md) for development history.
