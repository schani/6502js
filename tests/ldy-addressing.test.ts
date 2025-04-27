import { describe, expect, it } from "bun:test";
import type { CPU } from "../6502";
import { CPU1, ZERO, NEGATIVE } from "../6502";

describe("LDY with different addressing modes", () => {
  it("should perform LDY Zero Page,X instruction", () => {
    const cpu = new CPU1();
    
    // Setup
    cpu.loadByte(0, 0xB4); // LDY Zero Page,X
    cpu.loadByte(1, 0x80); // Zero page address
    cpu.loadByte(0x90, 0x42); // Value at 0x80 + 0x10 (with zero page wrap-around)
    
    cpu.setXRegister(0x10); // X offset
    cpu.setProgramCounter(0);
    
    // Execute
    const cycles = cpu.step();
    
    // Verify
    expect(cycles).toBe(4);
    expect(cpu.getYRegister()).toBe(0x42);
    expect(cpu.isStatusFlagSet(ZERO)).toBe(false); // Result is not zero
    expect(cpu.isStatusFlagSet(NEGATIVE)).toBe(false); // Result is not negative
  });
  
  it("should perform LDY Absolute instruction", () => {
    const cpu = new CPU1();
    
    // Setup
    cpu.loadByte(0, 0xAC); // LDY Absolute
    cpu.loadByte(1, 0x00); // Low byte of address
    cpu.loadByte(2, 0x20); // High byte of address (0x2000)
    cpu.loadByte(0x2000, 0x80); // Value at absolute address
    
    cpu.setProgramCounter(0);
    
    // Execute
    const cycles = cpu.step();
    
    // Verify
    expect(cycles).toBe(4);
    expect(cpu.getYRegister()).toBe(0x80);
    expect(cpu.isStatusFlagSet(ZERO)).toBe(false); // Result is not zero
    expect(cpu.isStatusFlagSet(NEGATIVE)).toBe(true); // Result is negative (bit 7 set)
  });
  
  it("should perform LDY Absolute,X instruction", () => {
    const cpu = new CPU1();
    
    // Setup
    cpu.loadByte(0, 0xBC); // LDY Absolute,X
    cpu.loadByte(1, 0x00); // Low byte of address
    cpu.loadByte(2, 0x20); // High byte of address (0x2000)
    cpu.loadByte(0x2010, 0x00); // Value at 0x2000 + 0x10 = 0x2010
    
    cpu.setXRegister(0x10); // X offset
    cpu.setProgramCounter(0);
    
    // Execute
    const cycles = cpu.step();
    
    // Verify
    expect(cycles).toBe(4); // No page boundary crossed
    expect(cpu.getYRegister()).toBe(0x00);
    expect(cpu.isStatusFlagSet(ZERO)).toBe(true); // Result is zero
    expect(cpu.isStatusFlagSet(NEGATIVE)).toBe(false); // Result is not negative
  });
  
  it("should perform LDY Absolute,X instruction with page crossing", () => {
    const cpu = new CPU1();
    
    // Setup
    cpu.loadByte(0, 0xBC); // LDY Absolute,X
    cpu.loadByte(1, 0xF0); // Low byte of address
    cpu.loadByte(2, 0x20); // High byte of address (0x20F0)
    cpu.loadByte(0x2100, 0xFF); // Value at 0x20F0 + 0x10 = 0x2100 (page boundary crossed)
    
    cpu.setXRegister(0x10); // X offset
    cpu.setProgramCounter(0);
    
    // Execute
    const cycles = cpu.step();
    
    // Verify
    expect(cycles).toBe(5); // +1 cycle for page boundary crossing
    expect(cpu.getYRegister()).toBe(0xFF);
    expect(cpu.isStatusFlagSet(ZERO)).toBe(false); // Result is not zero
    expect(cpu.isStatusFlagSet(NEGATIVE)).toBe(true); // Result is negative (bit 7 set)
  });
});