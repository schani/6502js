# Debug Guide: Finding and Fixing CPU Implementation Divergences

This guide explains how to use the SyncCPU debugging mode to identify and fix divergences between CPU1 and CPU2 implementations.

## Understanding the Problem

Both CPU1 and CPU2 are supposed to implement the 6502 processor according to the same specification in [6502.md](6502.md). However, there are currently implementation differences that cause them to behave differently for certain opcodes and scenarios.

These divergences are **bugs** that need to be fixed. Any differences in behavior between the two implementations indicate that at least one of them isn't correctly implementing the 6502 specification.

## How to Debug CPU Divergences

The BASIC runner has been enhanced with a special debug mode that helps identify implementation differences:

```
bun run basic-runner.ts --debug
```

When run in debug mode, it:

1. Uses SyncCPU which runs both CPU1 and CPU2 in parallel
2. Logs all divergences to `cpu-divergence.log`
3. Periodically outputs summaries of the most frequent divergences
4. Continues execution using CPU1's state when divergences occur

## Analyzing Divergences

For each divergence detected, the log will show:
- The opcode that triggered the divergence
- The specific difference (register values, memory state, cycle counts)
- The number of times this divergence has occurred

### Common Divergence Types

1. **Stack Pointer Differences**: Often related to JSR/RTS implementation
2. **Cycle Count Differences**: Often related to page boundary crossing logic
3. **Memory State Differences**: Can indicate missing/incorrect memory operations
4. **Register Value Differences**: Can indicate incorrect operation implementation

## Fixing Divergences

For each divergence:

1. Look up the opcode in the [6502.md](6502.md) specification
2. Determine the correct behavior according to the spec
3. Examine both CPU1 and CPU2 implementations
4. Update the incorrect implementation to match the spec

### Example Workflow

1. Find a divergence in the log: `Opcode 0x2A: Stack pointer (CPU1=0xfa, CPU2=0xf8)`
2. Look up opcode 0x2A in the spec: It's `ROL A` (Rotate Accumulator Left)
3. Check the spec for details on how ROL A should affect the stack pointer (it shouldn't!)
4. Compare the implementations in both CPUs to find out which one is incorrectly modifying the stack pointer
5. Fix the incorrect implementation

## Prioritizing Fixes

Focus on fixing opcodes with:
1. High frequency in the divergence log
2. Critical operations like JSR/RTS that affect program flow
3. Simple, well-defined behavior in the spec

## Expected Outcome

After fixing implementation divergences:
- The SyncCPU should be able to run BASIC without any divergences
- All tests should pass with 100% coverage
- Both CPU implementations should be verified against each other

## Testing Your Fixes

After fixing a divergence:

1. Run the test suite: `bun test --coverage`
2. Run BASIC in debug mode: `bun run basic-runner.ts --debug`
3. Verify the specific divergence you fixed is no longer occurring

Remember: There should be NO implementation differences between CPU1 and CPU2. Any differences indicate bugs that must be fixed.

## Common Specification References

Here are some of the most important parts of the 6502 specification to refer to:

1. **Stack Operations** (pp. 272-275): Details on PHA, PHP, PLA, PLP, JSR, and RTS
2. **Addressing Modes** (pp. 401-446): Explains all addressing modes and their behavior
3. **Cycle Counting** (pp. 687-1255): Details on cycle counts for each instruction
4. **Flag Behavior** (pp. 200-211): Explains how flags are set and cleared

## Creating a Fix

When you've identified a divergence and determined the correct behavior:

1. Create a fix in the incorrect CPU implementation
2. Add a test case that specifically verifies this behavior
3. Document what you fixed in the `DEV-LOG.md` file
4. Run the full test suite to make sure you didn't break anything else

Remember that the goal is to have both CPU1 and CPU2 behave identically according to the 6502 specification.