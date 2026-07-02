# TODO

- [x] Test and implement all documented 6502 instructions
  - [x] Implement CPU state and initialization
  - [x] Implement fetch-decode-execute cycle
  - [x] Implement addressing modes
    - [x] Immediate
    - [x] Zero Page
    - [x] Zero Page,X
    - [x] Zero Page,Y
    - [x] Absolute
    - [x] Absolute,X
    - [x] Absolute,Y
    - [x] Indirect
    - [x] Indexed Indirect (X,Indirect)
    - [x] Indirect Indexed (Indirect,Y)
  - [x] Implement status register flags
  - [x] Implement groups of instructions:
    - [x] Load/Store operations (LDA, LDX, LDY, STA, STX, STY)
    - [x] Register transfers (TAX, TAY, TXA, TYA, TSX, TXS)
    - [x] Stack operations (PHA, PHP, PLA, PLP)
    - [x] Logical operations (AND, EOR, ORA, BIT)
    - [x] Arithmetic operations (ADC, SBC, CMP, CPX, CPY)
    - [x] Increments/Decrements (INC, INX, INY, DEC, DEX, DEY)
    - [x] Shifts (ASL, LSR, ROL, ROR)
    - [x] Jumps and calls (JMP, JSR, RTS)
    - [x] Branches (BCC, BCS, BEQ, BMI, BNE, BPL, BVC, BVS)
    - [x] Status flag changes (CLC, CLD, CLI, CLV, SEC, SED, SEI)
    - [x] System functions (NOP)
  - [x] Add cycle counting for accurate timing

- [x] Fix JSR and RTS implementation
  - [x] Fix JSR to push PC-1 onto the stack
  - [x] Fix RTS to add 2 to the value pulled from the stack

- [x] Improve test coverage
  - [x] Add tests for logical operations in all addressing modes
  - [x] Add tests for shift and rotate operations in memory
  - [x] Add tests for compare operations in all addressing modes
  - [x] Add tests for different edge cases

- [x] Implement disassembler
  - [x] Support for all 6502 addressing modes
  - [x] Handle all supported instructions
  - [x] Format branch targets as addresses
  - [x] Good test coverage

- [x] Missing instructions to implement:
  - [x] System functions:
    - [x] BRK ($00) - Force interrupt (pushes PC+2 and status to the stack)
    - [x] RTI ($40) - Return from interrupt (pulls status and PC from stack)

- [x] Refactor test suite
  - [x] Split the large test file into multiple smaller files
  - [x] Create shared utilities for test functions
  - [x] Organize tests by instruction type
  - [x] Improve test coverage to over 95%
  - [x] Push test coverage to 100% (achieved!)

- [x] Fix branch instruction tests
  - [x] Correct PC calculation for branch instructions
  - [x] Update expected values in tests
  - [x] Ensure all branch tests correctly verify CPU behavior
  - [x] Achieve high test coverage (98.61% functions, 99.19% lines)

- [x] Refactor to use CPU interface
  - [x] Make CPU implementations (cpu1.ts, cpu2.ts) implement the interface
  - [x] Update ldy-completion.test.ts to use CPU interface
  - [x] Migrate test files using direct state access to use CPU interface
    - [x] Update utils.ts to support the CPU interface
    - [x] Convert tests using step6502 to use CPU interface methods
      - [x] system-instructions.test.ts
      - [x] edge-cases.test.ts
      - [x] missing-opcodes.test.ts
      - [x] final-extreme-edge-cases.test.ts
      - [x] final-ror-test.test.ts
      - [x] all-shift-ops.test.ts
      - [x] shift-edge-cases.test.ts
      - [x] extreme-edge-cases.test.ts
      - [x] absolute-indexed-instructions.test.ts
      - [x] final-coverage.test.ts
      - [x] achieve-100-percent.test.ts
      - [x] final-100-percent.test.ts
      - [x] ldx-absolute-y.test.ts
      - [x] remaining-coverage-branches.test.ts
      - [x] zero-page-wrap.test.ts
      - [x] memory-helpers-100-percent.test.ts
      - [x] trace-functionality.test.ts
      - [x] ldy-maximum-coverage.test.ts
      - [x] ldy-immediate.test.ts
      - [x] ldy-complete.test.ts
      - [x] instruction-cycle-coverage.test.ts
      - [x] branch-ultimate.test.ts
      - [x] branch-max-coverage.test.ts
      - [x] bit-instruction.test.ts
      - [x] store-instructions.test.ts
      - [x] status-flags.test.ts
      - [x] stack-operations.test.ts
      - [x] shift-rotate.test.ts
      - [x] register-transfer.test.ts
      - [x] memory-helpers.test.ts
      - [x] logical.test.ts
      - [x] load-instructions.test.ts
      - [x] ldy-addressing.test.ts
      - [x] jump-subroutine.test.ts
      - [x] internal-helpers.test.ts
      - [x] indirect-addressing.test.ts
      - [x] inc-dec.test.ts
      - [x] inc-dec-all-modes.test.ts
      - [x] full-coverage.test.ts
      - [x] branch.test.ts
      - [x] branch-comprehensive.test.ts
      - [x] arithmetic.test.ts
      - [x] addressing-modes.test.ts
      - [x] adc-sbc-addressing.test.ts

