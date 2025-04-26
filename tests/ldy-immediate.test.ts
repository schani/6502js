import { describe, expect, it } from "bun:test";
import { type CPU, createCPU, step6502, ZERO, NEGATIVE } from "./utils";

describe("LDY immediate mode comprehensive tests", () => {
  it("should load immediate value into Y register from uninitialized memory", () => {
    const cpu = createCPU();
    
    // Setup the LDY instruction, but don't initialize the target memory
    cpu.mem[0x1000] = 0xA0; // LDY #$??
    // Intentionally leave cpu.mem[0x1001] uninitialized
    
    cpu.pc = 0x1000;
    
    // Execute
    const cycles = step6502(cpu);
    
    // Verify
    expect(cycles).toBe(2);
    expect(cpu.y).toBe(0); // Should be 0 from uninitialized memory
    expect(cpu.p & ZERO).toBe(ZERO); // Zero flag should be set
    expect(cpu.p & NEGATIVE).toBe(0); // Negative flag should be clear
    expect(cpu.pc).toBe(0x1002); // PC should advance past opcode and operand
  });
  
  it("should load zero into Y register with zero flag set", () => {
    const cpu = createCPU();
    
    // Setup the LDY instruction with zero
    cpu.mem[0x1000] = 0xA0; // LDY #$00
    cpu.mem[0x1001] = 0x00;
    
    cpu.y = 0xFF; // Set Y to a non-zero value
    cpu.p &= ~ZERO; // Clear zero flag
    cpu.p |= NEGATIVE; // Set negative flag
    cpu.pc = 0x1000;
    
    // Execute
    const cycles = step6502(cpu);
    
    // Verify
    expect(cycles).toBe(2);
    expect(cpu.y).toBe(0);
    expect(cpu.p & ZERO).toBe(ZERO); // Zero flag should be set
    expect(cpu.p & NEGATIVE).toBe(0); // Negative flag should be clear
    expect(cpu.pc).toBe(0x1002);
  });
  
  it("should load negative value into Y register with negative flag set", () => {
    const cpu = createCPU();
    
    // Setup the LDY instruction with a negative value
    cpu.mem[0x1000] = 0xA0; // LDY #$80
    cpu.mem[0x1001] = 0x80; // Most significant bit set (negative)
    
    cpu.y = 0x00; // Set Y to a non-negative value
    cpu.p |= ZERO; // Set zero flag
    cpu.p &= ~NEGATIVE; // Clear negative flag
    cpu.pc = 0x1000;
    
    // Execute
    const cycles = step6502(cpu);
    
    // Verify
    expect(cycles).toBe(2);
    expect(cpu.y).toBe(0x80);
    expect(cpu.p & ZERO).toBe(0); // Zero flag should be clear
    expect(cpu.p & NEGATIVE).toBe(NEGATIVE); // Negative flag should be set
    expect(cpu.pc).toBe(0x1002);
  });
});