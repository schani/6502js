# 6502-js

This is an emulator of the MOS 6502 CPU. It only implements the official, documented instruction set.

The specification of the instruction set is in the file [6502.md](6502.md).

## Running Tests

The test suite is organized by instruction categories in the `tests/` directory to improve maintainability. To run all tests:

```bash
bun test
```

To run a specific test category:

```bash
bun test tests/arithmetic.test.ts
```

## Development

Please see the [TODO.md](TODO.md) file for planned features and the [DEV-LOG.md](DEV-LOG.md) for development history.