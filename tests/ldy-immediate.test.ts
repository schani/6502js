import { describe, expect, it } from "bun:test";
import { type CPU, createCPU, step6502, ZERO, NEGATIVE } from "./utils";

describe("LDY immediate mode comprehensive tests", () => {
  it("should load immediate value into Y register from uninitialized memory", () => {
    const cpu = createCPU();
    
    // Setup the LDY instruction, but don't initialize the target memory
    cpu.loadByte(0x1000, 0xA0); // LDY #$??
    // Intentionally leave cpu.mem[0x1001] uninitialized
    
    cpu.setProgramCounter(0x1000);
    
    // Execute
    const cycles = step6502(cpu);
    
    // Verify
    expect(cycles).toBe(2);
    expect(cpu.getYRegister()).toBe(0); // Should be 0 from uninitialized memory
    expect(cpu.getStatusRegister() & ZERO).toBe(ZERO); // Zero flag should be set
    expect(cpu.getStatusRegister() & NEGATIVE).toBe(0); // Negative flag should be clear
    expect(cpu.getProgramCounter()).toBe(0x1002); // PC should advance past opcode and operand
  });
  
  it("should load zero into Y register with zero flag set", () => {
    const cpu = createCPU();
    
    // Setup the LDY instruction with zero
    cpu.loadByte(0x1000, 0xA0); // LDY #$00
    cpu.loadByte(0x1001, 0x00);
    
    cpu.setYRegister(0xFF); // Set Y to a non-zero value
    cpu.clearStatusFlag(ZERO); // Clear zero flag
    cpu.setStatusFlag(NEGATIVE); // Set negative flag
    cpu.setProgramCounter(0x1000);
    
    // Execute
    const cycles = step6502(cpu);
    
    // Verify
    expect(cycles).toBe(2);
    expect(cpu.getYRegister()).toBe(0);
    expect(cpu.getStatusRegister() & ZERO).toBe(ZERO); // Zero flag should be set
    expect(cpu.getStatusRegister() & NEGATIVE).toBe(0); // Negative flag should be clear
    expect(cpu.getProgramCounter()).toBe(0x1002);
  });
  
  it("should load negative value into Y register with negative flag set", () => {
    const cpu = createCPU();
    
    // Setup the LDY instruction with a negative value
    cpu.loadByte(0x1000, 0xA0); // LDY #$80
    cpu.loadByte(0x1001, 0x80); // Most significant bit set (negative)
    
    cpu.setYRegister(0x00); // Set Y to a non-negative value
    cpu.setStatusFlag(ZERO); // Set zero flag
    cpu.clearStatusFlag(NEGATIVE); // Clear negative flag
    cpu.setProgramCounter(0x1000);
    
    // Execute
    const cycles = step6502(cpu);
    
    // Verify
    expect(cycles).toBe(2);
    expect(cpu.getYRegister()).toBe(0x80);
    expect(cpu.getStatusRegister() & ZERO).toBe(0); // Zero flag should be clear
    expect(cpu.getStatusRegister() & NEGATIVE).toBe(NEGATIVE); // Negative flag should be set
    expect(cpu.getProgramCounter()).toBe(0x1002);
  });
});