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

- [ ] Potential future improvements:
  - [ ] Implement BRK and RTI instructions (system functions)
  - [ ] Add more examples of running simple 6502 programs
  - [x] Improve debugging with memory dump and trace functionality