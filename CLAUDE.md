# CLAUDE.md

We've implemented two 6502 emulators, and we're trying to run MS-BASIC on them.
Both of them seem to be somewhat buggy.  We have a `SyncCPU` abstraction that runs
both of them, and reports any difference between them, which is how we're hoping
to find the issue.  Whenever there is a divergence, we must consult the spec in
`6502.md` and carefully determine which of the two (if any) implementations are
correct.

## Guidelines

- Write tests first, then implement the code to make them pass. You must always have 100% code coverage!
- Always put tasks to do in `TODO.md`, and check them off once done
- If you learn anything interesting, or went down a wrong path that you don't want to repeat, write it down in `DEV-LOG.md`

## Build/Test Commands
- Build/typecheck: `bun run typecheck`
- Run tests: `bun test --coverage`
- Run specific test: `bun test <test-file-name>`
- Run with tracing: Set `trace=true` in CPU step function
