import { describe, expect, it } from "bun:test";
import { createCPU, CARRY, ZERO, NEGATIVE, OVERFLOW } from "./utils";

describe("Arithmetic operations", () => {
  it("should perform ADC immediate instruction", () => {
    const cpu = createCPU();
    
    // Set up CPU state
    cpu.setAccumulator(0x42);
    cpu.clearStatusFlag(CARRY); // Clear carry flag
    
    // Set up memory
    cpu.loadByte(0, 0x69); // ADC immediate
    cpu.loadByte(1, 0x37); // Value to add
    
    const cycles = cpu.step();
    
    expect(cpu.getAccumulator()).toBe(0x79); // 0x42 + 0x37 = 0x79
    expect(cpu.getStatusRegister() & CARRY).toBe(0); // No carry out
    expect(cpu.getStatusRegister() & ZERO).toBe(0); // Result is not zero
    expect(cpu.getStatusRegister() & NEGATIVE).toBe(0); // Result is not negative
    expect(cpu.getStatusRegister() & OVERFLOW).toBe(0); // No overflow (both inputs and result have same sign bit)
    expect(cpu.getProgramCounter()).toBe(2);
    expect(cycles).toBe(2);
  });
  
  it("should handle ADC with carry in", () => {
    const cpu = createCPU();
    
    // Set up CPU state
    cpu.setAccumulator(0x42);
    cpu.setStatusFlag(CARRY); // Set carry flag
    
    // Set up memory
    cpu.loadByte(0, 0x69); // ADC immediate
    cpu.loadByte(1, 0x37); // Value to add
    
    const cycles = cpu.step();
    
    expect(cpu.getAccumulator()).toBe(0x7A); // 0x42 + 0x37 + 1 = 0x7A
    expect(cpu.getProgramCounter()).toBe(2);
    expect(cycles).toBe(2);
  });
  
  it("should handle ADC with carry out", () => {
    const cpu = createCPU();
    
    // Set up CPU state
    cpu.setAccumulator(0xD0);
    cpu.clearStatusFlag(CARRY); // Clear carry flag
    
    // Set up memory
    cpu.loadByte(0, 0x69); // ADC immediate
    cpu.loadByte(1, 0x90); // Value to add
    
    const cycles = cpu.step();
    
    expect(cpu.getAccumulator()).toBe(0x60); // 0xD0 + 0x90 = 0x160, truncated to 0x60
    expect(cpu.getStatusRegister() & CARRY).toBe(CARRY); // Carry flag should be set
    expect(cpu.getProgramCounter()).toBe(2);
    expect(cycles).toBe(2);
  });
  
  it("should handle ADC with overflow", () => {
    const cpu = createCPU();
    
    // Set up CPU state
    cpu.setAccumulator(0x50); // +80 in signed
    cpu.clearStatusFlag(CARRY); // Clear carry flag
    
    // Set up memory
    cpu.loadByte(0, 0x69); // ADC immediate
    cpu.loadByte(1, 0x50); // +80 in signed
    
    const cycles = cpu.step();
    
    // 80 + 80 = 160, which is -96 when interpreted as signed 8-bit
    // (sign bit flipped from positive to negative)
    expect(cpu.getAccumulator()).toBe(0xA0);
    expect(cpu.getStatusRegister() & OVERFLOW).toBe(OVERFLOW); // Overflow flag should be set
    expect(cpu.getStatusRegister() & NEGATIVE).toBe(NEGATIVE); // Result is negative
    expect(cpu.getProgramCounter()).toBe(2);
    expect(cycles).toBe(2);
  });

  it("should perform SBC immediate instruction", () => {
    const cpu = createCPU();
    
    // Set up CPU state
    cpu.setAccumulator(0x42);
    cpu.setStatusFlag(CARRY); // Set carry flag (means no borrow)
    
    // Set up memory
    cpu.loadByte(0, 0xE9); // SBC immediate
    cpu.loadByte(1, 0x20); // Value to subtract
    
    const cycles = cpu.step();
    
    expect(cpu.getAccumulator()).toBe(0x22); // 0x42 - 0x20 = 0x22
    expect(cpu.getStatusRegister() & CARRY).toBe(CARRY); // No borrow needed
    expect(cpu.getStatusRegister() & ZERO).toBe(0); // Result is not zero
    expect(cpu.getStatusRegister() & NEGATIVE).toBe(0); // Result is not negative
    expect(cpu.getProgramCounter()).toBe(2);
    expect(cycles).toBe(2);
  });
  
  it("should handle SBC with borrow", () => {
    const cpu = createCPU();
    
    // Set up CPU state
    cpu.setAccumulator(0x42);
    cpu.clearStatusFlag(CARRY); // Clear carry flag (means borrow)
    
    // Set up memory
    cpu.loadByte(0, 0xE9); // SBC immediate
    cpu.loadByte(1, 0x20); // Value to subtract
    
    const cycles = cpu.step();
    
    expect(cpu.getAccumulator()).toBe(0x21); // 0x42 - 0x20 - 1 = 0x21
    expect(cpu.getProgramCounter()).toBe(2);
    expect(cycles).toBe(2);
  });
  
  it("should handle SBC with borrow out", () => {
    const cpu = createCPU();
    
    // Set up CPU state
    cpu.setAccumulator(0x20);
    cpu.setStatusFlag(CARRY); // Set carry flag (no borrow)
    
    // Set up memory
    cpu.loadByte(0, 0xE9); // SBC immediate
    cpu.loadByte(1, 0x30); // Value to subtract
    
    const cycles = cpu.step();
    
    expect(cpu.getAccumulator()).toBe(0xF0); // 0x20 - 0x30 = 0xF0 (with borrow)
    expect(cpu.getStatusRegister() & CARRY).toBe(0); // Borrow needed
    expect(cpu.getStatusRegister() & NEGATIVE).toBe(NEGATIVE); // Result is negative
    expect(cpu.getProgramCounter()).toBe(2);
    expect(cycles).toBe(2);
  });
  
  it("should perform CMP immediate instruction", () => {
    const cpu = createCPU();
    
    // Set up CPU state
    cpu.setAccumulator(0x42);
    
    // Set up memory for A == M
    cpu.loadByte(0, 0xC9); // CMP immediate
    cpu.loadByte(1, 0x42); // Value to compare
    
    let cycles = cpu.step();
    
    expect(cpu.getAccumulator()).toBe(0x42); // Accumulator should not change
    expect(cpu.getStatusRegister() & ZERO).toBe(ZERO); // Equal, so zero flag set
    expect(cpu.getStatusRegister() & CARRY).toBe(CARRY); // A >= M, so carry set
    expect(cpu.getStatusRegister() & NEGATIVE).toBe(0); // Result bit 7 is clear
    expect(cpu.getProgramCounter()).toBe(2);
    expect(cycles).toBe(2);
    
    // Set up memory for A > M
    cpu.setProgramCounter(0);
    cpu.loadByte(1, 0x10);
    
    cycles = cpu.step();
    
    expect(cpu.getStatusRegister() & ZERO).toBe(0); // Not equal, so zero flag clear
    expect(cpu.getStatusRegister() & CARRY).toBe(CARRY); // A >= M, so carry set
    
    // Set up memory for A < M
    cpu.setProgramCounter(0);
    cpu.loadByte(1, 0x50);
    
    cycles = cpu.step();
    
    expect(cpu.getStatusRegister() & ZERO).toBe(0); // Not equal, so zero flag clear
    expect(cpu.getStatusRegister() & CARRY).toBe(0); // A < M, so carry clear
    expect(cpu.getStatusRegister() & NEGATIVE).toBe(NEGATIVE); // Result bit 7 is set
  });
  
  it("should perform CMP zero page instruction", () => {
    const cpu = createCPU();
    
    // Set up CPU state
    cpu.setAccumulator(0x42);
    
    // Set up memory
    cpu.loadByte(0, 0xC5); // CMP zero page
    cpu.loadByte(1, 0x30); // Zero page address
    cpu.loadByte(0x30, 0x42); // Value to compare
    
    const cycles = cpu.step();
    
    expect(cpu.getAccumulator()).toBe(0x42); // Accumulator should not change
    expect(cpu.getStatusRegister() & ZERO).toBe(ZERO); // Equal, so zero flag set
    expect(cpu.getStatusRegister() & CARRY).toBe(CARRY); // A >= M, so carry set
    expect(cpu.getProgramCounter()).toBe(2);
    expect(cycles).toBe(3);
  });
  
  it("should perform CPX immediate instruction", () => {
    const cpu = createCPU();
    
    // Set up CPU state
    cpu.setXRegister(0x42);
    
    // Set up memory
    cpu.loadByte(0, 0xE0); // CPX immediate
    cpu.loadByte(1, 0x42); // Value to compare
    
    const cycles = cpu.step();
    
    expect(cpu.getXRegister()).toBe(0x42); // X register should not change
    expect(cpu.getStatusRegister() & ZERO).toBe(ZERO); // Equal, so zero flag set
    expect(cpu.getStatusRegister() & CARRY).toBe(CARRY); // X >= M, so carry set
    expect(cpu.getProgramCounter()).toBe(2);
    expect(cycles).toBe(2);
  });
  
  it("should perform CPY immediate instruction", () => {
    const cpu = createCPU();
    
    // Set up CPU state
    cpu.setYRegister(0x42);
    
    // Set up memory
    cpu.loadByte(0, 0xC0); // CPY immediate
    cpu.loadByte(1, 0x42); // Value to compare
    
    const cycles = cpu.step();
    
    expect(cpu.getYRegister()).toBe(0x42); // Y register should not change
    expect(cpu.getStatusRegister() & ZERO).toBe(ZERO); // Equal, so zero flag set
    expect(cpu.getStatusRegister() & CARRY).toBe(CARRY); // Y >= M, so carry set
    expect(cpu.getProgramCounter()).toBe(2);
    expect(cycles).toBe(2);
  });
});