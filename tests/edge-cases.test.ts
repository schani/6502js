import { describe, expect, it } from "bun:test";
import { CARRY, ZERO, INTERRUPT, DECIMAL, BREAK, UNUSED, OVERFLOW, NEGATIVE, defined } from "../6502";
import { type CPU, createCPU } from "./utils";

describe("Edge cases and boundary conditions", () => {
  it("should test writeWord at memory boundaries", () => {
    const cpu = createCPU();
    
    // Test writing at the exact memory boundary
    cpu.loadWord(0xFFFF, 0xABCD);
    
    // Verify that the low byte is at 0xFFFF and high byte wraps to 0x0000
    expect(cpu.readByte(0xFFFF)).toBe(0xCD);
    expect(cpu.readByte(0x0000)).toBe(0xAB);
    
    // Try reading from the same address
    const value = cpu.readWord(0xFFFF);
    expect(value).toBe(0xABCD);
  });
  
  // Test missing LDY cases
  it("should test LDY with various addressing modes", () => {
    const cpu = createCPU();
    
    // Case 1: Zero Page with zero result
    cpu.loadByte(0x1000, 0xA4); // LDY Zero Page
    cpu.loadByte(0x1001, 0x80); // Zero page address
    cpu.loadByte(0x0080, 0x00); // Value (zero)
    
    cpu.setYRegister(0xFF); // Non-zero value
    cpu.clearStatusFlag(ZERO); // Clear zero flag
    cpu.setStatusFlag(NEGATIVE); // Set negative flag
    cpu.setProgramCounter(0x1000);
    
    let cycles = cpu.step();
    
    expect(cycles).toBe(3);
    expect(cpu.getYRegister()).toBe(0x00);
    expect(cpu.isStatusFlagSet(ZERO)).toBe(true); // Zero flag should be set
    expect(cpu.isStatusFlagSet(NEGATIVE)).toBe(false); // Negative flag should be clear
    
    // Case 2: LDY Absolute with negative result
    cpu.loadByte(0x1002, 0xAC); // LDY Absolute
    cpu.loadByte(0x1003, 0x00); // Low byte of address
    cpu.loadByte(0x1004, 0x20); // High byte of address (0x2000)
    cpu.loadByte(0x2000, 0x80); // Value (negative)
    
    cpu.setYRegister(0x00); // Non-negative value
    cpu.setStatusFlag(ZERO); // Set zero flag
    cpu.clearStatusFlag(NEGATIVE); // Clear negative flag
    cpu.setProgramCounter(0x1002);
    
    cycles = cpu.step();
    
    expect(cycles).toBe(4);
    expect(cpu.getYRegister()).toBe(0x80);
    expect(cpu.isStatusFlagSet(ZERO)).toBe(false); // Zero flag should be clear
    expect(cpu.isStatusFlagSet(NEGATIVE)).toBe(true); // Negative flag should be set
  });
});