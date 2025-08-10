import { describe, expect, it } from "bun:test";
import { CPU1, ZERO, NEGATIVE, CARRY, BREAK, UNUSED } from "../6502";

describe("Stack operations", () => {
  it("should perform PHA and PLA instructions", async () => {
    const cpu = new CPU1();
    
    // Set up accumulator
    await cpu.setAccumulator(0x42);
    await cpu.setProgramCounter(0);
    
    // PHA - Push Accumulator on Stack
    await cpu.loadByte(0, 0x48); // PHA
    
    let cycles = await cpu.step();
    
    // Check that SP was decremented
    expect((await cpu.getState()).sp).toBe(0xFC);
    expect(await cpu.readByte(0x01FD)).toBe(0x42); // Stack value at 0x01FD should be 0x42
    expect((await cpu.getState()).pc).toBe(1);
    expect(cycles).toBe(3);
    
    // Clear accumulator
    await cpu.setAccumulator(0);
    
    // Set up PLA instruction
    await cpu.loadByte(1, 0x68); // PLA
    
    cycles = await cpu.step();
    
    // Check that accumulator got value from stack and SP was incremented
    expect((await cpu.getState()).a).toBe(0x42);
    expect((await cpu.getState()).sp).toBe(0xFD);
    expect((await cpu.getState()).pc).toBe(2);
    expect(cycles).toBe(4);
    expect(((await cpu.getState()).p & ZERO) === 0).toBe(true);
    expect(((await cpu.getState()).p & NEGATIVE) === 0).toBe(true);
  });
  
  it("should perform PHP and PLP instructions", async () => {
    const cpu = new CPU1();
    
    // Set up status register with some flags
    await cpu.setStatusFlag(ZERO | CARRY);
    await cpu.setProgramCounter(0);
    
    // PHP - Push Processor Status on Stack
    await cpu.loadByte(0, 0x08); // PHP
    
    let cycles = await cpu.step();
    
    // Check that SP was decremented and status was pushed with B and unused flags set
    expect((await cpu.getState()).sp).toBe(0xFC);
    // Instead of checking specific value, let's verify the pushed byte has the correct flags set
    const pushedValue = await cpu.readByte(0x01FD);
    expect((pushedValue & ZERO)).toBe(ZERO);
    expect((pushedValue & CARRY)).toBe(CARRY);
    expect((pushedValue & BREAK)).toBe(BREAK);
    expect((pushedValue & UNUSED)).toBe(UNUSED);
    expect((await cpu.getState()).pc).toBe(1);
    expect(cycles).toBe(3);
    
    // Clear status register
    await cpu.clearStatusFlag(ZERO | CARRY);
    
    // Set up PLP instruction
    await cpu.loadByte(1, 0x28); // PLP
    
    cycles = await cpu.step();
    
    // Check that status was pulled from stack (B and unused should be ignored)
    // Note: We confirm each flag individually rather than checking entire status register
    expect(((await cpu.getState()).p & ZERO) !== 0).toBe(true);
    expect(((await cpu.getState()).p & CARRY) !== 0).toBe(true);
    expect(((await cpu.getState()).p & UNUSED) !== 0).toBe(true);
    expect(((await cpu.getState()).p & BREAK) === 0).toBe(true); // BREAK flag shouldn't be set from PLP
    expect((await cpu.getState()).sp).toBe(0xFD);
    expect((await cpu.getState()).pc).toBe(2);
    expect(cycles).toBe(4);
  });
});
