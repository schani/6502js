import { describe, expect, it } from "bun:test";
import { type CPU, createCPU, step6502, CARRY, ZERO, INTERRUPT, DECIMAL, BREAK, UNUSED, OVERFLOW, NEGATIVE } from "./utils";

describe("ADC and SBC with different addressing modes", () => {
  // Test ADC with all addressing modes
  it("should perform ADC with zero page addressing", () => {
    const cpu = createCPU();
    
    // Setup
    cpu.mem[0] = 0x65; // ADC Zero Page
    cpu.mem[1] = 0x80; // Zero page address
    cpu.mem[0x80] = 0x42; // Value at zero page address
    
    cpu.a = 0x10; // Initial value in A
    cpu.p &= ~CARRY; // Clear carry flag
    cpu.pc = 0;
    
    // Execute
    const cycles = step6502(cpu);
    
    // Verify
    expect(cycles).toBe(3);
    expect(cpu.a).toBe(0x52); // 0x10 + 0x42 = 0x52
    expect(cpu.p & CARRY).toBe(0); // No carry out
    expect(cpu.p & ZERO).toBe(0); // Result is not zero
    expect(cpu.p & OVERFLOW).toBe(0); // No signed overflow
    expect(cpu.p & NEGATIVE).toBe(0); // Result is positive
  });
  
  it("should perform ADC with zero page,X addressing", () => {
    const cpu = createCPU();
    
    // Setup
    cpu.mem[0] = 0x75; // ADC Zero Page,X
    cpu.mem[1] = 0x80; // Zero page address
    cpu.mem[0x90] = 0x42; // Value at 0x80 + 0x10 (with zero page wrap-around)
    
    cpu.a = 0x10; // Initial value in A
    cpu.x = 0x10; // X offset
    cpu.p |= CARRY; // Set carry flag
    cpu.pc = 0;
    
    // Execute
    const cycles = step6502(cpu);
    
    // Verify
    expect(cycles).toBe(4);
    expect(cpu.a).toBe(0x53); // 0x10 + 0x42 + 0x01 (carry) = 0x53
    expect(cpu.p & CARRY).toBe(0); // No carry out
    expect(cpu.p & ZERO).toBe(0); // Result is not zero
    expect(cpu.p & OVERFLOW).toBe(0); // No signed overflow
    expect(cpu.p & NEGATIVE).toBe(0); // Result is positive
  });
  
  it("should perform ADC with absolute addressing", () => {
    const cpu = createCPU();
    
    // Setup
    cpu.mem[0] = 0x6D; // ADC Absolute
    cpu.mem[1] = 0x00; // Low byte of address
    cpu.mem[2] = 0x20; // High byte of address (0x2000)
    cpu.mem[0x2000] = 0xD0; // Value at absolute address
    
    cpu.a = 0x10; // Initial value in A
    cpu.p &= ~CARRY; // Clear carry flag
    cpu.pc = 0;
    
    // Execute
    const cycles = step6502(cpu);
    
    // Verify
    expect(cycles).toBe(4);
    expect(cpu.a).toBe(0xE0); // 0x10 + 0xD0 = 0xE0
    expect(cpu.p & CARRY).toBe(0); // No carry out
    expect(cpu.p & ZERO).toBe(0); // Result is not zero
    expect(cpu.p & OVERFLOW).toBe(0); // No signed overflow
    expect(cpu.p & NEGATIVE).toBe(NEGATIVE); // Result is negative (bit 7 set)
  });
  
  it("should perform ADC with absolute,X addressing", () => {
    const cpu = createCPU();
    
    // Setup
    cpu.mem[0] = 0x7D; // ADC Absolute,X
    cpu.mem[1] = 0x00; // Low byte of address
    cpu.mem[2] = 0x20; // High byte of address (0x2000)
    cpu.mem[0x2010] = 0x40; // Value at 0x2000 + 0x10 = 0x2010
    
    cpu.a = 0x10; // Initial value in A
    cpu.x = 0x10; // X offset
    cpu.p &= ~CARRY; // Clear carry flag
    cpu.pc = 0;
    
    // Execute
    const cycles = step6502(cpu);
    
    // Verify
    expect(cycles).toBe(4); // No page boundary crossed
    expect(cpu.a).toBe(0x50); // 0x10 + 0x40 = 0x50
    expect(cpu.p & CARRY).toBe(0); // No carry out
  });
  
  it("should perform ADC with absolute,X addressing and page crossing", () => {
    const cpu = createCPU();
    
    // Setup
    cpu.mem[0] = 0x7D; // ADC Absolute,X
    cpu.mem[1] = 0xF0; // Low byte of address
    cpu.mem[2] = 0x20; // High byte of address (0x20F0)
    cpu.mem[0x2100] = 0x40; // Value at 0x20F0 + 0x10 = 0x2100 (page boundary crossed)
    
    cpu.a = 0x10; // Initial value in A
    cpu.x = 0x10; // X offset
    cpu.p &= ~CARRY; // Clear carry flag
    cpu.pc = 0;
    
    // Execute
    const cycles = step6502(cpu);
    
    // Verify
    expect(cycles).toBe(5); // +1 cycle for page boundary crossing
    expect(cpu.a).toBe(0x50); // 0x10 + 0x40 = 0x50
  });
  
  it("should perform ADC with absolute,Y addressing", () => {
    const cpu = createCPU();
    
    // Setup
    cpu.mem[0] = 0x79; // ADC Absolute,Y
    cpu.mem[1] = 0x00; // Low byte of address
    cpu.mem[2] = 0x20; // High byte of address (0x2000)
    cpu.mem[0x2010] = 0x70; // Value at 0x2000 + 0x10 = 0x2010
    
    cpu.a = 0x10; // Initial value in A
    cpu.y = 0x10; // Y offset
    cpu.p &= ~CARRY; // Clear carry flag
    cpu.pc = 0;
    
    // Execute
    const cycles = step6502(cpu);
    
    // Verify
    expect(cycles).toBe(4); // No page boundary crossed
    expect(cpu.a).toBe(0x80); // 0x10 + 0x70 = 0x80
    expect(cpu.p & NEGATIVE).toBe(NEGATIVE); // Result is negative (bit 7 set)
  });
  
  it("should perform ADC with (Indirect,X) addressing", () => {
    const cpu = createCPU();
    
    // Setup
    cpu.mem[0] = 0x61; // ADC (Indirect,X)
    cpu.mem[1] = 0x80; // Zero page address
    cpu.mem[0x90] = 0x00; // Low byte of effective address (0x80 + 0x10 = 0x90)
    cpu.mem[0x91] = 0x20; // High byte of effective address (0x2000)
    cpu.mem[0x2000] = 0x35; // Value at effective address
    
    cpu.a = 0x10; // Initial value in A
    cpu.x = 0x10; // X offset
    cpu.p &= ~CARRY; // Clear carry flag
    cpu.pc = 0;
    
    // Execute
    const cycles = step6502(cpu);
    
    // Verify
    expect(cycles).toBe(6);
    expect(cpu.a).toBe(0x45); // 0x10 + 0x35 = 0x45
  });
  
  it("should perform ADC with (Indirect),Y addressing", () => {
    const cpu = createCPU();
    
    // Setup
    cpu.mem[0] = 0x71; // ADC (Indirect),Y
    cpu.mem[1] = 0x80; // Zero page address
    cpu.mem[0x80] = 0x00; // Low byte of indirect address
    cpu.mem[0x81] = 0x20; // High byte of indirect address (0x2000)
    cpu.mem[0x2010] = 0x25; // Value at 0x2000 + 0x10 = 0x2010
    
    cpu.a = 0x10; // Initial value in A
    cpu.y = 0x10; // Y offset
    cpu.p &= ~CARRY; // Clear carry flag
    cpu.pc = 0;
    
    // Execute
    const cycles = step6502(cpu);
    
    // Verify
    expect(cycles).toBe(5); // No page boundary crossed
    expect(cpu.a).toBe(0x35); // 0x10 + 0x25 = 0x35
  });
  
  it("should perform ADC with (Indirect),Y addressing and page crossing", () => {
    const cpu = createCPU();
    
    // Setup
    cpu.mem[0] = 0x71; // ADC (Indirect),Y
    cpu.mem[1] = 0x80; // Zero page address
    cpu.mem[0x80] = 0xF0; // Low byte of indirect address
    cpu.mem[0x81] = 0x20; // High byte of indirect address (0x20F0)
    cpu.mem[0x2100] = 0x25; // Value at 0x20F0 + 0x10 = 0x2100 (page boundary crossed)
    
    cpu.a = 0x10; // Initial value in A
    cpu.y = 0x10; // Y offset
    cpu.p &= ~CARRY; // Clear carry flag
    cpu.pc = 0;
    
    // Execute
    const cycles = step6502(cpu);
    
    // Verify
    expect(cycles).toBe(6); // +1 cycle for page boundary crossing
    expect(cpu.a).toBe(0x35); // 0x10 + 0x25 = 0x35
  });
  
  // Test SBC with all addressing modes
  it("should perform SBC with zero page addressing", () => {
    const cpu = createCPU();
    
    // Setup
    cpu.mem[0] = 0xE5; // SBC Zero Page
    cpu.mem[1] = 0x80; // Zero page address
    cpu.mem[0x80] = 0x20; // Value at zero page address
    
    cpu.a = 0x50; // Initial value in A
    cpu.p |= CARRY; // Set carry flag (no borrow)
    cpu.pc = 0;
    
    // Execute
    const cycles = step6502(cpu);
    
    // Verify
    expect(cycles).toBe(3);
    expect(cpu.a).toBe(0x30); // 0x50 - 0x20 = 0x30
    expect(cpu.p & CARRY).toBe(CARRY); // No borrow (carry set)
    expect(cpu.p & ZERO).toBe(0); // Result is not zero
    expect(cpu.p & OVERFLOW).toBe(0); // No signed overflow
    expect(cpu.p & NEGATIVE).toBe(0); // Result is positive
  });
  
  it("should perform SBC with zero page,X addressing", () => {
    const cpu = createCPU();
    
    // Setup
    cpu.mem[0] = 0xF5; // SBC Zero Page,X
    cpu.mem[1] = 0x80; // Zero page address
    cpu.mem[0x90] = 0x20; // Value at 0x80 + 0x10 (with zero page wrap-around)
    
    cpu.a = 0x50; // Initial value in A
    cpu.x = 0x10; // X offset
    cpu.p &= ~CARRY; // Clear carry flag (borrow)
    cpu.pc = 0;
    
    // Execute
    const cycles = step6502(cpu);
    
    // Verify
    expect(cycles).toBe(4);
    expect(cpu.a).toBe(0x2F); // 0x50 - 0x20 - 0x01 (borrow) = 0x2F
    expect(cpu.p & CARRY).toBe(CARRY); // No borrow out (carry set after operation)
  });
  
  it("should perform SBC with absolute addressing", () => {
    const cpu = createCPU();
    
    // Setup
    cpu.mem[0] = 0xED; // SBC Absolute
    cpu.mem[1] = 0x00; // Low byte of address
    cpu.mem[2] = 0x20; // High byte of address (0x2000)
    cpu.mem[0x2000] = 0x60; // Value at absolute address
    
    cpu.a = 0x40; // Initial value in A
    cpu.p |= CARRY; // Set carry flag (no borrow)
    cpu.pc = 0;
    
    // Execute
    const cycles = step6502(cpu);
    
    // Verify
    expect(cycles).toBe(4);
    expect(cpu.a).toBe(0xE0); // 0x40 - 0x60 = 0xE0
    expect(cpu.p & CARRY).toBe(0); // Borrow out (carry clear)
    expect(cpu.p & NEGATIVE).toBe(NEGATIVE); // Result is negative
  });
  
  it("should perform SBC with absolute,X addressing", () => {
    const cpu = createCPU();
    
    // Setup
    cpu.mem[0] = 0xFD; // SBC Absolute,X
    cpu.mem[1] = 0x00; // Low byte of address
    cpu.mem[2] = 0x20; // High byte of address (0x2000)
    cpu.mem[0x2010] = 0x20; // Value at 0x2000 + 0x10 = 0x2010
    
    cpu.a = 0x50; // Initial value in A
    cpu.x = 0x10; // X offset
    cpu.p |= CARRY; // Set carry flag (no borrow)
    cpu.pc = 0;
    
    // Execute
    const cycles = step6502(cpu);
    
    // Verify
    expect(cycles).toBe(4); // No page boundary crossed
    expect(cpu.a).toBe(0x30); // 0x50 - 0x20 = 0x30
    expect(cpu.p & CARRY).toBe(CARRY); // No borrow out (carry set)
  });
  
  it("should perform SBC with absolute,X addressing and page crossing", () => {
    const cpu = createCPU();
    
    // Setup
    cpu.mem[0] = 0xFD; // SBC Absolute,X
    cpu.mem[1] = 0xF0; // Low byte of address
    cpu.mem[2] = 0x20; // High byte of address (0x20F0)
    cpu.mem[0x2100] = 0x20; // Value at 0x20F0 + 0x10 = 0x2100 (page boundary crossed)
    
    cpu.a = 0x50; // Initial value in A
    cpu.x = 0x10; // X offset
    cpu.p |= CARRY; // Set carry flag (no borrow)
    cpu.pc = 0;
    
    // Execute
    const cycles = step6502(cpu);
    
    // Verify
    expect(cycles).toBe(5); // +1 cycle for page boundary crossing
    expect(cpu.a).toBe(0x30); // 0x50 - 0x20 = 0x30
  });
  
  it("should perform SBC with absolute,Y addressing", () => {
    const cpu = createCPU();
    
    // Setup
    cpu.mem[0] = 0xF9; // SBC Absolute,Y
    cpu.mem[1] = 0x00; // Low byte of address
    cpu.mem[2] = 0x20; // High byte of address (0x2000)
    cpu.mem[0x2010] = 0x20; // Value at 0x2000 + 0x10 = 0x2010
    
    cpu.a = 0x50; // Initial value in A
    cpu.y = 0x10; // Y offset
    cpu.p |= CARRY; // Set carry flag (no borrow)
    cpu.pc = 0;
    
    // Execute
    const cycles = step6502(cpu);
    
    // Verify
    expect(cycles).toBe(4); // No page boundary crossed
    expect(cpu.a).toBe(0x30); // 0x50 - 0x20 = 0x30
  });
  
  it("should perform SBC with (Indirect,X) addressing", () => {
    const cpu = createCPU();
    
    // Setup
    cpu.mem[0] = 0xE1; // SBC (Indirect,X)
    cpu.mem[1] = 0x80; // Zero page address
    cpu.mem[0x90] = 0x00; // Low byte of effective address (0x80 + 0x10 = 0x90)
    cpu.mem[0x91] = 0x20; // High byte of effective address (0x2000)
    cpu.mem[0x2000] = 0x25; // Value at effective address
    
    cpu.a = 0x50; // Initial value in A
    cpu.x = 0x10; // X offset
    cpu.p |= CARRY; // Set carry flag (no borrow)
    cpu.pc = 0;
    
    // Execute
    const cycles = step6502(cpu);
    
    // Verify
    expect(cycles).toBe(6);
    expect(cpu.a).toBe(0x2B); // 0x50 - 0x25 = 0x2B
    expect(cpu.p & CARRY).toBe(CARRY); // No borrow out (carry set)
  });
  
  it("should perform SBC with (Indirect),Y addressing", () => {
    const cpu = createCPU();
    
    // Setup
    cpu.mem[0] = 0xF1; // SBC (Indirect),Y
    cpu.mem[1] = 0x80; // Zero page address
    cpu.mem[0x80] = 0x00; // Low byte of indirect address
    cpu.mem[0x81] = 0x20; // High byte of indirect address (0x2000)
    cpu.mem[0x2010] = 0x10; // Value at 0x2000 + 0x10 = 0x2010
    
    cpu.a = 0x50; // Initial value in A
    cpu.y = 0x10; // Y offset
    cpu.p |= CARRY; // Set carry flag (no borrow)
    cpu.pc = 0;
    
    // Execute
    const cycles = step6502(cpu);
    
    // Verify
    expect(cycles).toBe(5); // No page boundary crossed
    expect(cpu.a).toBe(0x40); // 0x50 - 0x10 = 0x40
  });
  
  it("should perform SBC with (Indirect),Y addressing and page crossing", () => {
    const cpu = createCPU();
    
    // Setup
    cpu.mem[0] = 0xF1; // SBC (Indirect),Y
    cpu.mem[1] = 0x80; // Zero page address
    cpu.mem[0x80] = 0xF0; // Low byte of indirect address
    cpu.mem[0x81] = 0x20; // High byte of indirect address (0x20F0)
    cpu.mem[0x2100] = 0x10; // Value at 0x20F0 + 0x10 = 0x2100 (page boundary crossed)
    
    cpu.a = 0x50; // Initial value in A
    cpu.y = 0x10; // Y offset
    cpu.p |= CARRY; // Set carry flag (no borrow)
    cpu.pc = 0;
    
    // Execute
    const cycles = step6502(cpu);
    
    // Verify
    expect(cycles).toBe(6); // +1 cycle for page boundary crossing
    expect(cpu.a).toBe(0x40); // 0x50 - 0x10 = 0x40
  });
});