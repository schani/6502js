import { describe, expect, it } from "bun:test";
import { getAccumulator, getXRegister, getYRegister, getProgramCounter, getStatusRegister, createCPU, CARRY, ZERO, NEGATIVE, OVERFLOW } from "./utils";
describe("Arithmetic operations", async () => {
  it("should perform ADC immediate instruction", async () => {
    const cpu = createCPU();
    
    // Set up CPU state
    await cpu.setAccumulator(0x42);
    await cpu.clearStatusFlag(CARRY); // Clear carry flag
    
    // Set up memory
    await cpu.loadByte(0, 0x69); // ADC immediate
    await cpu.loadByte(1, 0x37); // Value to add
    
    const cycles = await cpu.step();
    
    expect(await await getAccumulator(cpu)).toBe(0x79); // 0x42 + 0x37 = 0x79
    expect(await getStatusRegister(cpu) & CARRY).toBe(0); // No carry out
    expect(await getStatusRegister(cpu) & ZERO).toBe(0); // Result is not zero
    expect(await getStatusRegister(cpu) & NEGATIVE).toBe(0); // Result is not negative
    expect(await getStatusRegister(cpu) & OVERFLOW).toBe(0); // No overflow (both inputs and result have same sign bit)
    expect(await getProgramCounter(cpu)).toBe(2);
    expect(cycles).toBe(2);
  });
  
  it("should handle ADC with carry in", async () => {
    const cpu = createCPU();
    
    // Set up CPU state
    await cpu.setAccumulator(0x42);
    await cpu.setStatusFlag(CARRY); // Set carry flag
    
    // Set up memory
    await cpu.loadByte(0, 0x69); // ADC immediate
    await cpu.loadByte(1, 0x37); // Value to add
    
    const cycles = await cpu.step();
    
    expect(await await getAccumulator(cpu)).toBe(0x7A); // 0x42 + 0x37 + 1 = 0x7A
    expect(await getProgramCounter(cpu)).toBe(2);
    expect(cycles).toBe(2);
  });
  
  it("should handle ADC with carry out", async () => {
    const cpu = createCPU();
    
    // Set up CPU state
    await cpu.setAccumulator(0xD0);
    await cpu.clearStatusFlag(CARRY); // Clear carry flag
    
    // Set up memory
    await cpu.loadByte(0, 0x69); // ADC immediate
    await cpu.loadByte(1, 0x90); // Value to add
    
    const cycles = await cpu.step();
    
    expect(await await getAccumulator(cpu)).toBe(0x60); // 0xD0 + 0x90 = 0x160, truncated to 0x60
    expect(await getStatusRegister(cpu) & CARRY).toBe(CARRY); // Carry flag should be set
    expect(await getProgramCounter(cpu)).toBe(2);
    expect(cycles).toBe(2);
  });
  
  it("should handle ADC with overflow", async () => {
    const cpu = createCPU();
    
    // Set up CPU state
    await cpu.setAccumulator(0x50); // +80 in signed
    await cpu.clearStatusFlag(CARRY); // Clear carry flag
    
    // Set up memory
    await cpu.loadByte(0, 0x69); // ADC immediate
    await cpu.loadByte(1, 0x50); // +80 in signed
    
    const cycles = await cpu.step();
    
    // 80 + 80 = 160, which is -96 when interpreted as signed 8-bit
    // (sign bit flipped from positive to negative)
    expect(await await getAccumulator(cpu)).toBe(0xA0);
    expect(await getStatusRegister(cpu) & OVERFLOW).toBe(OVERFLOW); // Overflow flag should be set
    expect(await getStatusRegister(cpu) & NEGATIVE).toBe(NEGATIVE); // Result is negative
    expect(await getProgramCounter(cpu)).toBe(2);
    expect(cycles).toBe(2);
  });

  it("should perform SBC immediate instruction", async () => {
    const cpu = createCPU();
    
    // Set up CPU state
    await cpu.setAccumulator(0x42);
    await cpu.setStatusFlag(CARRY); // Set carry flag (means no borrow)
    
    // Set up memory
    await cpu.loadByte(0, 0xE9); // SBC immediate
    await cpu.loadByte(1, 0x20); // Value to subtract
    
    const cycles = await cpu.step();
    
    expect(await await getAccumulator(cpu)).toBe(0x22); // 0x42 - 0x20 = 0x22
    expect(await getStatusRegister(cpu) & CARRY).toBe(CARRY); // No borrow needed
    expect(await getStatusRegister(cpu) & ZERO).toBe(0); // Result is not zero
    expect(await getStatusRegister(cpu) & NEGATIVE).toBe(0); // Result is not negative
    expect(await getProgramCounter(cpu)).toBe(2);
    expect(cycles).toBe(2);
  });
  
  it("should handle SBC with borrow", async () => {
    const cpu = createCPU();
    
    // Set up CPU state
    await cpu.setAccumulator(0x42);
    await cpu.clearStatusFlag(CARRY); // Clear carry flag (means borrow)
    
    // Set up memory
    await cpu.loadByte(0, 0xE9); // SBC immediate
    await cpu.loadByte(1, 0x20); // Value to subtract
    
    const cycles = await cpu.step();
    
    expect(await await getAccumulator(cpu)).toBe(0x21); // 0x42 - 0x20 - 1 = 0x21
    expect(await getProgramCounter(cpu)).toBe(2);
    expect(cycles).toBe(2);
  });
  
  it("should handle SBC with borrow out", async () => {
    const cpu = createCPU();
    
    // Set up CPU state
    await cpu.setAccumulator(0x20);
    await cpu.setStatusFlag(CARRY); // Set carry flag (no borrow)
    
    // Set up memory
    await cpu.loadByte(0, 0xE9); // SBC immediate
    await cpu.loadByte(1, 0x30); // Value to subtract
    
    const cycles = await cpu.step();
    
    expect(await await getAccumulator(cpu)).toBe(0xF0); // 0x20 - 0x30 = 0xF0 (with borrow)
    expect(await getStatusRegister(cpu) & CARRY).toBe(0); // Borrow needed
    expect(await getStatusRegister(cpu) & NEGATIVE).toBe(NEGATIVE); // Result is negative
    expect(await getProgramCounter(cpu)).toBe(2);
    expect(cycles).toBe(2);
  });
  
  it("should perform CMP immediate instruction", async () => {
    const cpu = createCPU();
    
    // Set up CPU state
    await cpu.setAccumulator(0x42);
    
    // Set up memory for A == M
    await cpu.loadByte(0, 0xC9); // CMP immediate
    await cpu.loadByte(1, 0x42); // Value to compare
    
    let cycles = await cpu.step();
    
    expect(await await getAccumulator(cpu)).toBe(0x42); // Accumulator should not change
    expect(await getStatusRegister(cpu) & ZERO).toBe(ZERO); // Equal, so zero flag set
    expect(await getStatusRegister(cpu) & CARRY).toBe(CARRY); // A >= M, so carry set
    expect(await getStatusRegister(cpu) & NEGATIVE).toBe(0); // Result bit 7 is clear
    expect(await getProgramCounter(cpu)).toBe(2);
    expect(cycles).toBe(2);
    
    // Set up memory for A > M
    await cpu.setProgramCounter(0);
    await cpu.loadByte(1, 0x10);
    
    cycles = await cpu.step();
    
    expect(await getStatusRegister(cpu) & ZERO).toBe(0); // Not equal, so zero flag clear
    expect(await getStatusRegister(cpu) & CARRY).toBe(CARRY); // A >= M, so carry set
    
    // Set up memory for A < M
    await cpu.setProgramCounter(0);
    await cpu.loadByte(1, 0x50);
    
    cycles = await cpu.step();
    
    expect(await getStatusRegister(cpu) & ZERO).toBe(0); // Not equal, so zero flag clear
    expect(await getStatusRegister(cpu) & CARRY).toBe(0); // A < M, so carry clear
    expect(await getStatusRegister(cpu) & NEGATIVE).toBe(NEGATIVE); // Result bit 7 is set
  });
  
  it("should perform CMP zero page instruction", async () => {
    const cpu = createCPU();
    
    // Set up CPU state
    await cpu.setAccumulator(0x42);
    
    // Set up memory
    await cpu.loadByte(0, 0xC5); // CMP zero page
    await cpu.loadByte(1, 0x30); // Zero page address
    await cpu.loadByte(0x30, 0x42); // Value to compare
    
    const cycles = await cpu.step();
    
    expect(await await getAccumulator(cpu)).toBe(0x42); // Accumulator should not change
    expect(await getStatusRegister(cpu) & ZERO).toBe(ZERO); // Equal, so zero flag set
    expect(await getStatusRegister(cpu) & CARRY).toBe(CARRY); // A >= M, so carry set
    expect(await getProgramCounter(cpu)).toBe(2);
    expect(cycles).toBe(3);
  });
  
  it("should perform CPX immediate instruction", async () => {
    const cpu = createCPU();
    
    // Set up CPU state
    cpu.setXRegister(0x42);
    
    // Set up memory
    await cpu.loadByte(0, 0xE0); // CPX immediate
    await cpu.loadByte(1, 0x42); // Value to compare
    
    const cycles = await cpu.step();
    
    expect(await getXRegister(cpu)).toBe(0x42); // X register should not change
    expect(await getStatusRegister(cpu) & ZERO).toBe(ZERO); // Equal, so zero flag set
    expect(await getStatusRegister(cpu) & CARRY).toBe(CARRY); // X >= M, so carry set
    expect(await getProgramCounter(cpu)).toBe(2);
    expect(cycles).toBe(2);
  });
  
  it("should perform CPY immediate instruction", async () => {
    const cpu = createCPU();
    
    // Set up CPU state
    cpu.setYRegister(0x42);
    
    // Set up memory
    await cpu.loadByte(0, 0xC0); // CPY immediate
    await cpu.loadByte(1, 0x42); // Value to compare
    
    const cycles = await cpu.step();
    
    expect(await getYRegister(cpu)).toBe(0x42); // Y register should not change
    expect(await getStatusRegister(cpu) & ZERO).toBe(ZERO); // Equal, so zero flag set
    expect(await getStatusRegister(cpu) & CARRY).toBe(CARRY); // Y >= M, so carry set
    expect(await getProgramCounter(cpu)).toBe(2);
    expect(cycles).toBe(2);
  });
});