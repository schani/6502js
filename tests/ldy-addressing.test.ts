import { describe, expect, it } from "bun:test";
import { ZERO, NEGATIVE } from "../6502";
import { createCPU } from "./utils";

describe("LDY with different addressing modes", async () => {
  it("should perform LDY Zero Page,X instruction", async () => {
    const cpu = createCPU();
    
    // Setup
    await cpu.loadByte(0, 0xB4); // LDY Zero Page,X
    await cpu.loadByte(1, 0x80); // Zero page address
    await cpu.loadByte(0x90, 0x42); // Value at 0x80 + 0x10 (with zero page wrap-around)
    
    await cpu.setXRegister(0x10); // X offset
    await cpu.setProgramCounter(0);
    
    // Execute
    const cycles = await cpu.step();
    
    // Verify
    expect(cycles).toBe(4);
    expect(await cpu.getYRegister()).toBe(0x42);
    expect(((await cpu.getState()).p & ZERO) === 0).toBe(true); // Result is not zero
    expect(((await cpu.getState()).p & NEGATIVE) === 0).toBe(true); // Result is not negative
  });
  
  it("should perform LDY Absolute instruction", async () => {
    const cpu = createCPU();
    
    // Setup
    await cpu.loadByte(0, 0xAC); // LDY Absolute
    await cpu.loadByte(1, 0x00); // Low byte of address
    await cpu.loadByte(2, 0x20); // High byte of address (0x2000)
    await cpu.loadByte(0x2000, 0x80); // Value at absolute address
    
    await cpu.setProgramCounter(0);
    
    // Execute
    const cycles = await cpu.step();
    
    // Verify
    expect(cycles).toBe(4);
    expect(await cpu.getYRegister()).toBe(0x80);
    expect(((await cpu.getState()).p & ZERO) === 0).toBe(true); // Result is not zero
    expect(((await cpu.getState()).p & NEGATIVE) !== 0).toBe(true); // Result is negative (bit 7 set)
  });
  
  it("should perform LDY Absolute,X instruction", async () => {
    const cpu = createCPU();
    
    // Setup
    await cpu.loadByte(0, 0xBC); // LDY Absolute,X
    await cpu.loadByte(1, 0x00); // Low byte of address
    await cpu.loadByte(2, 0x20); // High byte of address (0x2000)
    await cpu.loadByte(0x2010, 0x00); // Value at 0x2000 + 0x10 = 0x2010
    
    await cpu.setXRegister(0x10); // X offset
    await cpu.setProgramCounter(0);
    
    // Execute
    const cycles = await cpu.step();
    
    // Verify
    expect(cycles).toBe(4); // No page boundary crossed
    expect(await cpu.getYRegister()).toBe(0x00);
    expect(((await cpu.getState()).p & ZERO) !== 0).toBe(true); // Result is zero
    expect(((await cpu.getState()).p & NEGATIVE) === 0).toBe(true); // Result is not negative
  });
  
  it("should perform LDY Absolute,X instruction with page crossing", async () => {
    const cpu = createCPU();
    
    // Setup
    await cpu.loadByte(0, 0xBC); // LDY Absolute,X
    await cpu.loadByte(1, 0xF0); // Low byte of address
    await cpu.loadByte(2, 0x20); // High byte of address (0x20F0)
    await cpu.loadByte(0x2100, 0xFF); // Value at 0x20F0 + 0x10 = 0x2100 (page boundary crossed)
    
    await cpu.setXRegister(0x10); // X offset
    await cpu.setProgramCounter(0);
    
    // Execute
    const cycles = await cpu.step();
    
    // Verify
    expect(cycles).toBe(5); // +1 cycle for page boundary crossing
    expect(await cpu.getYRegister()).toBe(0xFF);
    expect(((await cpu.getState()).p & ZERO) === 0).toBe(true); // Result is not zero
    expect(((await cpu.getState()).p & NEGATIVE) !== 0).toBe(true); // Result is negative (bit 7 set)
  });
});