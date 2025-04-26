# CLAUDE.md

Your task is to implement a 6502 CPU emulator.  Please refer to the `README.md` for more information.

## Guidelines

- Write tests first, then implement the code to make them pass. You must always have 100% code coverage!
- Always put tasks to do in `TODO.md`, and check them off once done
- If you learn anything interesting, or went down a wrong path that you don't want to repeat, write it down in `DEV-LOG.md`

## Build/Test Commands
- Build/typecheck: `bun run typecheck`
- Run tests: `bun test --coverage`
- Run specific test: `bun test <test-file-name>`
- Run with tracing: Set `trace=true` in CPU step function
