import { describe, expect, it } from "bun:test";
import { ZERO, NEGATIVE, CARRY } from "../6502";
import { createCPU } from "./utils";

describe("Final extreme edge cases for 100% coverage", () => {
  // Test all shift operations with different addressing modes and values
  it("should test all conditional branches in shift operations", () => {
    // ASL Tests
    {
      // ASL Zero Page - test carry false path
      const cpu = createCPU();
      cpu.setProgramCounter(0);
      cpu.loadByte(0, 0x06); // ASL Zero Page
      cpu.loadByte(1, 0x80); // Zero page address
      cpu.loadByte(0x80, 0x01); // Won't set carry
      
      cpu.step();
      expect(cpu.readByte(0x80)).toBe(0x02); // 0x01 << 1 = 0x02
      expect(cpu.isStatusFlagSet(CARRY)).toBe(false); // No carry set
    }
    
    // LSR Tests
    {
      // LSR Zero Page - test carry false path
      const cpu = createCPU();
      cpu.setProgramCounter(0);
      cpu.loadByte(0, 0x46); // LSR Zero Page
      cpu.loadByte(1, 0x80); // Zero page address
      cpu.loadByte(0x80, 0x02); // Won't set carry from bit 0
      
      cpu.step();
      expect(cpu.readByte(0x80)).toBe(0x01); // 0x02 >> 1 = 0x01
      expect(cpu.isStatusFlagSet(CARRY)).toBe(false); // No carry set
    }
    
    // ROL Tests
    {
      // ROL Zero Page - test with carry in but no carry out
      const cpu = createCPU();
      cpu.setProgramCounter(0);
      cpu.loadByte(0, 0x26); // ROL Zero Page
      cpu.loadByte(1, 0x80); // Zero page address
      cpu.loadByte(0x80, 0x40); // Bit 6 set, won't set carry out
      cpu.setStatusRegister(CARRY); // Set carry flag
      
      cpu.step();
      expect(cpu.readByte(0x80)).toBe(0x81); // 0x40 << 1 | 0x01 = 0x81
      expect(cpu.isStatusFlagSet(CARRY)).toBe(false); // No carry out
      expect(cpu.isStatusFlagSet(NEGATIVE)).toBe(true); // Negative flag set
    }
    
    // ROR Tests
    {
      // ROR Zero Page - test with carry in and carry out
      const cpu = createCPU();
      cpu.setProgramCounter(0);
      cpu.loadByte(0, 0x66); // ROR Zero Page
      cpu.loadByte(1, 0x80); // Zero page address
      cpu.loadByte(0x80, 0x03); // Bit 0 and 1 set, will set carry out
      cpu.setStatusRegister(CARRY); // Set carry flag
      
      cpu.step();
      expect(cpu.readByte(0x80)).toBe(0x81); // (0x03 >> 1) | 0x80 = 0x81
      expect(cpu.isStatusFlagSet(CARRY)).toBe(true); // Carry set
      expect(cpu.isStatusFlagSet(NEGATIVE)).toBe(true); // Negative flag set
    }
  });
  
  // Test specific edge cases for shift operations to cover all lines
  it("should test ASL edge cases", () => {
    // ASL Zero Page,X with no carry
    const cpu = createCPU();
    cpu.setProgramCounter(0);
    cpu.loadByte(0, 0x16); // ASL Zero Page,X
    cpu.loadByte(1, 0x80); // Zero page address
    cpu.setXRegister(0x01); // X = 1, so effective address is 0x81
    cpu.loadByte(0x81, 0x40); // Value to shift (won't set carry)
    
    cpu.step();
    expect(cpu.readByte(0x81)).toBe(0x80); // 0x40 << 1 = 0x80
    expect(cpu.isStatusFlagSet(CARRY)).toBe(false); // No carry out
    expect(cpu.isStatusFlagSet(NEGATIVE)).toBe(true); // Negative flag set
  });
  
  // Additional edge cases for ROR
  it("should test ROR edge cases", () => {
    // ROR Zero Page,X with no carry in, carry out
    const cpu = createCPU();
    cpu.setProgramCounter(0);
    cpu.loadByte(0, 0x76); // ROR Zero Page,X
    cpu.loadByte(1, 0x80); // Zero page address
    cpu.setXRegister(0x01); // X = 1, so effective address is 0x81
    cpu.loadByte(0x81, 0x01); // Value to rotate (will set carry out)
    cpu.setStatusRegister(0); // Clear carry flag
    
    cpu.step();
    expect(cpu.readByte(0x81)).toBe(0x00); // 0x01 >> 1 = 0x00 (no carry in)
    expect(cpu.isStatusFlagSet(CARRY)).toBe(true); // Carry should be set
    expect(cpu.isStatusFlagSet(ZERO)).toBe(true); // Zero flag set
  });
});