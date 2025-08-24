import { describe, expect, it } from "bun:test";
import { createCPU, getXRegister, getProgramCounter } from "./utils";
import { ZERO, NEGATIVE } from "../6502";

describe("LDX Absolute,Y addressing mode", () => {
  it("should test LDX Absolute,Y with page crossing", async () => {
    const cpu = createCPU();
    
    // Setup for LDX Absolute,Y with page crossing
    await cpu.setProgramCounter(0x1000);
    await cpu.loadByte(0x1000, 0xBE); // LDX Absolute,Y
    await cpu.loadByte(0x1001, 0xFF); // Low byte of address (0x01FF)
    await cpu.loadByte(0x1002, 0x01); // High byte of address
    await cpu.setYRegister(0x01);     // Y register = 1, effective address = 0x0200
    
    // Value to load at the effective address
    await cpu.loadByte(0x0200, 0x42);
    
    // Execute the instruction
    const cycles = await cpu.step();
    
    // Check cycles (should be 5 due to page crossing)
    expect(cycles).toBe(5);
    
    // Check if X register was loaded with the value
    expect(await await getXRegister(cpu)).toBe(0x42);
    
    // Check PC was incremented correctly
    expect(await await getProgramCounter(cpu)).toBe(0x1003);
    
    // Now test without page crossing
    await cpu.setProgramCounter(0x1000);
    await cpu.loadByte(0x1000, 0xBE); // LDX Absolute,Y
    await cpu.loadByte(0x1001, 0x50); // Low byte of address (0x0150)
    await cpu.loadByte(0x1002, 0x01); // High byte of address
    await cpu.setYRegister(0x01);     // Y register = 1, effective address = 0x0151
    
    // Value to load at the effective address
    await cpu.loadByte(0x0151, 0x84); // Negative value
    
    // Execute the instruction
    const cyclesNoPageCross = await cpu.step();
    
    // Check cycles (should be 4 without page crossing)
    expect(cyclesNoPageCross).toBe(4);
    
    // Check if X register was loaded with the value
    expect(await await getXRegister(cpu)).toBe(0x84);
    
    // Check if negative flag was set
    expect(((await cpu.getState()).p & NEGATIVE) !== 0).toBe(true);
    
    // One more test with zero result
    await cpu.setProgramCounter(0x1000);
    await cpu.loadByte(0x1000, 0xBE); // LDX Absolute,Y
    await cpu.loadByte(0x1001, 0x50); // Low byte of address (0x0150)
    await cpu.loadByte(0x1002, 0x01); // High byte of address
    await cpu.setYRegister(0x01);     // Y register = 1, effective address = 0x0151
    
    // Value to load at the effective address
    await cpu.loadByte(0x0151, 0x00); // Zero value
    
    // Execute the instruction
    await cpu.step();
    
    // Check if X register was loaded with the value
    expect(await await getXRegister(cpu)).toBe(0x00);
    
    // Check if zero flag was set
    expect(((await cpu.getState()).p & ZERO) !== 0).toBe(true);
  });
});