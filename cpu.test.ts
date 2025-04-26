import { describe, expect, it } from "bun:test";
import { type CPU, createCPU, step6502, CARRY, ZERO, INTERRUPT, DECIMAL, BREAK, UNUSED, OVERFLOW, NEGATIVE } from "./cpu";

describe("6502 CPU", () => {
  it("should initialize with default values", () => {
    const cpu = createCPU();
    expect(cpu.a).toBe(0);
    expect(cpu.x).toBe(0);
    expect(cpu.y).toBe(0);
    expect(cpu.sp).toBe(0xFD); // Initial stack pointer value
    expect(cpu.p).toBe(0x24);  // Interrupt and unused flag set
    expect(cpu.pc).toBe(0);
    expect(cpu.mem.length).toBe(65536); // 64KB memory
  });

  it("should properly set status flags", () => {
    const cpu = createCPU();
    
    // Test individual flag setting
    cpu.p = 0;
    cpu.p |= CARRY;
    expect(cpu.p & CARRY).toBe(CARRY);
    
    cpu.p = 0;
    cpu.p |= ZERO;
    expect(cpu.p & ZERO).toBe(ZERO);
    
    cpu.p = 0;
    cpu.p |= NEGATIVE;
    expect(cpu.p & NEGATIVE).toBe(NEGATIVE);
  });

  // Load instructions
  describe("Load instructions", () => {
    it("should perform LDA immediate instruction", () => {
      const cpu = createCPU();
      
      // LDA #$42 - Load accumulator with value 0x42
      cpu.mem[0] = 0xA9; // LDA immediate
      cpu.mem[1] = 0x42; // Value to load
  
      const cycles = step6502(cpu);
      
      expect(cpu.a).toBe(0x42);
      expect(cpu.pc).toBe(2);  // PC should advance by 2 bytes
      expect(cycles).toBe(2);  // LDA immediate takes 2 cycles
      expect(cpu.p & ZERO).toBe(0); // Zero flag should be clear
      expect(cpu.p & NEGATIVE).toBe(0); // Negative flag should be clear
      
      // Test zero flag
      cpu.pc = 0;
      cpu.mem[1] = 0x00;
      step6502(cpu);
      expect(cpu.a).toBe(0);
      expect(cpu.p & ZERO).toBe(ZERO); // Zero flag should be set
      
      // Test negative flag
      cpu.pc = 0;
      cpu.mem[1] = 0x80;
      step6502(cpu);
      expect(cpu.a).toBe(0x80);
      expect(cpu.p & NEGATIVE).toBe(NEGATIVE); // Negative flag should be set
    });
  
    it("should perform LDX immediate instruction", () => {
      const cpu = createCPU();
      
      // LDX #$42 - Load X register with value 0x42
      cpu.mem[0] = 0xA2; // LDX immediate
      cpu.mem[1] = 0x42; // Value to load
  
      const cycles = step6502(cpu);
      
      expect(cpu.x).toBe(0x42);
      expect(cpu.pc).toBe(2);
      expect(cycles).toBe(2);
      expect(cpu.p & ZERO).toBe(0);
      expect(cpu.p & NEGATIVE).toBe(0);
    });
  
    it("should perform LDY immediate instruction", () => {
      const cpu = createCPU();
      
      // LDY #$42 - Load Y register with value 0x42
      cpu.mem[0] = 0xA0; // LDY immediate
      cpu.mem[1] = 0x42; // Value to load
  
      const cycles = step6502(cpu);
      
      expect(cpu.y).toBe(0x42);
      expect(cpu.pc).toBe(2);
      expect(cycles).toBe(2);
      expect(cpu.p & ZERO).toBe(0);
      expect(cpu.p & NEGATIVE).toBe(0);
    });

    it("should perform LDA zero page instruction", () => {
      const cpu = createCPU();
      
      // Set up memory
      cpu.mem[0] = 0xA5; // LDA zero page
      cpu.mem[1] = 0x42; // Zero page address
      cpu.mem[0x42] = 0x37; // Value at zero page address
      
      const cycles = step6502(cpu);
      
      expect(cpu.a).toBe(0x37);
      expect(cpu.pc).toBe(2);
      expect(cycles).toBe(3);
    });

    it("should perform LDX zero page instruction", () => {
      const cpu = createCPU();
      
      // Set up memory
      cpu.mem[0] = 0xA6; // LDX zero page
      cpu.mem[1] = 0x42; // Zero page address
      cpu.mem[0x42] = 0x37; // Value at zero page address
      
      const cycles = step6502(cpu);
      
      expect(cpu.x).toBe(0x37);
      expect(cpu.pc).toBe(2);
      expect(cycles).toBe(3);
    });
    
    // Add tests for zero page,X and zero page,Y addressing
    it("should perform LDA zero page,X instruction", () => {
      const cpu = createCPU();
      
      // Set up CPU state
      cpu.x = 0x05;
      
      // Set up memory
      cpu.mem[0] = 0xB5; // LDA zero page,X
      cpu.mem[1] = 0x20; // Zero page address
      cpu.mem[0x25] = 0x42; // Value at (zero page address + X)
      
      const cycles = step6502(cpu);
      
      expect(cpu.a).toBe(0x42);
      expect(cpu.pc).toBe(2);
      expect(cycles).toBe(4);
    });
    
    it("should handle zero page,X wrap-around", () => {
      const cpu = createCPU();
      
      // Set up CPU state
      cpu.x = 0xFF;
      
      // Set up memory
      cpu.mem[0] = 0xB5; // LDA zero page,X
      cpu.mem[1] = 0x80; // Zero page address
      cpu.mem[0x7F] = 0x42; // Value at (0x80 + 0xFF) & 0xFF = 0x7F (wrap around)
      
      const cycles = step6502(cpu);
      
      expect(cpu.a).toBe(0x42);
      expect(cpu.pc).toBe(2);
      expect(cycles).toBe(4);
    });
    
    it("should perform LDX zero page,Y instruction", () => {
      const cpu = createCPU();
      
      // Set up CPU state
      cpu.y = 0x05;
      
      // Set up memory
      cpu.mem[0] = 0xB6; // LDX zero page,Y
      cpu.mem[1] = 0x20; // Zero page address
      cpu.mem[0x25] = 0x42; // Value at (zero page address + Y)
      
      const cycles = step6502(cpu);
      
      expect(cpu.x).toBe(0x42);
      expect(cpu.pc).toBe(2);
      expect(cycles).toBe(4);
    });
    
    // Tests for absolute addressing
    it("should perform LDA absolute instruction", () => {
      const cpu = createCPU();
      
      // Set up memory
      cpu.mem[0] = 0xAD; // LDA absolute
      cpu.mem[1] = 0x34; // Low byte of address
      cpu.mem[2] = 0x12; // High byte of address
      cpu.mem[0x1234] = 0x42; // Value at absolute address
      
      const cycles = step6502(cpu);
      
      expect(cpu.a).toBe(0x42);
      expect(cpu.pc).toBe(3);
      expect(cycles).toBe(4);
    });
    
    it("should perform LDA absolute,X instruction", () => {
      const cpu = createCPU();
      
      // Set up CPU state
      cpu.x = 0x05;
      
      // Set up memory
      cpu.mem[0] = 0xBD; // LDA absolute,X
      cpu.mem[1] = 0x34; // Low byte of address
      cpu.mem[2] = 0x12; // High byte of address
      cpu.mem[0x1239] = 0x42; // Value at (absolute address + X)
      
      const cycles = step6502(cpu);
      
      expect(cpu.a).toBe(0x42);
      expect(cpu.pc).toBe(3);
      expect(cycles).toBe(4);
    });
    
    it("should add cycle when crossing page boundary with absolute,X", () => {
      const cpu = createCPU();
      
      // Set up CPU state
      cpu.x = 0xFF;
      
      // Set up memory
      cpu.mem[0] = 0xBD; // LDA absolute,X
      cpu.mem[1] = 0x01; // Low byte of address
      cpu.mem[2] = 0x12; // High byte of address
      cpu.mem[0x1300] = 0x42; // Value at (0x1201 + 0xFF) = 0x1300 (page boundary crossed)
      
      const cycles = step6502(cpu);
      
      expect(cpu.a).toBe(0x42);
      expect(cpu.pc).toBe(3);
      expect(cycles).toBe(5); // Extra cycle for page boundary crossing
    });
    
    it("should perform LDA absolute,Y instruction", () => {
      const cpu = createCPU();
      
      // Set up CPU state
      cpu.y = 0x05;
      
      // Set up memory
      cpu.mem[0] = 0xB9; // LDA absolute,Y
      cpu.mem[1] = 0x34; // Low byte of address
      cpu.mem[2] = 0x12; // High byte of address
      cpu.mem[0x1239] = 0x42; // Value at (absolute address + Y)
      
      const cycles = step6502(cpu);
      
      expect(cpu.a).toBe(0x42);
      expect(cpu.pc).toBe(3);
      expect(cycles).toBe(4);
    });
  });

  // Store instructions
  describe("Store instructions", () => {
    it("should perform STA zero page instruction", () => {
      const cpu = createCPU();
      
      // Set up accumulator
      cpu.a = 0x42;
      
      // STA $30 - Store accumulator at zero page address 0x30
      cpu.mem[0] = 0x85; // STA zero page
      cpu.mem[1] = 0x30; // Zero page address
      
      const cycles = step6502(cpu);
      
      expect(cpu.mem[0x30]).toBe(0x42);
      expect(cpu.pc).toBe(2);
      expect(cycles).toBe(3);
    });
    
    it("should perform STX zero page instruction", () => {
      const cpu = createCPU();
      
      // Set up X register
      cpu.x = 0x42;
      
      // STX $30 - Store X register at zero page address 0x30
      cpu.mem[0] = 0x86; // STX zero page
      cpu.mem[1] = 0x30; // Zero page address
      
      const cycles = step6502(cpu);
      
      expect(cpu.mem[0x30]).toBe(0x42);
      expect(cpu.pc).toBe(2);
      expect(cycles).toBe(3);
    });
    
    it("should perform STY zero page instruction", () => {
      const cpu = createCPU();
      
      // Set up Y register
      cpu.y = 0x42;
      
      // STY $30 - Store Y register at zero page address 0x30
      cpu.mem[0] = 0x84; // STY zero page
      cpu.mem[1] = 0x30; // Zero page address
      
      const cycles = step6502(cpu);
      
      expect(cpu.mem[0x30]).toBe(0x42);
      expect(cpu.pc).toBe(2);
      expect(cycles).toBe(3);
    });
  });

  // Register transfer instructions
  describe("Register transfer instructions", () => {
    it("should perform TAX instruction", () => {
      const cpu = createCPU();
      
      // Set up accumulator
      cpu.a = 0x42;
      
      // TAX - Transfer accumulator to X
      cpu.mem[0] = 0xAA; // TAX
      
      const cycles = step6502(cpu);
      
      expect(cpu.x).toBe(0x42);
      expect(cpu.pc).toBe(1);
      expect(cycles).toBe(2);
      expect(cpu.p & ZERO).toBe(0);
      expect(cpu.p & NEGATIVE).toBe(0);
      
      // Test zero flag
      cpu.pc = 0;
      cpu.a = 0;
      step6502(cpu);
      expect(cpu.x).toBe(0);
      expect(cpu.p & ZERO).toBe(ZERO);
      
      // Test negative flag
      cpu.pc = 0;
      cpu.a = 0x80;
      step6502(cpu);
      expect(cpu.x).toBe(0x80);
      expect(cpu.p & NEGATIVE).toBe(NEGATIVE);
    });
    
    it("should perform TAY instruction", () => {
      const cpu = createCPU();
      
      // Set up accumulator
      cpu.a = 0x42;
      
      // TAY - Transfer accumulator to Y
      cpu.mem[0] = 0xA8; // TAY
      
      const cycles = step6502(cpu);
      
      expect(cpu.y).toBe(0x42);
      expect(cpu.pc).toBe(1);
      expect(cycles).toBe(2);
    });
    
    it("should perform TXA instruction", () => {
      const cpu = createCPU();
      
      // Set up X register
      cpu.x = 0x42;
      
      // TXA - Transfer X to accumulator
      cpu.mem[0] = 0x8A; // TXA
      
      const cycles = step6502(cpu);
      
      expect(cpu.a).toBe(0x42);
      expect(cpu.pc).toBe(1);
      expect(cycles).toBe(2);
    });
    
    it("should perform TYA instruction", () => {
      const cpu = createCPU();
      
      // Set up Y register
      cpu.y = 0x42;
      
      // TYA - Transfer Y to accumulator
      cpu.mem[0] = 0x98; // TYA
      
      const cycles = step6502(cpu);
      
      expect(cpu.a).toBe(0x42);
      expect(cpu.pc).toBe(1);
      expect(cycles).toBe(2);
    });
  });
  
  // Indirect addressing modes
  describe("Indirect addressing modes", () => {
    it("should perform LDA indirect,X instruction", () => {
      const cpu = createCPU();
      
      // Set up CPU state
      cpu.x = 0x04;
      
      // Set up memory
      cpu.mem[0] = 0xA1; // LDA (indirect,X)
      cpu.mem[1] = 0x20; // Zero page address
      
      // Effective address stored at (zero page + X) in little endian
      cpu.mem[0x24] = 0x74; // Low byte of effective address
      cpu.mem[0x25] = 0x20; // High byte of effective address
      
      // Value at effective address
      cpu.mem[0x2074] = 0x42;
      
      const cycles = step6502(cpu);
      
      expect(cpu.a).toBe(0x42);
      expect(cpu.pc).toBe(2);
      expect(cycles).toBe(6);
    });
    
    it("should perform LDA indirect,Y instruction", () => {
      const cpu = createCPU();
      
      // Set up CPU state
      cpu.y = 0x10;
      
      // Set up memory
      cpu.mem[0] = 0xB1; // LDA (indirect),Y
      cpu.mem[1] = 0x20; // Zero page address
      
      // Effective base address stored at zero page in little endian
      cpu.mem[0x20] = 0x74; // Low byte of base address
      cpu.mem[0x21] = 0x20; // High byte of base address
      
      // Value at (base address + Y)
      cpu.mem[0x2084] = 0x42; // 0x2074 + 0x10 = 0x2084
      
      const cycles = step6502(cpu);
      
      expect(cpu.a).toBe(0x42);
      expect(cpu.pc).toBe(2);
      expect(cycles).toBe(5);
    });
    
    it("should add cycle when crossing page boundary with indirect,Y", () => {
      const cpu = createCPU();
      
      // Set up CPU state
      cpu.y = 0xFF;
      
      // Set up memory
      cpu.mem[0] = 0xB1; // LDA (indirect),Y
      cpu.mem[1] = 0x20; // Zero page address
      
      // Effective base address stored at zero page in little endian
      cpu.mem[0x20] = 0x01; // Low byte of base address
      cpu.mem[0x21] = 0x20; // High byte of base address
      
      // Value at (base address + Y) crossing page boundary
      cpu.mem[0x2100] = 0x42; // 0x2001 + 0xFF = 0x2100
      
      const cycles = step6502(cpu);
      
      expect(cpu.a).toBe(0x42);
      expect(cpu.pc).toBe(2);
      expect(cycles).toBe(6); // Extra cycle for page boundary crossing
    });
    
    it("should perform JMP indirect instruction", () => {
      const cpu = createCPU();
      
      // Set up memory
      cpu.mem[0] = 0x6C; // JMP indirect
      cpu.mem[1] = 0x20; // Low byte of pointer address
      cpu.mem[2] = 0x30; // High byte of pointer address
      
      // Target address stored at pointer in little endian
      cpu.mem[0x3020] = 0x40; // Low byte of target
      cpu.mem[0x3021] = 0x50; // High byte of target
      
      const cycles = step6502(cpu);
      
      expect(cpu.pc).toBe(0x5040); // PC should be set to target address
      expect(cycles).toBe(5);
    });
    
    // Test the 6502's indirect JMP bug when vector falls on page boundary
    it("should correctly handle JMP indirect page boundary bug", () => {
      const cpu = createCPU();
      
      // Set up memory
      cpu.mem[0] = 0x6C; // JMP indirect
      cpu.mem[1] = 0xFF; // Low byte of pointer address (page boundary)
      cpu.mem[2] = 0x30; // High byte of pointer address
      
      // Target address stored at pointer with wrap-around bug
      cpu.mem[0x30FF] = 0x40; // Low byte of target
      cpu.mem[0x3000] = 0x50; // High byte at wrap-around address (not 0x3100)
      
      const cycles = step6502(cpu);
      
      expect(cpu.pc).toBe(0x5040); // PC should be set to target address with bug behavior
      expect(cycles).toBe(5);
    });
  });
  
  // Stack operations
  describe("Stack operations", () => {
    it("should perform PHA and PLA instructions", () => {
      const cpu = createCPU();
      
      // Set up accumulator
      cpu.a = 0x42;
      
      // PHA - Push Accumulator on Stack
      cpu.mem[0] = 0x48; // PHA
      
      let cycles = step6502(cpu);
      
      // Check that SP was decremented
      expect(cpu.sp).toBe(0xFC);
      expect(cpu.mem[0x01FD]).toBe(0x42); // Stack value at 0x01FD should be 0x42
      expect(cpu.pc).toBe(1);
      expect(cycles).toBe(3);
      
      // Clear accumulator
      cpu.a = 0;
      
      // Set up PLA instruction
      cpu.mem[1] = 0x68; // PLA
      
      cycles = step6502(cpu);
      
      // Check that accumulator got value from stack and SP was incremented
      expect(cpu.a).toBe(0x42);
      expect(cpu.sp).toBe(0xFD);
      expect(cpu.pc).toBe(2);
      expect(cycles).toBe(4);
      expect(cpu.p & ZERO).toBe(0);
      expect(cpu.p & NEGATIVE).toBe(0);
    });
    
    it("should perform PHP and PLP instructions", () => {
      const cpu = createCPU();
      
      // Set up status register with some flags
      cpu.p = ZERO | CARRY;
      
      // PHP - Push Processor Status on Stack
      cpu.mem[0] = 0x08; // PHP
      
      let cycles = step6502(cpu);
      
      // Check that SP was decremented and status was pushed with B and unused flags set
      expect(cpu.sp).toBe(0xFC);
      expect(cpu.mem[0x01FD]).toBe((ZERO | CARRY | BREAK | UNUSED));
      expect(cpu.pc).toBe(1);
      expect(cycles).toBe(3);
      
      // Clear status register
      cpu.p = 0;
      
      // Set up PLP instruction
      cpu.mem[1] = 0x28; // PLP
      
      cycles = step6502(cpu);
      
      // Check that status was pulled from stack (B and unused should be ignored)
      expect(cpu.p).toBe(ZERO | CARRY | UNUSED);
      expect(cpu.sp).toBe(0xFD);
      expect(cpu.pc).toBe(2);
      expect(cycles).toBe(4);
    });
  });
  
  // Arithmetic operations
  describe("Arithmetic operations", () => {
    it("should perform ADC immediate instruction", () => {
      const cpu = createCPU();
      
      // Set up CPU state
      cpu.a = 0x42;
      cpu.p &= ~CARRY; // Clear carry flag
      
      // Set up memory
      cpu.mem[0] = 0x69; // ADC immediate
      cpu.mem[1] = 0x37; // Value to add
      
      const cycles = step6502(cpu);
      
      expect(cpu.a).toBe(0x79); // 0x42 + 0x37 = 0x79
      expect(cpu.p & CARRY).toBe(0); // No carry out
      expect(cpu.p & ZERO).toBe(0); // Result is not zero
      expect(cpu.p & NEGATIVE).toBe(0); // Result is not negative
      expect(cpu.p & OVERFLOW).toBe(0); // No overflow (both inputs and result have same sign bit)
      expect(cpu.pc).toBe(2);
      expect(cycles).toBe(2);
    });
    
    it("should handle ADC with carry in", () => {
      const cpu = createCPU();
      
      // Set up CPU state
      cpu.a = 0x42;
      cpu.p |= CARRY; // Set carry flag
      
      // Set up memory
      cpu.mem[0] = 0x69; // ADC immediate
      cpu.mem[1] = 0x37; // Value to add
      
      const cycles = step6502(cpu);
      
      expect(cpu.a).toBe(0x7A); // 0x42 + 0x37 + 1 = 0x7A
      expect(cpu.pc).toBe(2);
      expect(cycles).toBe(2);
    });
    
    it("should handle ADC with carry out", () => {
      const cpu = createCPU();
      
      // Set up CPU state
      cpu.a = 0xD0;
      cpu.p &= ~CARRY; // Clear carry flag
      
      // Set up memory
      cpu.mem[0] = 0x69; // ADC immediate
      cpu.mem[1] = 0x90; // Value to add
      
      const cycles = step6502(cpu);
      
      expect(cpu.a).toBe(0x60); // 0xD0 + 0x90 = 0x160, truncated to 0x60
      expect(cpu.p & CARRY).toBe(CARRY); // Carry flag should be set
      expect(cpu.pc).toBe(2);
      expect(cycles).toBe(2);
    });
    
    it("should handle ADC with overflow", () => {
      const cpu = createCPU();
      
      // Set up CPU state
      cpu.a = 0x50; // +80 in signed
      cpu.p &= ~CARRY; // Clear carry flag
      
      // Set up memory
      cpu.mem[0] = 0x69; // ADC immediate
      cpu.mem[1] = 0x50; // +80 in signed
      
      const cycles = step6502(cpu);
      
      // 80 + 80 = 160, which is -96 when interpreted as signed 8-bit
      // (sign bit flipped from positive to negative)
      expect(cpu.a).toBe(0xA0);
      expect(cpu.p & OVERFLOW).toBe(OVERFLOW); // Overflow flag should be set
      expect(cpu.p & NEGATIVE).toBe(NEGATIVE); // Result is negative
      expect(cpu.pc).toBe(2);
      expect(cycles).toBe(2);
    });
    
    it("should perform SBC immediate instruction", () => {
      const cpu = createCPU();
      
      // Set up CPU state
      cpu.a = 0x42;
      cpu.p |= CARRY; // Set carry flag (means no borrow)
      
      // Set up memory
      cpu.mem[0] = 0xE9; // SBC immediate
      cpu.mem[1] = 0x20; // Value to subtract
      
      const cycles = step6502(cpu);
      
      expect(cpu.a).toBe(0x22); // 0x42 - 0x20 = 0x22
      expect(cpu.p & CARRY).toBe(CARRY); // No borrow needed
      expect(cpu.p & ZERO).toBe(0); // Result is not zero
      expect(cpu.p & NEGATIVE).toBe(0); // Result is not negative
      expect(cpu.pc).toBe(2);
      expect(cycles).toBe(2);
    });
    
    it("should handle SBC with borrow", () => {
      const cpu = createCPU();
      
      // Set up CPU state
      cpu.a = 0x42;
      cpu.p &= ~CARRY; // Clear carry flag (means borrow)
      
      // Set up memory
      cpu.mem[0] = 0xE9; // SBC immediate
      cpu.mem[1] = 0x20; // Value to subtract
      
      const cycles = step6502(cpu);
      
      expect(cpu.a).toBe(0x21); // 0x42 - 0x20 - 1 = 0x21
      expect(cpu.pc).toBe(2);
      expect(cycles).toBe(2);
    });
    
    it("should handle SBC with borrow out", () => {
      const cpu = createCPU();
      
      // Set up CPU state
      cpu.a = 0x20;
      cpu.p |= CARRY; // Set carry flag (no borrow)
      
      // Set up memory
      cpu.mem[0] = 0xE9; // SBC immediate
      cpu.mem[1] = 0x30; // Value to subtract
      
      const cycles = step6502(cpu);
      
      expect(cpu.a).toBe(0xF0); // 0x20 - 0x30 = 0xF0 (with borrow)
      expect(cpu.p & CARRY).toBe(0); // Borrow needed
      expect(cpu.p & NEGATIVE).toBe(NEGATIVE); // Result is negative
      expect(cpu.pc).toBe(2);
      expect(cycles).toBe(2);
    });
    
    it("should perform CMP immediate instruction", () => {
      const cpu = createCPU();
      
      // Set up CPU state
      cpu.a = 0x42;
      
      // Set up memory for A == M
      cpu.mem[0] = 0xC9; // CMP immediate
      cpu.mem[1] = 0x42; // Value to compare
      
      let cycles = step6502(cpu);
      
      expect(cpu.a).toBe(0x42); // Accumulator should not change
      expect(cpu.p & ZERO).toBe(ZERO); // Equal, so zero flag set
      expect(cpu.p & CARRY).toBe(CARRY); // A >= M, so carry set
      expect(cpu.p & NEGATIVE).toBe(0); // Result bit 7 is clear
      expect(cpu.pc).toBe(2);
      expect(cycles).toBe(2);
      
      // Set up memory for A > M
      cpu.pc = 0;
      cpu.mem[1] = 0x10;
      
      cycles = step6502(cpu);
      
      expect(cpu.p & ZERO).toBe(0); // Not equal, so zero flag clear
      expect(cpu.p & CARRY).toBe(CARRY); // A >= M, so carry set
      
      // Set up memory for A < M
      cpu.pc = 0;
      cpu.mem[1] = 0x50;
      
      cycles = step6502(cpu);
      
      expect(cpu.p & ZERO).toBe(0); // Not equal, so zero flag clear
      expect(cpu.p & CARRY).toBe(0); // A < M, so carry clear
      expect(cpu.p & NEGATIVE).toBe(NEGATIVE); // Result bit 7 is set
    });
  });
  
  // Logical operations
  describe("Logical operations", () => {
    it("should perform AND immediate instruction", () => {
      const cpu = createCPU();
      
      // Set up CPU state
      cpu.a = 0xF0;
      
      // Set up memory
      cpu.mem[0] = 0x29; // AND immediate
      cpu.mem[1] = 0x0F; // Value to AND with accumulator
      
      const cycles = step6502(cpu);
      
      expect(cpu.a).toBe(0x00); // 0xF0 & 0x0F = 0x00
      expect(cpu.pc).toBe(2);
      expect(cycles).toBe(2);
      expect(cpu.p & ZERO).toBe(ZERO); // Zero flag should be set
    });
    
    it("should perform ORA immediate instruction", () => {
      const cpu = createCPU();
      
      // Set up CPU state
      cpu.a = 0xF0;
      
      // Set up memory
      cpu.mem[0] = 0x09; // ORA immediate
      cpu.mem[1] = 0x0F; // Value to OR with accumulator
      
      const cycles = step6502(cpu);
      
      expect(cpu.a).toBe(0xFF); // 0xF0 | 0x0F = 0xFF
      expect(cpu.pc).toBe(2);
      expect(cycles).toBe(2);
      expect(cpu.p & NEGATIVE).toBe(NEGATIVE); // Negative flag should be set
    });
    
    it("should perform EOR immediate instruction", () => {
      const cpu = createCPU();
      
      // Set up CPU state
      cpu.a = 0xFF;
      
      // Set up memory
      cpu.mem[0] = 0x49; // EOR immediate
      cpu.mem[1] = 0xF0; // Value to XOR with accumulator
      
      const cycles = step6502(cpu);
      
      expect(cpu.a).toBe(0x0F); // 0xFF ^ 0xF0 = 0x0F
      expect(cpu.pc).toBe(2);
      expect(cycles).toBe(2);
    });
    
    it("should perform BIT zero page instruction", () => {
      const cpu = createCPU();
      
      // Set up CPU state
      cpu.a = 0x0F;
      cpu.p = 0; // Clear all flags
      
      // Set up memory
      cpu.mem[0] = 0x24; // BIT zero page
      cpu.mem[1] = 0x20; // Zero page address
      cpu.mem[0x20] = 0xC0; // Test value (bits 7 and 6 are set)
      
      const cycles = step6502(cpu);
      
      // BIT sets N and V from bits 7 and 6 of memory
      expect(cpu.p & NEGATIVE).toBe(NEGATIVE); // Bit 7 of memory -> N flag
      expect(cpu.p & OVERFLOW).toBe(OVERFLOW); // Bit 6 of memory -> V flag
      
      // BIT sets Z based on AND result
      expect(cpu.p & ZERO).toBe(ZERO); // 0x0F & 0xC0 = 0, so Z flag is set
      
      // Accumulator should not be modified
      expect(cpu.a).toBe(0x0F);
      expect(cpu.pc).toBe(2);
      expect(cycles).toBe(3);
    });
  });
});
