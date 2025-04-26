# DEV-LOG

## 2025-04-25

### 6502 CPU Emulator Implementation - Phase 1

- Started implementing the 6502 CPU emulator following a test-driven development approach
- Created initial CPU state and memory model
- Implemented helper functions for memory access and stack operations
- Implemented status register flags and flag manipulation
- First set of instructions implemented:
  - Load/Store operations (LDA, LDX, LDY, STA, STX, STY)
  - Register transfers (TAX, TAY, TXA, TYA)
  - Stack operations (PHA, PHP, PLA, PLP)
- Added support for immediate and zero-page addressing modes
- Set up comprehensive tests for each instruction

### 6502 CPU Emulator Implementation - Phase 2

- Organized code with helper functions for all addressing modes
- Added arithmetic helper functions for ADC, SBC, and CMP operations
- Implemented all remaining addressing modes:
  - Zero Page,X and Zero Page,Y
  - Absolute, Absolute,X, and Absolute,Y
  - Indirect, Indirect X, and Indirect Y
- Implemented all remaining instructions:
  - Logical operations (AND, EOR, ORA, BIT)
  - Arithmetic operations (ADC, SBC, CMP, CPX, CPY)
  - Increment/Decrement operations (INC, INX, INY, DEC, DEX, DEY)
  - Shifts and rotates (ASL, LSR, ROL, ROR)
  - Jumps and Subroutines (JMP, JSR, RTS)
  - All branch instructions
  - Status flag instructions
  - NOP instruction
- Implemented proper cycle counting for all instructions
- Added special handling for the indirect JMP bug at page boundaries
- Added page boundary crossing detection for appropriate addressing modes
- Expanded test suite to cover all implemented instructions

### Notes on 6502 Design Decisions

- The 6502 has several quirks that were important to implement correctly:
  - Zero page wrap-around: When using indexed zero page addressing, if the address exceeds 0xFF, it wraps around within the zero page
  - Page boundary timing: Many instructions take an extra cycle when crossing a page boundary
  - Indirect JMP bug: When the indirect pointer address is at a page boundary (e.g., 0x02FF), the high byte is read from the beginning of the same page (0x0200) rather than the next page
  - Stack location: The stack is fixed at memory page 0x01 (0x0100-0x01FF)
  - Status flag behavior: B flag doesn't physically exist in the P register, but appears when pushed to the stack

### Future Improvements

- Implement the BRK and RTI instructions
- Add examples of running simple 6502 programs
- Improve debugging capabilities with memory dump and tracing functionality
- Add more tests to further increase test coverage
