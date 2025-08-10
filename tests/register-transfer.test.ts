import { describe, expect, it } from "bun:test";
import { createCPU, ZERO, NEGATIVE, INTERRUPT, UNUSED } from "./utils";

describe("Register transfer instructions", () => {
  it("should perform TAX instruction", async () => {
    const cpu = createCPU();
    
    // Set up accumulator
    await cpu.setAccumulator(0x42);
    
    // TAX - Transfer accumulator to X
    await cpu.loadByte(0, 0xAA); // TAX
    
    const cycles = await cpu.step();
    
    expect(await cpu.getXRegister()).toBe(0x42);
    expect(await cpu.getProgramCounter()).toBe(1);
    expect(cycles).toBe(2);
    expect((await cpu.getStatusRegister()) & ZERO).toBe(0);
    expect((await cpu.getStatusRegister()) & NEGATIVE).toBe(0);
    
    // Test zero flag
    await cpu.setProgramCounter(0);
    await cpu.setAccumulator(0);
    await cpu.step();
    expect(await cpu.getXRegister()).toBe(0);
    expect((await cpu.getStatusRegister()) & ZERO).toBe(ZERO);
    
    // Test negative flag
    await cpu.setProgramCounter(0);
    await cpu.setAccumulator(0x80);
    await cpu.step();
    expect(cpu.getXRegister()).toBe(0x80);
    expect((await cpu.getStatusRegister()) & NEGATIVE).toBe(NEGATIVE);
  });
  
  it("should perform TAY instruction", async () => {
    const cpu = createCPU();
    
    // Set up accumulator
    await cpu.setAccumulator(0x42);
    
    // TAY - Transfer accumulator to Y
    await cpu.loadByte(0, 0xA8); // TAY
    
    const cycles = await cpu.step();
    
    expect(await cpu.getYRegister()).toBe(0x42);
    expect(await cpu.getProgramCounter()).toBe(1);
    expect(cycles).toBe(2);
  });
  
  it("should perform TXA instruction", async () => {
    const cpu = createCPU();
    
    // Set up X register
    await cpu.setXRegister(0x42);
    
    // TXA - Transfer X to accumulator
    await cpu.loadByte(0, 0x8A); // TXA
    
    const cycles = await cpu.step();
    
    expect(await cpu.getAccumulator()).toBe(0x42);
    expect(await cpu.getProgramCounter()).toBe(1);
    expect(cycles).toBe(2);
  });
  
  it("should perform TYA instruction", async () => {
    const cpu = createCPU();
    
    // Set up Y register
    await cpu.setYRegister(0x42);
    
    // TYA - Transfer Y to accumulator
    await cpu.loadByte(0, 0x98); // TYA
    
    const cycles = await cpu.step();
    
    expect(await cpu.getAccumulator()).toBe(0x42);
    expect(await cpu.getProgramCounter()).toBe(1);
    expect(cycles).toBe(2);
  });
  
  it("should perform TSX instruction", async () => {
    const cpu = createCPU();
    
    // Set up stack pointer
    await cpu.setStackPointer(0x42);
    
    // TSX - Transfer Stack Pointer to X
    await cpu.loadByte(0, 0xBA); // TSX
    
    const cycles = await cpu.step();
    
    expect(await cpu.getXRegister()).toBe(0x42);
    expect(await cpu.getProgramCounter()).toBe(1);
    expect(cycles).toBe(2);
    expect((await cpu.getStatusRegister()) & ZERO).toBe(0); // Result is not zero
    expect((await cpu.getStatusRegister()) & NEGATIVE).toBe(0); // Result is not negative
  });
  
  it("should perform TXS instruction", async () => {
    const cpu = createCPU();
    
    // Set up X register
    await cpu.setXRegister(0x42);
    
    // TXS - Transfer X to Stack Pointer
    await cpu.loadByte(0, 0x9A); // TXS
    
    const cycles = await cpu.step();
    
    expect(await cpu.getStackPointer()).toBe(0x42);
    expect(await cpu.getProgramCounter()).toBe(1);
    expect(cycles).toBe(2);
    // TXS does not affect any flags
    expect(await cpu.getStatusRegister()).toBe(INTERRUPT | UNUSED); // Original status
  });
});
