import { describe, expect, it } from "bun:test";
import { createCPU, step6502, ZERO, NEGATIVE, CARRY } from "../cpu";

// This test targets specific edge cases for shift and rotate operations
describe("Shift and rotate edge cases for 100% coverage", () => {
  // Test ASL with edge cases
  it("should test ASL Zero Page with edge cases", () => {
    const cpu = createCPU();
    
    // Test ASL Zero Page with zero value (no carry, result zero)
    cpu.pc = 0;
    cpu.mem[0] = 0x06; // ASL Zero Page
    cpu.mem[1] = 0x80; // Zero page address
    cpu.mem[0x80] = 0x00; // Value to shift
    
    step6502(cpu);
    expect(cpu.mem[0x80]).toBe(0x00);
    expect(cpu.p & CARRY).toBe(0);     // Carry should be clear
    expect(cpu.p & ZERO).toBe(ZERO);   // Zero flag should be set
    
    // Test ASL Zero Page with 0x80 value (sets carry, result zero)
    cpu.pc = 0;
    cpu.mem[0] = 0x06; // ASL Zero Page
    cpu.mem[1] = 0x80; // Zero page address
    cpu.mem[0x80] = 0x80; // Value to shift
    
    step6502(cpu);
    expect(cpu.mem[0x80]).toBe(0x00);
    expect(cpu.p & CARRY).toBe(CARRY); // Carry should be set
    expect(cpu.p & ZERO).toBe(ZERO);   // Zero flag should be set
  });
  
  // Test ASL with edge cases - Absolute
  it("should test ASL Absolute with edge cases", () => {
    const cpu = createCPU();
    
    // Test ASL Absolute with 0x80 value (sets carry, result zero)
    cpu.pc = 0;
    cpu.mem[0] = 0x0E; // ASL Absolute
    cpu.mem[1] = 0x00; // Low byte of address
    cpu.mem[2] = 0x10; // High byte of address
    cpu.mem[0x1000] = 0x80; // Value to shift
    
    step6502(cpu);
    expect(cpu.mem[0x1000]).toBe(0x00);
    expect(cpu.p & CARRY).toBe(CARRY); // Carry should be set
    expect(cpu.p & ZERO).toBe(ZERO);   // Zero flag should be set
  });
  
  // Test ASL with edge cases - Absolute,X
  it("should test ASL Absolute,X with edge cases", () => {
    const cpu = createCPU();
    
    // Test ASL Absolute,X with 0x80 value (sets carry, result zero)
    cpu.pc = 0;
    cpu.mem[0] = 0x1E; // ASL Absolute,X
    cpu.mem[1] = 0x00; // Low byte of address
    cpu.mem[2] = 0x10; // High byte of address
    cpu.x = 0x05;      // X register = 5
    cpu.mem[0x1005] = 0x80; // Value to shift
    
    step6502(cpu);
    expect(cpu.mem[0x1005]).toBe(0x00);
    expect(cpu.p & CARRY).toBe(CARRY); // Carry should be set
    expect(cpu.p & ZERO).toBe(ZERO);   // Zero flag should be set
  });
  
  // Test LSR with edge cases - Zero Page
  it("should test LSR Zero Page with edge cases", () => {
    const cpu = createCPU();
    
    // Test LSR Zero Page with 0x01 value (sets carry, result zero)
    cpu.pc = 0;
    cpu.mem[0] = 0x46; // LSR Zero Page
    cpu.mem[1] = 0x80; // Zero page address
    cpu.mem[0x80] = 0x01; // Value to shift
    
    step6502(cpu);
    expect(cpu.mem[0x80]).toBe(0x00);
    expect(cpu.p & CARRY).toBe(CARRY); // Carry should be set
    expect(cpu.p & ZERO).toBe(ZERO);   // Zero flag should be set
  });
  
  // Test LSR with edge cases - Absolute
  it("should test LSR Absolute with edge cases", () => {
    const cpu = createCPU();
    
    // Test LSR Absolute with 0x01 value (sets carry, result zero)
    cpu.pc = 0;
    cpu.mem[0] = 0x4E; // LSR Absolute
    cpu.mem[1] = 0x00; // Low byte of address
    cpu.mem[2] = 0x10; // High byte of address
    cpu.mem[0x1000] = 0x01; // Value to shift
    
    step6502(cpu);
    expect(cpu.mem[0x1000]).toBe(0x00);
    expect(cpu.p & CARRY).toBe(CARRY); // Carry should be set
    expect(cpu.p & ZERO).toBe(ZERO);   // Zero flag should be set
  });
  
  // Test ROL with edge cases - Zero Page
  it("should test ROL Zero Page with edge cases", () => {
    const cpu = createCPU();
    
    // Test ROL Zero Page with zero value and carry set
    cpu.pc = 0;
    cpu.mem[0] = 0x26; // ROL Zero Page
    cpu.mem[1] = 0x80; // Zero page address
    cpu.mem[0x80] = 0x00; // Value to rotate
    cpu.p = CARRY;     // Set carry flag
    
    step6502(cpu);
    expect(cpu.mem[0x80]).toBe(0x01); // Rotated carry in
    expect(cpu.p & CARRY).toBe(0);    // No carry out
    expect(cpu.p & ZERO).toBe(0);     // Not zero
    
    // Test ROL Zero Page with 0x80 value and carry set
    cpu.pc = 0;
    cpu.mem[0] = 0x26; // ROL Zero Page
    cpu.mem[1] = 0x80; // Zero page address
    cpu.mem[0x80] = 0x80; // Value to rotate
    cpu.p = CARRY;     // Set carry flag
    
    step6502(cpu);
    expect(cpu.mem[0x80]).toBe(0x01); // Rotated with carry set
    expect(cpu.p & CARRY).toBe(CARRY); // Carry should be set from bit 7
    expect(cpu.p & ZERO).toBe(0);      // Not zero
  });
  
  // Test ROR with edge cases - Zero Page
  it("should test ROR Zero Page with edge cases", () => {
    const cpu = createCPU();
    
    // Test ROR Zero Page with zero value and carry set
    cpu.pc = 0;
    cpu.mem[0] = 0x66; // ROR Zero Page
    cpu.mem[1] = 0x80; // Zero page address
    cpu.mem[0x80] = 0x00; // Value to rotate
    cpu.p = CARRY;     // Set carry flag
    
    step6502(cpu);
    expect(cpu.mem[0x80]).toBe(0x80); // Rotated carry to bit 7
    expect(cpu.p & CARRY).toBe(0);    // No carry out
    expect(cpu.p & NEGATIVE).toBe(NEGATIVE); // Negative flag set
    
    // Test ROR Zero Page with 0x01 value and carry set
    cpu.pc = 0;
    cpu.mem[0] = 0x66; // ROR Zero Page
    cpu.mem[1] = 0x80; // Zero page address
    cpu.mem[0x80] = 0x01; // Value to rotate
    cpu.p = CARRY;     // Set carry flag
    
    step6502(cpu);
    expect(cpu.mem[0x80]).toBe(0x80); // Rotated with carry in
    expect(cpu.p & CARRY).toBe(CARRY); // Carry should be set from bit 0
    expect(cpu.p & NEGATIVE).toBe(NEGATIVE); // Negative flag set
  });
});