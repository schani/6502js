# MS-BASIC Runner for 6502-js

This is a minimal host implementation to run Microsoft BASIC (KIM-1 kb9.bin build) using the 6502-js emulator.

## Usage

```bash
# Run with CPU1 implementation (standard mode)
bun run basic-runner.ts

# Run with SyncCPU for CPU implementation divergence detection
bun run basic-runner.ts --debug

# Run with tracing enabled (shows each instruction)
bun run basic-runner.ts --trace
```

## Description

The BASIC runner loads kb9.bin at memory address $2000 and provides minimal host services via emulated monitor vectors. The KIM-1 version of MS-BASIC expects the host to provide routines for character input/output and other system functions.

## Debug Mode

The debug mode (`--debug` flag) is designed to help identify differences between CPU1 and CPU2 implementations by:

1. Using SyncCPU to run both implementations in parallel
2. Logging divergences to `cpu-divergence.log` 
3. Continuing execution using CPU1's state when divergences are detected
4. Periodically reporting statistics on the most common divergences

This helps detect implementation differences that might not be caught by the standard test suite, as BASIC exercises the CPU in different ways.

## Known Issues

Currently there are several implementation discrepancies between CPU1 and CPU2:

1. Stack pointer handling divergence (most stack operations)
2. Cycle count differences for various opcodes (ROL A, PHA, PLA)
3. Accumulator value differences for certain operations
4. Both CPUs are missing implementations for some opcodes (like 0x63)

These issues are documented in the `DEV-LOG.md` file and are being tracked in `TODO.md`.

## Prerequisites

- Requires kb9.bin (8 KB image built with CONFIG_KIM) in the repository root
- Requires Bun runtime environment

## Implementation Details

- Loads kb9.bin at $2000 (KIM-1 memory layout)
- Writes small stubs (RTS or CLC;RTS) for required monitor vectors
- Runs the CPU until it reaches a monitor vector
- Handles I/O by intercepting calls to MONRDKEY and MONCOUT
- Emulates RTS by manually popping the return address from the stack

This allows MS-BASIC to run in a minimal host environment without needing to implement the full KIM-1 monitor or hardware.