- [x] Create SyncCPU implementation
  - [x] Create basic implementation that wraps CPU1 and CPU2
  - [x] Fix discrepancies between CPU1 and CPU2 according to 6502 specification
  - [x] Add detailed error reporting for CPU state differences
  
- [x] Fix remaining differences between CPU1 and CPU2
  - [x] Extract CPU interface to separate file (cpu-interface.ts)
  - [x] Fix JSR/RTS implementation differences (handled with special warning messages)
  - [x] Fix memory boundary handling in writeWord
  - [x] Implement missing logical operations in CPU2:
    - [x] ORA immediate (0x09)
    - [x] AND absolute (0x2D) 
    - [x] EOR immediate (0x49)
    - [x] EOR absolute (0x4D)
  - [x] Handle cycle counting differences for indexed addressing with page boundary crossing

- [x] CPU synchronization (resolved — BASIC runs in --sync mode with no divergences)
  - [x] Harmonize JSR/RTS implementation between CPU1 and CPU2
  - [x] Fix the program counter differences after RTS operation
  - [x] Fix the trap addresses in the BASIC runner (this finally fixed BASIC)
  - Note: opcode 0x63 is undocumented; the project only implements the documented
    instruction set, so it will not be implemented
  - Note: cycle counting was removed from the project, so all cycle-count
    discrepancy tasks are obsolete

- [x] Add PGCPU (6502 in PostgreSQL stored procedures via PGlite)
  - [x] Support PGCPU in SyncCPU (all three CPUs run in lockstep)
  - [x] Support PGCPU in the BASIC runner (--pgcpu flag)

- [ ] Fix typecheck errors in src/web/ and re-include it in the root typecheck
      (currently excluded via tsconfig.json "exclude")
  - [ ] Port src/web/serve.ts from Bun.serve to Node (npm run web:serve currently requires Bun)
  - [ ] Fix missing DOM/browser types in src/web/main.ts (requestAnimationFrame etc.)

- [ ] Code cleanup from 2026-07-02 review (repetition/inconsistency audit)
  - [x] Delete dead files: `src/utils/6502.ts`, `src/core/cpu.ts`, `src/tests/compat.ts`
  - [x] Remove legacy synchronous getters if unused (CPU1/CPU2/SyncCPU)
  - [x] cpu1.ts: remove dead `cycles` plumbing (cycle counting was removed)
  - [x] pgcpu.ts: remove dead page-cross (`crossed`/`oldpc`) remnants
  - [x] cpu2.ts: remove 9 unreachable duplicate `case` labels
  - [x] cpu2.ts: dedupe `shiftMem2` into `shiftMemOp`; move NOP into the switch; drop IIFE handlers
  - [x] cpu2.ts: use shared flag constants from `constants.ts` instead of local `F`
  - [ ] cpu2.ts: factor a `compare()` helper for CMP/CPX/CPY
  - [ ] cpu1.ts/cpu2.ts: factor a shared branch helper for the 8 branch opcodes
  - [ ] sync-cpu.ts: loop over CPUs for fan-out and over register fields in compareStates
  - [ ] Extract shared BASIC harness (ROM load, reset, pop16, trap dispatch) used by
        basic-runner and dsl-runner; fix dsl-runner/web trap addresses (ROM calls
        $FFF1 for ISCNTC, not $FFB7 — verified by disassembling osi.bin); drop
        dsl-runner's import from src/tests; remove push16/unused imports/stale
        Bun and KIM-1 comments
  - [ ] web/main.ts: shared trap constants, fix missing awaits (disassemble, readByte), ROM path
  - [ ] Tests: consolidate LDY cluster (5 files → 1; remove weakened assertion)
  - [ ] Tests: consolidate branch cluster (4 files + stragglers → 1)
  - [ ] Tests: consolidate shift cluster (+ final-ror-test)
  - [ ] Tests: merge unknown-opcodes/trace-functionality into system tests
  - [ ] Tests: fold unique cases out of the coverage-push grab-bag files, then delete them
  - [ ] pgcpu.ts: add `set_zn` (and ADC/SBC/CMP flag) SQL helpers to kill ~60x repetition

- [ ] Potential future improvements:
  - [ ] Add more examples of running simple 6502 programs
  - [x] Improve debugging with memory dump and trace functionality
  - [x] Add proper SIGINT (Ctrl-C) handling to basic-runner.ts
  - [x] Add a memory visualization feature (web debugger in src/web/)
  - [ ] Consider implementing decimal mode for ADC and SBC
