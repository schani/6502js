import { describe, expect, it } from "bun:test";
import { createCPU, step6502, ZERO, NEGATIVE, CARRY } from "../cpu";

describe("Extreme edge cases to achieve 100% coverage", () => {
  // Test ASL Zero Page,X with zero input (no carry out, zero result)
  it("should test ASL Zero Page,X with zero input", () => {
    const cpu = createCPU();
    
    cpu.pc = 0;
    cpu.mem[0] = 0x16; // ASL Zero Page,X
    cpu.mem[1] = 0x80; // Zero page address
    cpu.x = 0x01;      // X = 1, so effective address is 0x81
    cpu.mem[0x81] = 0x00; // Value to shift
    
    step6502(cpu);
    expect(cpu.mem[0x81]).toBe(0x00);
    expect(cpu.p & CARRY).toBe(0);     // No carry out
    expect(cpu.p & ZERO).toBe(ZERO);   // Zero flag set
  });
  
  // Test ASL Absolute,X with zero input (no carry out, zero result)
  it("should test ASL Absolute,X with zero input", () => {
    const cpu = createCPU();
    
    cpu.pc = 0;
    cpu.mem[0] = 0x1E; // ASL Absolute,X
    cpu.mem[1] = 0x00; // Low byte
    cpu.mem[2] = 0x10; // High byte
    cpu.x = 0x05;      // X = 5, so effective address is 0x1005
    cpu.mem[0x1005] = 0x00; // Value to shift
    
    step6502(cpu);
    expect(cpu.mem[0x1005]).toBe(0x00);
    expect(cpu.p & CARRY).toBe(0);     // No carry out
    expect(cpu.p & ZERO).toBe(ZERO);   // Zero flag set
  });
  
  // Test LSR Zero Page,X with zero input (no carry out, zero result)
  it("should test LSR Zero Page,X with zero input", () => {
    const cpu = createCPU();
    
    cpu.pc = 0;
    cpu.mem[0] = 0x56; // LSR Zero Page,X
    cpu.mem[1] = 0x80; // Zero page address
    cpu.x = 0x01;      // X = 1, so effective address is 0x81
    cpu.mem[0x81] = 0x00; // Value to shift
    
    step6502(cpu);
    expect(cpu.mem[0x81]).toBe(0x00);
    expect(cpu.p & CARRY).toBe(0);     // No carry out
    expect(cpu.p & ZERO).toBe(ZERO);   // Zero flag set
  });
  
  // Test LSR Absolute,X with zero input (no carry out, zero result)
  it("should test LSR Absolute,X with zero input", () => {
    const cpu = createCPU();
    
    cpu.pc = 0;
    cpu.mem[0] = 0x5E; // LSR Absolute,X
    cpu.mem[1] = 0x00; // Low byte
    cpu.mem[2] = 0x10; // High byte
    cpu.x = 0x05;      // X = 5, so effective address is 0x1005
    cpu.mem[0x1005] = 0x00; // Value to shift
    
    step6502(cpu);
    expect(cpu.mem[0x1005]).toBe(0x00);
    expect(cpu.p & CARRY).toBe(0);     // No carry out
    expect(cpu.p & ZERO).toBe(ZERO);   // Zero flag set
  });
  
  // Test ROL Zero Page,X with zero input (no carry out, zero/carry result)
  it("should test ROL Zero Page,X with zero input", () => {
    const cpu = createCPU();
    
    // Test with carry clear
    cpu.pc = 0;
    cpu.mem[0] = 0x36; // ROL Zero Page,X
    cpu.mem[1] = 0x80; // Zero page address
    cpu.x = 0x01;      // X = 1, so effective address is 0x81
    cpu.mem[0x81] = 0x00; // Value to rotate
    cpu.p = 0;         // Clear carry flag
    
    step6502(cpu);
    expect(cpu.mem[0x81]).toBe(0x00);
    expect(cpu.p & CARRY).toBe(0);     // No carry out
    expect(cpu.p & ZERO).toBe(ZERO);   // Zero flag set
    
    // Test with carry set
    cpu.pc = 0;
    cpu.mem[0] = 0x36; // ROL Zero Page,X
    cpu.mem[1] = 0x80; // Zero page address
    cpu.x = 0x01;      // X = 1, so effective address is 0x81
    cpu.mem[0x81] = 0x00; // Value to rotate
    cpu.p = CARRY;     // Set carry flag
    
    step6502(cpu);
    expect(cpu.mem[0x81]).toBe(0x01);
    expect(cpu.p & CARRY).toBe(0);     // No carry out
    expect(cpu.p & ZERO).toBe(0);      // Zero flag clear
  });
  
  // Test ROL Absolute,X with various inputs
  it("should test ROL Absolute,X with various inputs", () => {
    const cpu = createCPU();
    
    // Test with carry clear, zero input
    cpu.pc = 0;
    cpu.mem[0] = 0x3E; // ROL Absolute,X
    cpu.mem[1] = 0x00; // Low byte
    cpu.mem[2] = 0x10; // High byte
    cpu.x = 0x05;      // X = 5, so effective address is 0x1005
    cpu.mem[0x1005] = 0x00; // Value to rotate
    cpu.p = 0;         // Clear carry flag
    
    step6502(cpu);
    expect(cpu.mem[0x1005]).toBe(0x00);
    expect(cpu.p & CARRY).toBe(0);     // No carry out
    expect(cpu.p & ZERO).toBe(ZERO);   // Zero flag set
    
    // Test with carry set, zero input
    cpu.pc = 0;
    cpu.mem[0] = 0x3E; // ROL Absolute,X
    cpu.mem[1] = 0x00; // Low byte
    cpu.mem[2] = 0x10; // High byte
    cpu.x = 0x05;      // X = 5, so effective address is 0x1005
    cpu.mem[0x1005] = 0x00; // Value to rotate
    cpu.p = CARRY;     // Set carry flag
    
    step6502(cpu);
    expect(cpu.mem[0x1005]).toBe(0x01);
    expect(cpu.p & CARRY).toBe(0);     // No carry out
    expect(cpu.p & ZERO).toBe(0);      // Zero flag clear
  });
  
  // Test ROR Zero Page,X with various inputs
  it("should test ROR Zero Page,X with various inputs", () => {
    const cpu = createCPU();
    
    // Test with carry clear, zero input
    cpu.pc = 0;
    cpu.mem[0] = 0x76; // ROR Zero Page,X
    cpu.mem[1] = 0x80; // Zero page address
    cpu.x = 0x01;      // X = 1, so effective address is 0x81
    cpu.mem[0x81] = 0x00; // Value to rotate
    cpu.p = 0;         // Clear carry flag
    
    step6502(cpu);
    expect(cpu.mem[0x81]).toBe(0x00);
    expect(cpu.p & CARRY).toBe(0);     // No carry out
    expect(cpu.p & ZERO).toBe(ZERO);   // Zero flag set
    
    // Test with carry set, zero input
    cpu.pc = 0;
    cpu.mem[0] = 0x76; // ROR Zero Page,X
    cpu.mem[1] = 0x80; // Zero page address
    cpu.x = 0x01;      // X = 1, so effective address is 0x81
    cpu.mem[0x81] = 0x00; // Value to rotate
    cpu.p = CARRY;     // Set carry flag
    
    step6502(cpu);
    expect(cpu.mem[0x81]).toBe(0x80);  // Carry rotated to bit 7
    expect(cpu.p & CARRY).toBe(0);     // No carry out
    expect(cpu.p & NEGATIVE).toBe(NEGATIVE); // Negative flag set
  });
  
  // Test ROR Absolute,X with various inputs
  it("should test ROR Absolute,X with various inputs", () => {
    const cpu = createCPU();
    
    // Test with carry clear, zero input
    cpu.pc = 0;
    cpu.mem[0] = 0x7E; // ROR Absolute,X
    cpu.mem[1] = 0x00; // Low byte
    cpu.mem[2] = 0x10; // High byte
    cpu.x = 0x05;      // X = 5, so effective address is 0x1005
    cpu.mem[0x1005] = 0x00; // Value to rotate
    cpu.p = 0;         // Clear carry flag
    
    step6502(cpu);
    expect(cpu.mem[0x1005]).toBe(0x00);
    expect(cpu.p & CARRY).toBe(0);     // No carry out
    expect(cpu.p & ZERO).toBe(ZERO);   // Zero flag set
    
    // Test with carry set, zero input
    cpu.pc = 0;
    cpu.mem[0] = 0x7E; // ROR Absolute,X
    cpu.mem[1] = 0x00; // Low byte
    cpu.mem[2] = 0x10; // High byte
    cpu.x = 0x05;      // X = 5, so effective address is 0x1005
    cpu.mem[0x1005] = 0x00; // Value to rotate
    cpu.p = CARRY;     // Set carry flag
    
    step6502(cpu);
    expect(cpu.mem[0x1005]).toBe(0x80);  // Carry rotated to bit 7
    expect(cpu.p & CARRY).toBe(0);     // No carry out
    expect(cpu.p & NEGATIVE).toBe(NEGATIVE); // Negative flag set
  });
});