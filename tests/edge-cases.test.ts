import { describe, expect, it } from "bun:test";
import { CARRY, ZERO, INTERRUPT, DECIMAL, BREAK, UNUSED, OVERFLOW, NEGATIVE, defined } from "../6502";
import { type CPU, createCPU } from "./utils";

describe("Edge cases and boundary conditions", () => {
  it("should test writeWord at memory boundaries", async () => {
    const cpu = createCPU();
    
    // Test writing at the exact memory boundary
    await cpu.loadWord(0xFFFF, 0xABCD);
    
    // Verify that the low byte is at 0xFFFF and high byte wraps to 0x0000
    expect(await cpu.readByte(0xFFFF)).toBe(0xCD);
    expect(await cpu.readByte(0x0000)).toBe(0xAB);
    
    // Try reading from the same address
    const value = await cpu.readWord(0xFFFF);
    expect(value).toBe(0xABCD);
  });
  
  // Test missing LDY cases
  it("should test LDY with various addressing modes", async () => {
    const cpu = createCPU();
    
    // Case 1: Zero Page with zero result
    await cpu.loadByte(0x1000, 0xA4); // LDY Zero Page
    await cpu.loadByte(0x1001, 0x80); // Zero page address
    await cpu.loadByte(0x0080, 0x00); // Value (zero)
    
    await cpu.setYRegister(0xFF); // Non-zero value
    await cpu.clearStatusFlag(ZERO); // Clear zero flag
    await cpu.setStatusFlag(NEGATIVE); // Set negative flag
    await cpu.setProgramCounter(0x1000);
    
    let cycles = await cpu.step();
    
    expect(cycles).toBe(3);
    expect(await cpu.getYRegister()).toBe(0x00);
    expect(((await cpu.getState()).p & ZERO) !== 0).toBe(true); // Zero flag should be set
    expect(((await cpu.getState()).p & NEGATIVE) !== 0).toBe(false); // Negative flag should be clear
    
    // Case 2: LDY Absolute with negative result
    await cpu.loadByte(0x1002, 0xAC); // LDY Absolute
    await cpu.loadByte(0x1003, 0x00); // Low byte of address
    await cpu.loadByte(0x1004, 0x20); // High byte of address (0x2000)
    await cpu.loadByte(0x2000, 0x80); // Value (negative)
    
    await cpu.setYRegister(0x00); // Non-negative value
    await cpu.setStatusFlag(ZERO); // Set zero flag
    await cpu.clearStatusFlag(NEGATIVE); // Clear negative flag
    await cpu.setProgramCounter(0x1002);
    
    cycles = await cpu.step();
    
    expect(cycles).toBe(4);
    expect(await cpu.getYRegister()).toBe(0x80);
    expect(((await cpu.getState()).p & ZERO) !== 0).toBe(false); // Zero flag should be clear
    expect(((await cpu.getState()).p & NEGATIVE) !== 0).toBe(true); // Negative flag should be set
  });
});