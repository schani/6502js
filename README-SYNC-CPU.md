# Debug Guide: Finding and Fixing CPU Implementation Divergences

This guide explains how to use SyncCPU to identify and fix divergences between the CPU implementations (CPU1, CPU2, and PGCPU).

## Understanding the Problem

All three CPUs are supposed to implement the 6502 processor according to the same specification in [6502.md](6502.md). Any difference in behavior between the implementations indicates that at least one of them isn't correctly implementing the specification — divergences are **bugs** that need to be fixed.

**Current status:** MS-BASIC boots and runs programs in `--sync` mode with no divergences. This guide remains the playbook for when new divergences appear (e.g. after adding features or a new CPU implementation).

## How to Debug CPU Divergences

The BASIC runner has a debug mode that helps identify implementation differences:

```bash
npm run basic -- --debug
```

When run in debug mode, it:

1. Uses SyncCPU, which runs CPU1, CPU2, and PGCPU in lockstep
2. Compares the register state (A, X, Y, SP, P, PC) of all three CPUs after every instruction
3. Exits immediately with a detailed error message on any divergence
4. Logs divergences to `cpu-divergence.log`

Plain `--sync` behaves the same but without the log file.

For reproducible test cases, script a BASIC session with the DSL runner:

```bash
npm run dsl example.dsl -- --sync
```

## Analyzing Divergences

A divergence error names the two CPUs that disagree and the register that differs, e.g.:

```
CPU1/PGCPU divergence: SP 250 != 248
```

### Common Divergence Types

1. **Stack Pointer Differences**: Often related to JSR/RTS or push/pull implementation
2. **Memory State Differences**: Can indicate missing/incorrect memory operations
3. **Register Value Differences**: Can indicate incorrect operation implementation
4. **PC Differences**: Wrong instruction length, branch offset, or jump target handling

## Fixing Divergences

For each divergence:

1. Disassemble or trace to find the opcode being executed (use `--trace`)
2. Look up the opcode in the [6502.md](6502.md) specification
3. Determine the correct behavior according to the spec
4. Examine the diverging implementations
5. Update the incorrect implementation to match the spec

### Example Workflow

1. See a divergence: `CPU1/CPU2 divergence: SP 250 != 248` after opcode 0x2A
2. Look up opcode 0x2A in the spec: It's `ROL A` (Rotate Accumulator Left)
3. Check the spec: ROL A should not touch the stack pointer at all
4. Compare the implementations to find out which one is incorrectly modifying the stack pointer
5. Fix the incorrect implementation

## Creating a Fix

When you've identified a divergence and determined the correct behavior:

1. Fix the incorrect CPU implementation
2. Add a test case that specifically verifies this behavior
3. Document what you fixed in `DEV-LOG.md`
4. Run the full test suite (`npm test`) to make sure you didn't break anything else
5. Re-run BASIC in sync mode (`npm run basic -- --sync`) and verify the divergence is gone

Remember: there should be NO behavioral differences between the implementations. The goal is for all three CPUs to behave identically according to the 6502 specification.
