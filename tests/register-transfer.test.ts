import { describe, expect, it } from "bun:test";
import { createCPU, step6502, ZERO, NEGATIVE, INTERRUPT, UNUSED } from "./utils";

describe("Register transfer instructions", () => {
  it("should perform TAX instruction", () => {
    const cpu = createCPU();
    
    // Set up accumulator
    cpu.setAccumulator(0x42);
    
    // TAX - Transfer accumulator to X
    cpu.loadByte(0, 0xAA); // TAX
    
    const cycles = step6502(cpu);
    
    expect(cpu.getXRegister()).toBe(0x42);
    expect(cpu.getProgramCounter()).toBe(1);
    expect(cycles).toBe(2);
    expect(cpu.getStatusRegister() & ZERO).toBe(0);
    expect(cpu.getStatusRegister() & NEGATIVE).toBe(0);
    
    // Test zero flag
    cpu.setProgramCounter(0);
    cpu.setAccumulator(0);
    step6502(cpu);
    expect(cpu.getXRegister()).toBe(0);
    expect(cpu.getStatusRegister() & ZERO).toBe(ZERO);
    
    // Test negative flag
    cpu.setProgramCounter(0);
    cpu.setAccumulator(0x80);
    step6502(cpu);
    expect(cpu.getXRegister()).toBe(0x80);
    expect(cpu.getStatusRegister() & NEGATIVE).toBe(NEGATIVE);
  });
  
  it("should perform TAY instruction", () => {
    const cpu = createCPU();
    
    // Set up accumulator
    cpu.setAccumulator(0x42);
    
    // TAY - Transfer accumulator to Y
    cpu.loadByte(0, 0xA8); // TAY
    
    const cycles = step6502(cpu);
    
    expect(cpu.getYRegister()).toBe(0x42);
    expect(cpu.getProgramCounter()).toBe(1);
    expect(cycles).toBe(2);
  });
  
  it("should perform TXA instruction", () => {
    const cpu = createCPU();
    
    // Set up X register
    cpu.setXRegister(0x42);
    
    // TXA - Transfer X to accumulator
    cpu.loadByte(0, 0x8A); // TXA
    
    const cycles = step6502(cpu);
    
    expect(cpu.getAccumulator()).toBe(0x42);
    expect(cpu.getProgramCounter()).toBe(1);
    expect(cycles).toBe(2);
  });
  
  it("should perform TYA instruction", () => {
    const cpu = createCPU();
    
    // Set up Y register
    cpu.setYRegister(0x42);
    
    // TYA - Transfer Y to accumulator
    cpu.loadByte(0, 0x98); // TYA
    
    const cycles = step6502(cpu);
    
    expect(cpu.getAccumulator()).toBe(0x42);
    expect(cpu.getProgramCounter()).toBe(1);
    expect(cycles).toBe(2);
  });
  
  it("should perform TSX instruction", () => {
    const cpu = createCPU();
    
    // Set up stack pointer
    cpu.setStackPointer(0x42);
    
    // TSX - Transfer Stack Pointer to X
    cpu.loadByte(0, 0xBA); // TSX
    
    const cycles = step6502(cpu);
    
    expect(cpu.getXRegister()).toBe(0x42);
    expect(cpu.getProgramCounter()).toBe(1);
    expect(cycles).toBe(2);
    expect(cpu.getStatusRegister() & ZERO).toBe(0); // Result is not zero
    expect(cpu.getStatusRegister() & NEGATIVE).toBe(0); // Result is not negative
  });
  
  it("should perform TXS instruction", () => {
    const cpu = createCPU();
    
    // Set up X register
    cpu.setXRegister(0x42);
    
    // TXS - Transfer X to Stack Pointer
    cpu.loadByte(0, 0x9A); // TXS
    
    const cycles = step6502(cpu);
    
    expect(cpu.getStackPointer()).toBe(0x42);
    expect(cpu.getProgramCounter()).toBe(1);
    expect(cycles).toBe(2);
    // TXS does not affect any flags
    expect(cpu.getStatusRegister()).toBe(INTERRUPT | UNUSED); // Original status
  });
});
