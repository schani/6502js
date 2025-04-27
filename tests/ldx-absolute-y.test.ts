import { describe, expect, it } from "bun:test";
import { createCPU } from "./utils";
import { ZERO, NEGATIVE } from "../6502";

describe("LDX Absolute,Y addressing mode", () => {
  it("should test LDX Absolute,Y with page crossing", () => {
    const cpu = createCPU();
    
    // Setup for LDX Absolute,Y with page crossing
    cpu.setProgramCounter(0x1000);
    cpu.loadByte(0x1000, 0xBE); // LDX Absolute,Y
    cpu.loadByte(0x1001, 0xFF); // Low byte of address (0x01FF)
    cpu.loadByte(0x1002, 0x01); // High byte of address
    cpu.setYRegister(0x01);     // Y register = 1, effective address = 0x0200
    
    // Value to load at the effective address
    cpu.loadByte(0x0200, 0x42);
    
    // Execute the instruction
    const cycles = cpu.step();
    
    // Check cycles (should be 5 due to page crossing)
    expect(cycles).toBe(5);
    
    // Check if X register was loaded with the value
    expect(cpu.getXRegister()).toBe(0x42);
    
    // Check PC was incremented correctly
    expect(cpu.getProgramCounter()).toBe(0x1003);
    
    // Now test without page crossing
    cpu.setProgramCounter(0x1000);
    cpu.loadByte(0x1000, 0xBE); // LDX Absolute,Y
    cpu.loadByte(0x1001, 0x50); // Low byte of address (0x0150)
    cpu.loadByte(0x1002, 0x01); // High byte of address
    cpu.setYRegister(0x01);     // Y register = 1, effective address = 0x0151
    
    // Value to load at the effective address
    cpu.loadByte(0x0151, 0x84); // Negative value
    
    // Execute the instruction
    const cyclesNoPageCross = cpu.step();
    
    // Check cycles (should be 4 without page crossing)
    expect(cyclesNoPageCross).toBe(4);
    
    // Check if X register was loaded with the value
    expect(cpu.getXRegister()).toBe(0x84);
    
    // Check if negative flag was set
    expect(cpu.isStatusFlagSet(NEGATIVE)).toBe(true);
    
    // One more test with zero result
    cpu.setProgramCounter(0x1000);
    cpu.loadByte(0x1000, 0xBE); // LDX Absolute,Y
    cpu.loadByte(0x1001, 0x50); // Low byte of address (0x0150)
    cpu.loadByte(0x1002, 0x01); // High byte of address
    cpu.setYRegister(0x01);     // Y register = 1, effective address = 0x0151
    
    // Value to load at the effective address
    cpu.loadByte(0x0151, 0x00); // Zero value
    
    // Execute the instruction
    cpu.step();
    
    // Check if X register was loaded with the value
    expect(cpu.getXRegister()).toBe(0x00);
    
    // Check if zero flag was set
    expect(cpu.isStatusFlagSet(ZERO)).toBe(true);
  });
});