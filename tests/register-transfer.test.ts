import { describe, expect, it } from "bun:test";
import { createCPU, step6502, ZERO, NEGATIVE, INTERRUPT, UNUSED } from "./utils";

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
