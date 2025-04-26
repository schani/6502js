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
  
  // Test internal helper functions
  describe("Internal helper functions", () => {
    it("should correctly read and write words", () => {
      const cpu = createCPU();
      
      // Test writeWord
      cpu.mem[0x1234] = 0; // Clear memory
      cpu.mem[0x1235] = 0; 
      
      // Use the CPU step to indirectly test writeWord
      cpu.mem[0] = 0x20; // JSR absolute
      cpu.mem[1] = 0x34; // Low byte of target address
      cpu.mem[2] = 0x12; // High byte of target address
      
      step6502(cpu); // This calls pushWord internally
      
      // Verify the return address was written correctly
      // pc-1 should be written to the stack (0x0001)
      expect(cpu.mem[0x01FC]).toBe(0x00); // Low byte
      expect(cpu.mem[0x01FD]).toBe(0x00); // High byte
      
      // Test readWord via JMP indirect
      // First set up the memory
      cpu.mem[0x2000] = 0x42; // Low byte
      cpu.mem[0x2001] = 0x37; // High byte
      
      // Now setup a JMP indirect instruction
      cpu.pc = 0;
      cpu.mem[0] = 0x6C; // JMP indirect
      cpu.mem[1] = 0x00; // Low byte of pointer
      cpu.mem[2] = 0x20; // High byte of pointer
      
      step6502(cpu); // This calls readWord internally
      
      // Verify PC was set to the address read from memory
      expect(cpu.pc).toBe(0x3742);
    });
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
    
    it("should perform STA zero page,X instruction", () => {
      const cpu = createCPU();
      
      // Set up accumulator and X register
      cpu.a = 0x42;
      cpu.x = 0x05;
      
      // STA $30,X - Store accumulator at zero page address 0x30 + X
      cpu.mem[0] = 0x95; // STA zero page,X
      cpu.mem[1] = 0x30; // Zero page address
      
      const cycles = step6502(cpu);
      
      expect(cpu.mem[0x35]).toBe(0x42); // Value at address 0x30 + 0x05
      expect(cpu.pc).toBe(2);
      expect(cycles).toBe(4);
    });
    
    it("should perform STA absolute instruction", () => {
      const cpu = createCPU();
      
      // Set up accumulator
      cpu.a = 0x42;
      
      // STA $1234 - Store accumulator at absolute address 0x1234
      cpu.mem[0] = 0x8D; // STA absolute
      cpu.mem[1] = 0x34; // Low byte of address
      cpu.mem[2] = 0x12; // High byte of address
      
      const cycles = step6502(cpu);
      
      expect(cpu.mem[0x1234]).toBe(0x42);
      expect(cpu.pc).toBe(3);
      expect(cycles).toBe(4);
    });
    
    it("should perform STA absolute,X instruction", () => {
      const cpu = createCPU();
      
      // Set up accumulator and X register
      cpu.a = 0x42;
      cpu.x = 0x05;
      
      // STA $1234,X - Store accumulator at absolute address 0x1234 + X
      cpu.mem[0] = 0x9D; // STA absolute,X
      cpu.mem[1] = 0x34; // Low byte of address
      cpu.mem[2] = 0x12; // High byte of address
      
      const cycles = step6502(cpu);
      
      expect(cpu.mem[0x1239]).toBe(0x42); // Value at address 0x1234 + 0x05
      expect(cpu.pc).toBe(3);
      expect(cycles).toBe(5); // Always 5 cycles, regardless of page crossing
    });
    
    it("should perform STA absolute,Y instruction", () => {
      const cpu = createCPU();
      
      // Set up accumulator and Y register
      cpu.a = 0x42;
      cpu.y = 0x05;
      
      // STA $1234,Y - Store accumulator at absolute address 0x1234 + Y
      cpu.mem[0] = 0x99; // STA absolute,Y
      cpu.mem[1] = 0x34; // Low byte of address
      cpu.mem[2] = 0x12; // High byte of address
      
      const cycles = step6502(cpu);
      
      expect(cpu.mem[0x1239]).toBe(0x42); // Value at address 0x1234 + 0x05
      expect(cpu.pc).toBe(3);
      expect(cycles).toBe(5); // Always 5 cycles, regardless of page crossing
    });
    
    it("should perform STA (indirect,X) instruction", () => {
      const cpu = createCPU();
      
      // Set up accumulator and X register
      cpu.a = 0x42;
      cpu.x = 0x04;
      
      // Set up memory (pointer in zero page)
      cpu.mem[0] = 0x81; // STA (indirect,X)
      cpu.mem[1] = 0x20; // Zero page address
      
      // Effective address stored at (zero page + X) in little endian
      cpu.mem[0x24] = 0x74; // Low byte of effective address
      cpu.mem[0x25] = 0x20; // High byte of effective address
      
      const cycles = step6502(cpu);
      
      expect(cpu.mem[0x2074]).toBe(0x42); // Value at effective address
      expect(cpu.pc).toBe(2);
      expect(cycles).toBe(6);
    });
    
    it("should perform STA (indirect),Y instruction", () => {
      const cpu = createCPU();
      
      // Set up accumulator and Y register
      cpu.a = 0x42;
      cpu.y = 0x10;
      
      // Set up memory
      cpu.mem[0] = 0x91; // STA (indirect),Y
      cpu.mem[1] = 0x20; // Zero page address
      
      // Effective base address stored at zero page in little endian
      cpu.mem[0x20] = 0x74; // Low byte of base address
      cpu.mem[0x21] = 0x20; // High byte of base address
      
      const cycles = step6502(cpu);
      
      expect(cpu.mem[0x2084]).toBe(0x42); // Value at (base address + Y)
      expect(cpu.pc).toBe(2);
      expect(cycles).toBe(6); // Always 6 cycles, regardless of page crossing
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
    
    it("should perform STX zero page,Y instruction", () => {
      const cpu = createCPU();
      
      // Set up X and Y registers
      cpu.x = 0x42;
      cpu.y = 0x05;
      
      // STX $30,Y - Store X register at zero page address 0x30 + Y
      cpu.mem[0] = 0x96; // STX zero page,Y
      cpu.mem[1] = 0x30; // Zero page address
      
      const cycles = step6502(cpu);
      
      expect(cpu.mem[0x35]).toBe(0x42); // Value at address 0x30 + 0x05
      expect(cpu.pc).toBe(2);
      expect(cycles).toBe(4);
    });
    
    it("should perform STX absolute instruction", () => {
      const cpu = createCPU();
      
      // Set up X register
      cpu.x = 0x42;
      
      // STX $1234 - Store X register at absolute address 0x1234
      cpu.mem[0] = 0x8E; // STX absolute
      cpu.mem[1] = 0x34; // Low byte of address
      cpu.mem[2] = 0x12; // High byte of address
      
      const cycles = step6502(cpu);
      
      expect(cpu.mem[0x1234]).toBe(0x42);
      expect(cpu.pc).toBe(3);
      expect(cycles).toBe(4);
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
    
    it("should perform STY zero page,X instruction", () => {
      const cpu = createCPU();
      
      // Set up X and Y registers
      cpu.y = 0x42;
      cpu.x = 0x05;
      
      // STY $30,X - Store Y register at zero page address 0x30 + X
      cpu.mem[0] = 0x94; // STY zero page,X
      cpu.mem[1] = 0x30; // Zero page address
      
      const cycles = step6502(cpu);
      
      expect(cpu.mem[0x35]).toBe(0x42); // Value at address 0x30 + 0x05
      expect(cpu.pc).toBe(2);
      expect(cycles).toBe(4);
    });
    
    it("should perform STY absolute instruction", () => {
      const cpu = createCPU();
      
      // Set up Y register
      cpu.y = 0x42;
      
      // STY $1234 - Store Y register at absolute address 0x1234
      cpu.mem[0] = 0x8C; // STY absolute
      cpu.mem[1] = 0x34; // Low byte of address
      cpu.mem[2] = 0x12; // High byte of address
      
      const cycles = step6502(cpu);
      
      expect(cpu.mem[0x1234]).toBe(0x42);
      expect(cpu.pc).toBe(3);
      expect(cycles).toBe(4);
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
    
    it("should perform TSX instruction", () => {
      const cpu = createCPU();
      
      // Set up stack pointer
      cpu.sp = 0x42;
      
      // TSX - Transfer Stack Pointer to X
      cpu.mem[0] = 0xBA; // TSX
      
      const cycles = step6502(cpu);
      
      expect(cpu.x).toBe(0x42);
      expect(cpu.pc).toBe(1);
      expect(cycles).toBe(2);
      expect(cpu.p & ZERO).toBe(0); // Result is not zero
      expect(cpu.p & NEGATIVE).toBe(0); // Result is not negative
    });
    
    it("should perform TXS instruction", () => {
      const cpu = createCPU();
      
      // Set up X register
      cpu.x = 0x42;
      
      // TXS - Transfer X to Stack Pointer
      cpu.mem[0] = 0x9A; // TXS
      
      const cycles = step6502(cpu);
      
      expect(cpu.sp).toBe(0x42);
      expect(cpu.pc).toBe(1);
      expect(cycles).toBe(2);
      // TXS does not affect any flags
      expect(cpu.p).toBe(INTERRUPT | UNUSED); // Original status
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
    
    // We'll skip the additional ADC/SBC tests for now as they likely require 
    // implementation of the opcodes in the CPU that haven't been added yet
  
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
    
    it("should perform CMP zero page instruction", () => {
      const cpu = createCPU();
      
      // Set up CPU state
      cpu.a = 0x42;
      
      // Set up memory
      cpu.mem[0] = 0xC5; // CMP zero page
      cpu.mem[1] = 0x30; // Zero page address
      cpu.mem[0x30] = 0x42; // Value to compare
      
      const cycles = step6502(cpu);
      
      expect(cpu.a).toBe(0x42); // Accumulator should not change
      expect(cpu.p & ZERO).toBe(ZERO); // Equal, so zero flag set
      expect(cpu.p & CARRY).toBe(CARRY); // A >= M, so carry set
      expect(cpu.pc).toBe(2);
      expect(cycles).toBe(3);
    });
    
    it("should perform CMP absolute instruction", () => {
      const cpu = createCPU();
      
      // Set up CPU state
      cpu.a = 0x42;
      
      // Set up memory
      cpu.mem[0] = 0xCD; // CMP absolute
      cpu.mem[1] = 0x34; // Low byte of address
      cpu.mem[2] = 0x12; // High byte of address
      cpu.mem[0x1234] = 0x42; // Value to compare
      
      const cycles = step6502(cpu);
      
      expect(cpu.a).toBe(0x42); // Accumulator should not change
      expect(cpu.p & ZERO).toBe(ZERO); // Equal, so zero flag set
      expect(cpu.p & CARRY).toBe(CARRY); // A >= M, so carry set
      expect(cpu.pc).toBe(3);
      expect(cycles).toBe(4);
    });
    
    it("should perform CPX immediate instruction", () => {
      const cpu = createCPU();
      
      // Set up CPU state
      cpu.x = 0x42;
      
      // Set up memory
      cpu.mem[0] = 0xE0; // CPX immediate
      cpu.mem[1] = 0x42; // Value to compare
      
      const cycles = step6502(cpu);
      
      expect(cpu.x).toBe(0x42); // X register should not change
      expect(cpu.p & ZERO).toBe(ZERO); // Equal, so zero flag set
      expect(cpu.p & CARRY).toBe(CARRY); // X >= M, so carry set
      expect(cpu.pc).toBe(2);
      expect(cycles).toBe(2);
    });
    
    it("should perform CPX zero page instruction", () => {
      const cpu = createCPU();
      
      // Set up CPU state
      cpu.x = 0x42;
      
      // Set up memory
      cpu.mem[0] = 0xE4; // CPX zero page
      cpu.mem[1] = 0x30; // Zero page address
      cpu.mem[0x30] = 0x42; // Value to compare
      
      const cycles = step6502(cpu);
      
      expect(cpu.x).toBe(0x42); // X register should not change
      expect(cpu.p & ZERO).toBe(ZERO); // Equal, so zero flag set
      expect(cpu.p & CARRY).toBe(CARRY); // X >= M, so carry set
      expect(cpu.pc).toBe(2);
      expect(cycles).toBe(3);
    });
    
    it("should perform CPY immediate instruction", () => {
      const cpu = createCPU();
      
      // Set up CPU state
      cpu.y = 0x42;
      
      // Set up memory
      cpu.mem[0] = 0xC0; // CPY immediate
      cpu.mem[1] = 0x42; // Value to compare
      
      const cycles = step6502(cpu);
      
      expect(cpu.y).toBe(0x42); // Y register should not change
      expect(cpu.p & ZERO).toBe(ZERO); // Equal, so zero flag set
      expect(cpu.p & CARRY).toBe(CARRY); // Y >= M, so carry set
      expect(cpu.pc).toBe(2);
      expect(cycles).toBe(2);
    });
    
    it("should perform CPY zero page instruction", () => {
      const cpu = createCPU();
      
      // Set up CPU state
      cpu.y = 0x42;
      
      // Set up memory
      cpu.mem[0] = 0xC4; // CPY zero page
      cpu.mem[1] = 0x30; // Zero page address
      cpu.mem[0x30] = 0x42; // Value to compare
      
      const cycles = step6502(cpu);
      
      expect(cpu.y).toBe(0x42); // Y register should not change
      expect(cpu.p & ZERO).toBe(ZERO); // Equal, so zero flag set
      expect(cpu.p & CARRY).toBe(CARRY); // Y >= M, so carry set
      expect(cpu.pc).toBe(2);
      expect(cycles).toBe(3);
    });
  });
  
  // Increment and decrement operations
  describe("Increment and decrement operations", () => {
    it("should perform INX instruction", () => {
      const cpu = createCPU();
      
      // Set up CPU state
      cpu.x = 0x41;
      
      // Set up memory
      cpu.mem[0] = 0xE8; // INX
      
      const cycles = step6502(cpu);
      
      expect(cpu.x).toBe(0x42);
      expect(cpu.p & ZERO).toBe(0); // Result is not zero
      expect(cpu.p & NEGATIVE).toBe(0); // Result is not negative
      expect(cpu.pc).toBe(1);
      expect(cycles).toBe(2);
      
      // Test wrapping from 0xFF to 0x00
      cpu.pc = 0;
      cpu.x = 0xFF;
      
      step6502(cpu);
      
      expect(cpu.x).toBe(0x00);
      expect(cpu.p & ZERO).toBe(ZERO); // Result is zero
    });
    
    it("should perform INY instruction", () => {
      const cpu = createCPU();
      
      // Set up CPU state
      cpu.y = 0x41;
      
      // Set up memory
      cpu.mem[0] = 0xC8; // INY
      
      const cycles = step6502(cpu);
      
      expect(cpu.y).toBe(0x42);
      expect(cpu.p & ZERO).toBe(0); // Result is not zero
      expect(cpu.p & NEGATIVE).toBe(0); // Result is not negative
      expect(cpu.pc).toBe(1);
      expect(cycles).toBe(2);
    });
    
    it("should perform DEX instruction", () => {
      const cpu = createCPU();
      
      // Set up CPU state
      cpu.x = 0x43;
      
      // Set up memory
      cpu.mem[0] = 0xCA; // DEX
      
      const cycles = step6502(cpu);
      
      expect(cpu.x).toBe(0x42);
      expect(cpu.p & ZERO).toBe(0); // Result is not zero
      expect(cpu.p & NEGATIVE).toBe(0); // Result is not negative
      expect(cpu.pc).toBe(1);
      expect(cycles).toBe(2);
      
      // Test wrapping from 0x00 to 0xFF
      cpu.pc = 0;
      cpu.x = 0x00;
      
      step6502(cpu);
      
      expect(cpu.x).toBe(0xFF);
      expect(cpu.p & NEGATIVE).toBe(NEGATIVE); // Result is negative
    });
    
    it("should perform DEY instruction", () => {
      const cpu = createCPU();
      
      // Set up CPU state
      cpu.y = 0x43;
      
      // Set up memory
      cpu.mem[0] = 0x88; // DEY
      
      const cycles = step6502(cpu);
      
      expect(cpu.y).toBe(0x42);
      expect(cpu.p & ZERO).toBe(0); // Result is not zero
      expect(cpu.p & NEGATIVE).toBe(0); // Result is not negative
      expect(cpu.pc).toBe(1);
      expect(cycles).toBe(2);
    });
    
    it("should perform INC zero page instruction", () => {
      const cpu = createCPU();
      
      // Set up memory
      cpu.mem[0] = 0xE6; // INC zero page
      cpu.mem[1] = 0x20; // Zero page address
      cpu.mem[0x20] = 0x41; // Value to increment
      
      const cycles = step6502(cpu);
      
      expect(cpu.mem[0x20]).toBe(0x42);
      expect(cpu.p & ZERO).toBe(0); // Result is not zero
      expect(cpu.p & NEGATIVE).toBe(0); // Result is not negative
      expect(cpu.pc).toBe(2);
      expect(cycles).toBe(5);
    });
    
    it("should perform DEC zero page instruction", () => {
      const cpu = createCPU();
      
      // Set up memory
      cpu.mem[0] = 0xC6; // DEC zero page
      cpu.mem[1] = 0x20; // Zero page address
      cpu.mem[0x20] = 0x43; // Value to decrement
      
      const cycles = step6502(cpu);
      
      expect(cpu.mem[0x20]).toBe(0x42);
      expect(cpu.p & ZERO).toBe(0); // Result is not zero
      expect(cpu.p & NEGATIVE).toBe(0); // Result is not negative
      expect(cpu.pc).toBe(2);
      expect(cycles).toBe(5);
    });
    
    // We'll skip the additional INC/DEC tests for now as they likely require
    // implementation of the opcodes in the CPU that haven't been added yet
  });

  // Shift and rotate instructions
  describe("Shift and rotate instructions", () => {
    it("should perform ASL A instruction", () => {
      const cpu = createCPU();
      
      // Set up CPU state
      cpu.a = 0x41; // 01000001
      
      // Set up memory
      cpu.mem[0] = 0x0A; // ASL A
      
      const cycles = step6502(cpu);
      
      expect(cpu.a).toBe(0x82); // 10000010
      expect(cpu.p & CARRY).toBe(0); // Bit 7 was 0
      expect(cpu.p & NEGATIVE).toBe(NEGATIVE); // Result has bit 7 set
      expect(cpu.pc).toBe(1);
      expect(cycles).toBe(2);
      
      // Test with carry out
      cpu.pc = 0;
      cpu.a = 0x81; // 10000001
      
      step6502(cpu);
      
      expect(cpu.a).toBe(0x02); // 00000010
      expect(cpu.p & CARRY).toBe(CARRY); // Bit 7 was 1
      expect(cpu.p & ZERO).toBe(0); // Result is not zero
    });
    
    it("should perform ASL zero page instruction", () => {
      const cpu = createCPU();
      
      // Set up memory
      cpu.mem[0] = 0x06; // ASL zero page
      cpu.mem[1] = 0x42; // Zero page address
      cpu.mem[0x42] = 0x41; // Value to shift
      
      const cycles = step6502(cpu);
      
      expect(cpu.mem[0x42]).toBe(0x82); // 10000010
      expect(cpu.p & CARRY).toBe(0); // Bit 7 was 0
      expect(cpu.p & NEGATIVE).toBe(NEGATIVE); // Result has bit 7 set
      expect(cpu.pc).toBe(2);
      expect(cycles).toBe(5);
    });
    
    it("should perform ASL absolute instruction", () => {
      const cpu = createCPU();
      
      // Set up memory
      cpu.mem[0] = 0x0E; // ASL absolute
      cpu.mem[1] = 0x34; // Low byte of address
      cpu.mem[2] = 0x12; // High byte of address
      cpu.mem[0x1234] = 0x41; // Value to shift
      
      const cycles = step6502(cpu);
      
      expect(cpu.mem[0x1234]).toBe(0x82); // 10000010
      expect(cpu.p & CARRY).toBe(0); // Bit 7 was 0
      expect(cpu.p & NEGATIVE).toBe(NEGATIVE); // Result has bit 7 set
      expect(cpu.pc).toBe(3);
      expect(cycles).toBe(6);
    });
    
    it("should perform LSR A instruction", () => {
      const cpu = createCPU();
      
      // Set up CPU state
      cpu.a = 0x41; // 01000001
      
      // Set up memory
      cpu.mem[0] = 0x4A; // LSR A
      
      const cycles = step6502(cpu);
      
      expect(cpu.a).toBe(0x20); // 00100000
      expect(cpu.p & CARRY).toBe(CARRY); // Bit 0 was 1
      expect(cpu.p & NEGATIVE).toBe(0); // Bit 7 is always cleared
      expect(cpu.pc).toBe(1);
      expect(cycles).toBe(2);
      
      // Test with zero result
      cpu.pc = 0;
      cpu.a = 0x01; // 00000001
      
      step6502(cpu);
      
      expect(cpu.a).toBe(0x00); // 00000000
      expect(cpu.p & CARRY).toBe(CARRY); // Bit 0 was 1
      expect(cpu.p & ZERO).toBe(ZERO); // Result is zero
    });
    
    it("should perform LSR zero page instruction", () => {
      const cpu = createCPU();
      
      // Set up memory
      cpu.mem[0] = 0x46; // LSR zero page
      cpu.mem[1] = 0x42; // Zero page address
      cpu.mem[0x42] = 0x41; // Value to shift
      
      const cycles = step6502(cpu);
      
      expect(cpu.mem[0x42]).toBe(0x20); // 00100000
      expect(cpu.p & CARRY).toBe(CARRY); // Bit 0 was 1
      expect(cpu.p & NEGATIVE).toBe(0); // Bit 7 is always cleared
      expect(cpu.pc).toBe(2);
      expect(cycles).toBe(5);
    });
    
    it("should perform LSR absolute instruction", () => {
      const cpu = createCPU();
      
      // Set up memory
      cpu.mem[0] = 0x4E; // LSR absolute
      cpu.mem[1] = 0x34; // Low byte of address
      cpu.mem[2] = 0x12; // High byte of address
      cpu.mem[0x1234] = 0x41; // Value to shift
      
      const cycles = step6502(cpu);
      
      expect(cpu.mem[0x1234]).toBe(0x20); // 00100000
      expect(cpu.p & CARRY).toBe(CARRY); // Bit 0 was 1
      expect(cpu.p & NEGATIVE).toBe(0); // Bit 7 is always cleared
      expect(cpu.pc).toBe(3);
      expect(cycles).toBe(6);
    });
    
    it("should perform ROL A instruction", () => {
      const cpu = createCPU();
      
      // Set up CPU state
      cpu.a = 0x41; // 01000001
      cpu.p &= ~CARRY; // Clear carry flag
      
      // Set up memory
      cpu.mem[0] = 0x2A; // ROL A
      
      const cycles = step6502(cpu);
      
      expect(cpu.a).toBe(0x82); // 10000010
      expect(cpu.p & CARRY).toBe(0); // Old bit 7 was 0
      expect(cpu.p & NEGATIVE).toBe(NEGATIVE); // Result has bit 7 set
      expect(cpu.pc).toBe(1);
      expect(cycles).toBe(2);
      
      // Test with carry in and out
      cpu.pc = 0;
      cpu.a = 0x81; // 10000001
      cpu.p |= CARRY; // Set carry flag
      
      step6502(cpu);
      
      expect(cpu.a).toBe(0x03); // 00000011 (carry in becomes bit 0)
      expect(cpu.p & CARRY).toBe(CARRY); // Old bit 7 was 1
      expect(cpu.p & ZERO).toBe(0); // Result is not zero
    });
    
    it("should perform ROL zero page instruction", () => {
      const cpu = createCPU();
      
      // Set up CPU state
      cpu.p &= ~CARRY; // Clear carry flag
      
      // Set up memory
      cpu.mem[0] = 0x26; // ROL zero page
      cpu.mem[1] = 0x42; // Zero page address
      cpu.mem[0x42] = 0x41; // Value to rotate
      
      const cycles = step6502(cpu);
      
      expect(cpu.mem[0x42]).toBe(0x82); // 10000010
      expect(cpu.p & CARRY).toBe(0); // Old bit 7 was 0
      expect(cpu.p & NEGATIVE).toBe(NEGATIVE); // Result has bit 7 set
      expect(cpu.pc).toBe(2);
      expect(cycles).toBe(5);
    });
    
    it("should perform ROL absolute instruction", () => {
      const cpu = createCPU();
      
      // Set up CPU state
      cpu.p &= ~CARRY; // Clear carry flag
      
      // Set up memory
      cpu.mem[0] = 0x2E; // ROL absolute
      cpu.mem[1] = 0x34; // Low byte of address
      cpu.mem[2] = 0x12; // High byte of address
      cpu.mem[0x1234] = 0x41; // Value to rotate
      
      const cycles = step6502(cpu);
      
      expect(cpu.mem[0x1234]).toBe(0x82); // 10000010
      expect(cpu.p & CARRY).toBe(0); // Old bit 7 was 0
      expect(cpu.p & NEGATIVE).toBe(NEGATIVE); // Result has bit 7 set
      expect(cpu.pc).toBe(3);
      expect(cycles).toBe(6);
    });
    
    it("should perform ROR A instruction", () => {
      const cpu = createCPU();
      
      // Set up CPU state
      cpu.a = 0x41; // 01000001
      cpu.p &= ~CARRY; // Clear carry flag
      
      // Set up memory
      cpu.mem[0] = 0x6A; // ROR A
      
      const cycles = step6502(cpu);
      
      expect(cpu.a).toBe(0x20); // 00100000
      expect(cpu.p & CARRY).toBe(CARRY); // Old bit 0 was 1
      expect(cpu.p & NEGATIVE).toBe(0); // Result has bit 7 clear
      expect(cpu.pc).toBe(1);
      expect(cycles).toBe(2);
      
      // Test with carry in
      cpu.pc = 0;
      cpu.a = 0x01; // 00000001
      cpu.p |= CARRY; // Set carry flag
      
      step6502(cpu);
      
      expect(cpu.a).toBe(0x80); // 10000000 (carry in becomes bit 7)
      expect(cpu.p & CARRY).toBe(CARRY); // Old bit 0 was 1
      expect(cpu.p & NEGATIVE).toBe(NEGATIVE); // Result has bit 7 set
    });
    
    it("should perform ROR zero page instruction", () => {
      const cpu = createCPU();
      
      // Set up CPU state
      cpu.p &= ~CARRY; // Clear carry flag
      
      // Set up memory
      cpu.mem[0] = 0x66; // ROR zero page
      cpu.mem[1] = 0x42; // Zero page address
      cpu.mem[0x42] = 0x41; // Value to rotate
      
      const cycles = step6502(cpu);
      
      expect(cpu.mem[0x42]).toBe(0x20); // 00100000
      expect(cpu.p & CARRY).toBe(CARRY); // Old bit 0 was 1
      expect(cpu.p & NEGATIVE).toBe(0); // Result has bit 7 clear
      expect(cpu.pc).toBe(2);
      expect(cycles).toBe(5);
    });
    
    it("should perform ROR absolute instruction", () => {
      const cpu = createCPU();
      
      // Set up CPU state
      cpu.p &= ~CARRY; // Clear carry flag
      
      // Set up memory
      cpu.mem[0] = 0x6E; // ROR absolute
      cpu.mem[1] = 0x34; // Low byte of address
      cpu.mem[2] = 0x12; // High byte of address
      cpu.mem[0x1234] = 0x41; // Value to rotate
      
      const cycles = step6502(cpu);
      
      expect(cpu.mem[0x1234]).toBe(0x20); // 00100000
      expect(cpu.p & CARRY).toBe(CARRY); // Old bit 0 was 1
      expect(cpu.p & NEGATIVE).toBe(0); // Result has bit 7 clear
      expect(cpu.pc).toBe(3);
      expect(cycles).toBe(6);
    });
    
    it("should handle ASL with zero result", () => {
      const cpu = createCPU();
      
      // Set up CPU state
      cpu.a = 0x80; // 10000000
      
      // Set up memory
      cpu.mem[0] = 0x0A; // ASL A
      
      const cycles = step6502(cpu);
      
      expect(cpu.a).toBe(0x00); // 00000000
      expect(cpu.p & CARRY).toBe(CARRY); // Bit 7 was 1
      expect(cpu.p & ZERO).toBe(ZERO); // Result is zero
      expect(cpu.p & NEGATIVE).toBe(0); // Result is not negative
      expect(cpu.pc).toBe(1);
      expect(cycles).toBe(2);
    });
  });

  // Jump and subroutine instructions
  describe("Jump and subroutine instructions", () => {
    it("should perform JMP absolute instruction", () => {
      const cpu = createCPU();
      
      // Set up memory
      cpu.mem[0] = 0x4C; // JMP absolute
      cpu.mem[1] = 0x34; // Low byte of target
      cpu.mem[2] = 0x12; // High byte of target
      
      const cycles = step6502(cpu);
      
      expect(cpu.pc).toBe(0x1234);
      expect(cycles).toBe(3);
    });
    
    it("should perform JSR and RTS instructions", () => {
      const cpu = createCPU();
      
      // Set up memory for JSR
      cpu.mem[0] = 0x20; // JSR absolute
      cpu.mem[1] = 0x34; // Low byte of target
      cpu.mem[2] = 0x12; // High byte of target
      
      // Set up RTS at target location
      cpu.mem[0x1234] = 0x60; // RTS
      
      // Execute JSR
      let cycles = step6502(cpu);
      
      expect(cpu.pc).toBe(0x1234);
      expect(cpu.sp).toBe(0xFB); // SP decremented by 2 (for 16-bit return address)
      expect(cpu.mem[0x01FC]).toBe(0x00); // Low byte of return address - 1
      expect(cpu.mem[0x01FD]).toBe(0x00); // High byte of return address - 1
      expect(cycles).toBe(6);
      
      // Execute RTS
      cycles = step6502(cpu);
      
      expect(cpu.pc).toBe(0x0002); // Return address + 2
      expect(cpu.sp).toBe(0xFD); // SP incremented by 2
      expect(cycles).toBe(6);
    });
  });

  // Status flag instructions
  describe("Status flag instructions", () => {
    it("should perform CLC instruction", () => {
      const cpu = createCPU();
      
      // Set up CPU state
      cpu.p |= CARRY; // Set carry flag
      
      // Set up memory
      cpu.mem[0] = 0x18; // CLC
      
      const cycles = step6502(cpu);
      
      expect(cpu.p & CARRY).toBe(0); // Carry should be cleared
      expect(cpu.pc).toBe(1);
      expect(cycles).toBe(2);
    });
    
    it("should perform SEC instruction", () => {
      const cpu = createCPU();
      
      // Set up CPU state
      cpu.p &= ~CARRY; // Clear carry flag
      
      // Set up memory
      cpu.mem[0] = 0x38; // SEC
      
      const cycles = step6502(cpu);
      
      expect(cpu.p & CARRY).toBe(CARRY); // Carry should be set
      expect(cpu.pc).toBe(1);
      expect(cycles).toBe(2);
    });
    
    it("should perform CLI instruction", () => {
      const cpu = createCPU();
      
      // Set up CPU state
      cpu.p |= INTERRUPT; // Set interrupt disable flag
      
      // Set up memory
      cpu.mem[0] = 0x58; // CLI
      
      const cycles = step6502(cpu);
      
      expect(cpu.p & INTERRUPT).toBe(0); // Interrupt disable should be cleared
      expect(cpu.pc).toBe(1);
      expect(cycles).toBe(2);
    });
    
    it("should perform SEI instruction", () => {
      const cpu = createCPU();
      
      // Set up CPU state
      cpu.p &= ~INTERRUPT; // Clear interrupt disable flag
      
      // Set up memory
      cpu.mem[0] = 0x78; // SEI
      
      const cycles = step6502(cpu);
      
      expect(cpu.p & INTERRUPT).toBe(INTERRUPT); // Interrupt disable should be set
      expect(cpu.pc).toBe(1);
      expect(cycles).toBe(2);
    });
    
    it("should perform CLD instruction", () => {
      const cpu = createCPU();
      
      // Set up CPU state
      cpu.p |= DECIMAL; // Set decimal flag
      
      // Set up memory
      cpu.mem[0] = 0xD8; // CLD
      
      const cycles = step6502(cpu);
      
      expect(cpu.p & DECIMAL).toBe(0); // Decimal flag should be cleared
      expect(cpu.pc).toBe(1);
      expect(cycles).toBe(2);
    });
    
    it("should perform SED instruction", () => {
      const cpu = createCPU();
      
      // Set up CPU state
      cpu.p &= ~DECIMAL; // Clear decimal flag
      
      // Set up memory
      cpu.mem[0] = 0xF8; // SED
      
      const cycles = step6502(cpu);
      
      expect(cpu.p & DECIMAL).toBe(DECIMAL); // Decimal flag should be set
      expect(cpu.pc).toBe(1);
      expect(cycles).toBe(2);
    });
    
    it("should perform CLV instruction", () => {
      const cpu = createCPU();
      
      // Set up CPU state
      cpu.p |= OVERFLOW; // Set overflow flag
      
      // Set up memory
      cpu.mem[0] = 0xB8; // CLV
      
      const cycles = step6502(cpu);
      
      expect(cpu.p & OVERFLOW).toBe(0); // Overflow flag should be cleared
      expect(cpu.pc).toBe(1);
      expect(cycles).toBe(2);
    });
  });

  // Branch instructions
  describe("Branch instructions", () => {
    it("should perform BCC instruction (branch taken)", () => {
      const cpu = createCPU();
      
      // Set up CPU state
      cpu.p &= ~CARRY; // Clear carry flag
      
      // Set up memory
      cpu.mem[0] = 0x90; // BCC
      cpu.mem[1] = 0x10; // Branch offset (forward 16 bytes)
      
      const cycles = step6502(cpu);
      
      expect(cpu.pc).toBe(0x12); // 0x02 + 0x10 = 0x12
      expect(cycles).toBe(3); // Base cycles (2) + branch taken (1)
    });
    
    it("should perform BCC instruction (branch not taken)", () => {
      const cpu = createCPU();
      
      // Set up CPU state
      cpu.p |= CARRY; // Set carry flag
      
      // Set up memory
      cpu.mem[0] = 0x90; // BCC
      cpu.mem[1] = 0x10; // Branch offset (forward 16 bytes)
      
      const cycles = step6502(cpu);
      
      expect(cpu.pc).toBe(0x02); // PC advances past the branch instruction
      expect(cycles).toBe(2); // Base cycles (2) only
    });
    
    it("should add cycle when branch crosses page boundary", () => {
      const cpu = createCPU();
      
      // Set up CPU state
      cpu.p &= ~CARRY; // Clear carry flag
      cpu.pc = 0x00F0; // Set PC near page boundary
      
      // Set up memory
      cpu.mem[0x00F0] = 0x90; // BCC
      cpu.mem[0x00F1] = 0x20; // Branch offset (forward 32 bytes)
      
      const cycles = step6502(cpu);
      
      expect(cpu.pc).toBe(0x0112); // 0x00F2 + 0x20 = 0x0112 (crosses page boundary)
      expect(cycles).toBe(4); // Base cycles (2) + branch taken (1) + page boundary (1)
    });

    it("should handle negative branch offset", () => {
      const cpu = createCPU();
      
      // Set up CPU state
      cpu.p &= ~CARRY; // Clear carry flag
      cpu.pc = 0x0080;
      
      // Set up memory
      cpu.mem[0x0080] = 0x90; // BCC
      cpu.mem[0x0081] = 0xFE; // Branch offset (-2 in two's complement)
      
      const cycles = step6502(cpu);
      
      expect(cpu.pc).toBe(0x0080); // 0x0082 - 2 = 0x0080 (branch back to the BCC instruction)
      expect(cycles).toBe(3); // Base cycles (2) + branch taken (1)
    });
    
    it("should perform all branch instructions correctly", () => {
      const cpu = createCPU();
      
      // Test BCS (Branch if Carry Set)
      cpu.pc = 0;
      cpu.p |= CARRY; // Set carry flag
      cpu.mem[0] = 0xB0; // BCS
      cpu.mem[1] = 0x10; // Branch offset
      
      let cycles = step6502(cpu);
      expect(cpu.pc).toBe(0x12); // Should branch
      expect(cycles).toBe(3);
      
      // Test BEQ (Branch if Equal/Zero Set)
      cpu.pc = 0;
      cpu.p |= ZERO; // Set zero flag
      cpu.mem[0] = 0xF0; // BEQ
      
      cycles = step6502(cpu);
      expect(cpu.pc).toBe(0x12); // Should branch
      expect(cycles).toBe(3);
      
      // Test BNE (Branch if Not Equal/Zero Clear)
      cpu.pc = 0;
      cpu.p &= ~ZERO; // Clear zero flag
      cpu.mem[0] = 0xD0; // BNE
      
      cycles = step6502(cpu);
      expect(cpu.pc).toBe(0x12); // Should branch
      expect(cycles).toBe(3);
      
      // Test BMI (Branch if Minus/Negative Set)
      cpu.pc = 0;
      cpu.p |= NEGATIVE; // Set negative flag
      cpu.mem[0] = 0x30; // BMI
      
      cycles = step6502(cpu);
      expect(cpu.pc).toBe(0x12); // Should branch
      expect(cycles).toBe(3);
      
      // Test BPL (Branch if Plus/Negative Clear)
      cpu.pc = 0;
      cpu.p &= ~NEGATIVE; // Clear negative flag
      cpu.mem[0] = 0x10; // BPL
      
      cycles = step6502(cpu);
      expect(cpu.pc).toBe(0x12); // Should branch
      expect(cycles).toBe(3);
      
      // Test BVC (Branch if Overflow Clear)
      cpu.pc = 0;
      cpu.p &= ~OVERFLOW; // Clear overflow flag
      cpu.mem[0] = 0x50; // BVC
      
      cycles = step6502(cpu);
      expect(cpu.pc).toBe(0x12); // Should branch
      expect(cycles).toBe(3);
      
      // Test BVS (Branch if Overflow Set)
      cpu.pc = 0;
      cpu.p |= OVERFLOW; // Set overflow flag
      cpu.mem[0] = 0x70; // BVS
      
      cycles = step6502(cpu);
      expect(cpu.pc).toBe(0x12); // Should branch
      expect(cycles).toBe(3);
    });
  });

  // NOP instruction
  describe("System functions", () => {
    it("should perform NOP instruction", () => {
      const cpu = createCPU();
      
      // Set up memory
      cpu.mem[0] = 0xEA; // NOP
      
      const cycles = step6502(cpu);
      
      expect(cpu.pc).toBe(1);
      expect(cycles).toBe(2);
      // NOP should not affect any registers or flags
    });

    it("should allow trace logging", () => {
      const cpu = createCPU();
      
      // Set up memory
      cpu.mem[0] = 0xEA; // NOP
      
      // With trace logging enabled
      const cycles = step6502(cpu, true);
      
      expect(cpu.pc).toBe(1);
      expect(cycles).toBe(2);
    });

    // Add test for unknown opcodes
    it("should handle unknown opcodes", () => {
      const cpu = createCPU();
      
      // Set up invalid opcode
      cpu.mem[0] = 0xFF; // Invalid opcode
      
      const cycles = step6502(cpu);
      cpu.pc = 0; // Reset PC for second test
      const cyclesWithTrace = step6502(cpu, true);
      
      expect(cycles).toBe(2);
      expect(cyclesWithTrace).toBe(2);
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
    
    it("should perform AND zero page instruction", () => {
      const cpu = createCPU();
      
      // Set up CPU state
      cpu.a = 0xF0;
      
      // Set up memory
      cpu.mem[0] = 0x25; // AND zero page
      cpu.mem[1] = 0x42; // Zero page address
      cpu.mem[0x42] = 0x0F; // Value to AND with accumulator
      
      const cycles = step6502(cpu);
      
      expect(cpu.a).toBe(0x00); // 0xF0 & 0x0F = 0x00
      expect(cpu.pc).toBe(2);
      expect(cycles).toBe(3);
      expect(cpu.p & ZERO).toBe(ZERO); // Zero flag should be set
    });

    it("should perform AND zero page,X instruction", () => {
      const cpu = createCPU();
      
      // Set up CPU state
      cpu.a = 0xF0;
      cpu.x = 0x05;
      
      // Set up memory
      cpu.mem[0] = 0x35; // AND zero page,X
      cpu.mem[1] = 0x42; // Zero page address
      cpu.mem[0x47] = 0x0F; // Value at (zero page address + X)
      
      const cycles = step6502(cpu);
      
      expect(cpu.a).toBe(0x00); // 0xF0 & 0x0F = 0x00
      expect(cpu.pc).toBe(2);
      expect(cycles).toBe(4);
      expect(cpu.p & ZERO).toBe(ZERO); // Zero flag should be set
    });

    it("should perform AND absolute instruction", () => {
      const cpu = createCPU();
      
      // Set up CPU state
      cpu.a = 0xF0;
      
      // Set up memory
      cpu.mem[0] = 0x2D; // AND absolute
      cpu.mem[1] = 0x34; // Low byte of address
      cpu.mem[2] = 0x12; // High byte of address
      cpu.mem[0x1234] = 0x0F; // Value at absolute address
      
      const cycles = step6502(cpu);
      
      expect(cpu.a).toBe(0x00); // 0xF0 & 0x0F = 0x00
      expect(cpu.pc).toBe(3);
      expect(cycles).toBe(4);
      expect(cpu.p & ZERO).toBe(ZERO); // Zero flag should be set
    });
    
    // Add tests for the remaining AND addressing modes
    it("should perform AND absolute,X instruction", () => {
      const cpu = createCPU();
      
      // Set up CPU state
      cpu.a = 0xF0;
      cpu.x = 0x05;
      
      // Set up memory
      cpu.mem[0] = 0x3D; // AND absolute,X
      cpu.mem[1] = 0x34; // Low byte of address
      cpu.mem[2] = 0x12; // High byte of address
      cpu.mem[0x1239] = 0x0F; // Value at (absolute address + X)
      
      const cycles = step6502(cpu);
      
      expect(cpu.a).toBe(0x00); // 0xF0 & 0x0F = 0x00
      expect(cpu.pc).toBe(3);
      expect(cycles).toBe(4);
      expect(cpu.p & ZERO).toBe(ZERO); // Zero flag should be set
    });
    
    it("should add cycle for AND absolute,X with page crossing", () => {
      const cpu = createCPU();
      
      // Set up CPU state
      cpu.a = 0xF0;
      cpu.x = 0xFF;
      
      // Set up memory
      cpu.mem[0] = 0x3D; // AND absolute,X
      cpu.mem[1] = 0x02; // Low byte of address
      cpu.mem[2] = 0x12; // High byte of address
      cpu.mem[0x1301] = 0x0F; // Value at (absolute address + X) with page crossing
      
      const cycles = step6502(cpu);
      
      expect(cpu.a).toBe(0x00); // 0xF0 & 0x0F = 0x00
      expect(cpu.pc).toBe(3);
      expect(cycles).toBe(5); // Extra cycle for page crossing
    });
    
    it("should perform AND absolute,Y instruction", () => {
      const cpu = createCPU();
      
      // Set up CPU state
      cpu.a = 0xF0;
      cpu.y = 0x05;
      
      // Set up memory
      cpu.mem[0] = 0x39; // AND absolute,Y
      cpu.mem[1] = 0x34; // Low byte of address
      cpu.mem[2] = 0x12; // High byte of address
      cpu.mem[0x1239] = 0x0F; // Value at (absolute address + Y)
      
      const cycles = step6502(cpu);
      
      expect(cpu.a).toBe(0x00); // 0xF0 & 0x0F = 0x00
      expect(cpu.pc).toBe(3);
      expect(cycles).toBe(4);
    });
    
    it("should perform AND (indirect,X) instruction", () => {
      const cpu = createCPU();
      
      // Set up CPU state
      cpu.a = 0xF0;
      cpu.x = 0x04;
      
      // Set up memory (pointer in zero page)
      cpu.mem[0] = 0x21; // AND (indirect,X)
      cpu.mem[1] = 0x20; // Zero page address
      
      // Effective address stored at (zero page + X) in little endian
      cpu.mem[0x24] = 0x74; // Low byte of effective address
      cpu.mem[0x25] = 0x20; // High byte of effective address
      
      // Value at effective address
      cpu.mem[0x2074] = 0x0F;
      
      const cycles = step6502(cpu);
      
      expect(cpu.a).toBe(0x00); // 0xF0 & 0x0F = 0x00
      expect(cpu.pc).toBe(2);
      expect(cycles).toBe(6);
      expect(cpu.p & ZERO).toBe(ZERO); // Zero flag should be set
    });
    
    it("should perform AND (indirect),Y instruction", () => {
      const cpu = createCPU();
      
      // Set up CPU state
      cpu.a = 0xF0;
      cpu.y = 0x10;
      
      // Set up memory
      cpu.mem[0] = 0x31; // AND (indirect),Y
      cpu.mem[1] = 0x20; // Zero page address
      
      // Effective base address stored at zero page in little endian
      cpu.mem[0x20] = 0x74; // Low byte of base address
      cpu.mem[0x21] = 0x20; // High byte of base address
      
      // Value at (base address + Y)
      cpu.mem[0x2084] = 0x0F;
      
      const cycles = step6502(cpu);
      
      expect(cpu.a).toBe(0x00); // 0xF0 & 0x0F = 0x00
      expect(cpu.pc).toBe(2);
      expect(cycles).toBe(5);
      expect(cpu.p & ZERO).toBe(ZERO); // Zero flag should be set
    });
    
    it("should add cycle for AND (indirect),Y with page crossing", () => {
      const cpu = createCPU();
      
      // Set up CPU state
      cpu.a = 0xF0;
      cpu.y = 0xFF;
      
      // Set up memory
      cpu.mem[0] = 0x31; // AND (indirect),Y
      cpu.mem[1] = 0x20; // Zero page address
      
      // Effective base address stored at zero page in little endian
      cpu.mem[0x20] = 0x01; // Low byte of base address
      cpu.mem[0x21] = 0x20; // High byte of base address
      
      // Value at (base address + Y) with page crossing
      cpu.mem[0x2100] = 0x0F;
      
      const cycles = step6502(cpu);
      
      expect(cpu.a).toBe(0x00); // 0xF0 & 0x0F = 0x00
      expect(cpu.pc).toBe(2);
      expect(cycles).toBe(6); // Extra cycle for page crossing
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
    
    it("should perform ORA zero page instruction", () => {
      const cpu = createCPU();
      
      // Set up CPU state
      cpu.a = 0xF0;
      
      // Set up memory
      cpu.mem[0] = 0x05; // ORA zero page
      cpu.mem[1] = 0x42; // Zero page address
      cpu.mem[0x42] = 0x0F; // Value to OR with accumulator
      
      const cycles = step6502(cpu);
      
      expect(cpu.a).toBe(0xFF); // 0xF0 | 0x0F = 0xFF
      expect(cpu.pc).toBe(2);
      expect(cycles).toBe(3);
      expect(cpu.p & NEGATIVE).toBe(NEGATIVE); // Negative flag should be set
    });
    
    it("should perform ORA absolute instruction", () => {
      const cpu = createCPU();
      
      // Set up CPU state
      cpu.a = 0xF0;
      
      // Set up memory
      cpu.mem[0] = 0x0D; // ORA absolute
      cpu.mem[1] = 0x34; // Low byte of address
      cpu.mem[2] = 0x12; // High byte of address
      cpu.mem[0x1234] = 0x0F; // Value at absolute address
      
      const cycles = step6502(cpu);
      
      expect(cpu.a).toBe(0xFF); // 0xF0 | 0x0F = 0xFF
      expect(cpu.pc).toBe(3);
      expect(cycles).toBe(4);
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
    
    it("should perform EOR zero page instruction", () => {
      const cpu = createCPU();
      
      // Set up CPU state
      cpu.a = 0xFF;
      
      // Set up memory
      cpu.mem[0] = 0x45; // EOR zero page
      cpu.mem[1] = 0x42; // Zero page address
      cpu.mem[0x42] = 0xF0; // Value to XOR with accumulator
      
      const cycles = step6502(cpu);
      
      expect(cpu.a).toBe(0x0F); // 0xFF ^ 0xF0 = 0x0F
      expect(cpu.pc).toBe(2);
      expect(cycles).toBe(3);
    });
    
    it("should perform EOR absolute instruction", () => {
      const cpu = createCPU();
      
      // Set up CPU state
      cpu.a = 0xFF;
      
      // Set up memory
      cpu.mem[0] = 0x4D; // EOR absolute
      cpu.mem[1] = 0x34; // Low byte of address
      cpu.mem[2] = 0x12; // High byte of address
      cpu.mem[0x1234] = 0xF0; // Value at absolute address
      
      const cycles = step6502(cpu);
      
      expect(cpu.a).toBe(0x0F); // 0xFF ^ 0xF0 = 0x0F
      expect(cpu.pc).toBe(3);
      expect(cycles).toBe(4);
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
    
    it("should perform BIT absolute instruction", () => {
      const cpu = createCPU();
      
      // Set up CPU state
      cpu.a = 0x0F;
      cpu.p = 0; // Clear all flags
      
      // Set up memory
      cpu.mem[0] = 0x2C; // BIT absolute
      cpu.mem[1] = 0x34; // Low byte of address
      cpu.mem[2] = 0x12; // High byte of address
      cpu.mem[0x1234] = 0xC0; // Test value (bits 7 and 6 are set)
      
      const cycles = step6502(cpu);
      
      // BIT sets N and V from bits 7 and 6 of memory
      expect(cpu.p & NEGATIVE).toBe(NEGATIVE); // Bit 7 of memory -> N flag
      expect(cpu.p & OVERFLOW).toBe(OVERFLOW); // Bit 6 of memory -> V flag
      
      // BIT sets Z based on AND result
      expect(cpu.p & ZERO).toBe(ZERO); // 0x0F & 0xC0 = 0, so Z flag is set
      
      // Accumulator should not be modified
      expect(cpu.a).toBe(0x0F);
      expect(cpu.pc).toBe(3);
      expect(cycles).toBe(4);
    });
    
    it("should correctly handle BIT with matching bits", () => {
      const cpu = createCPU();
      
      // Set up CPU state
      cpu.a = 0xC0; // Matches the test value
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
      expect(cpu.p & ZERO).toBe(0); // 0xC0 & 0xC0 = 0xC0, so Z flag should be clear
      
      // Accumulator should not be modified
      expect(cpu.a).toBe(0xC0);
      expect(cpu.pc).toBe(2);
      expect(cycles).toBe(3);
    });
  });
});
