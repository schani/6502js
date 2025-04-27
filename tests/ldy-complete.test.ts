import { describe, expect, it } from "bun:test";
import { CPU1, CARRY, ZERO, INTERRUPT, DECIMAL, BREAK, UNUSED, OVERFLOW, NEGATIVE } from "../6502";

describe("LDY instruction complete coverage", () => {
  it("should cover LDY instruction with all addressing modes", () => {
    // Create an uninitialized CPU
    const cpu = new CPU1();
    
    // Test LDY Immediate
    cpu.loadByte(0x1000, 0xA0); // LDY #$42
    cpu.loadByte(0x1001, 0x42);
    cpu.setProgramCounter(0x1000);
    let cycles = cpu.step();
    expect(cycles).toBe(2);
    expect(cpu.getYRegister()).toBe(0x42);
    
    // Test LDY Zero Page
    cpu.loadByte(0x1002, 0xA4); // LDY $50
    cpu.loadByte(0x1003, 0x50);
    cpu.loadByte(0x0050, 0x99);
    cpu.setProgramCounter(0x1002);
    cycles = cpu.step();
    expect(cycles).toBe(3);
    expect(cpu.getYRegister()).toBe(0x99);
    
    // Test LDY Zero Page,X
    cpu.loadByte(0x1004, 0xB4); // LDY $60,X
    cpu.loadByte(0x1005, 0x60);
    cpu.loadByte(0x0070, 0x88); // Value at $60 + $10
    cpu.setXRegister(0x10);
    cpu.setProgramCounter(0x1004);
    cycles = cpu.step();
    expect(cycles).toBe(4);
    expect(cpu.getYRegister()).toBe(0x88);
    
    // Test LDY Absolute
    cpu.loadByte(0x1006, 0xAC); // LDY $2000
    cpu.loadByte(0x1007, 0x00);
    cpu.loadByte(0x1008, 0x20);
    cpu.loadByte(0x2000, 0x77);
    cpu.setProgramCounter(0x1006);
    cycles = cpu.step();
    expect(cycles).toBe(4);
    expect(cpu.getYRegister()).toBe(0x77);
    
    // Test LDY Absolute,X
    cpu.loadByte(0x1009, 0xBC); // LDY $2100,X
    cpu.loadByte(0x100A, 0x00);
    cpu.loadByte(0x100B, 0x21);
    cpu.loadByte(0x2110, 0x66); // Value at $2100 + $10
    cpu.setXRegister(0x10);
    cpu.setProgramCounter(0x1009);
    cycles = cpu.step();
    expect(cycles).toBe(4);
    expect(cpu.getYRegister()).toBe(0x66);
    
    // Test LDY Absolute,X with page crossing
    cpu.loadByte(0x100C, 0xBC); // LDY $21F0,X
    cpu.loadByte(0x100D, 0xF0);
    cpu.loadByte(0x100E, 0x21);
    cpu.loadByte(0x2200, 0x55); // Value at $21F0 + $10 (page boundary crossed)
    cpu.setXRegister(0x10);
    cpu.setProgramCounter(0x100C);
    cycles = cpu.step();
    expect(cycles).toBe(5); // +1 cycle for page boundary crossing
    expect(cpu.getYRegister()).toBe(0x55);
  });
  
  it("should test negative/zero flag setting with LDY", () => {
    const cpu = new CPU1();
    
    // Test LDY with zero result
    cpu.loadByte(0x1000, 0xA0); // LDY #$00
    cpu.loadByte(0x1001, 0x00);
    cpu.setProgramCounter(0x1000);
    cpu.clearStatusFlag(ZERO); // Clear zero flag
    cpu.clearStatusFlag(NEGATIVE); // Clear negative flag
    let cycles = cpu.step();
    expect(cycles).toBe(2);
    expect(cpu.getYRegister()).toBe(0x00);
    expect(cpu.isStatusFlagSet(ZERO)).toBe(true); // Zero flag should be set
    expect(cpu.isStatusFlagSet(NEGATIVE)).toBe(false); // Negative flag should be clear
    
    // Test LDY with negative result
    cpu.loadByte(0x1002, 0xA0); // LDY #$80
    cpu.loadByte(0x1003, 0x80);
    cpu.setProgramCounter(0x1002);
    cpu.clearStatusFlag(ZERO); // Clear zero flag
    cpu.clearStatusFlag(NEGATIVE); // Clear negative flag
    cycles = cpu.step();
    expect(cycles).toBe(2);
    expect(cpu.getYRegister()).toBe(0x80);
    expect(cpu.isStatusFlagSet(ZERO)).toBe(false); // Zero flag should be clear
    expect(cpu.isStatusFlagSet(NEGATIVE)).toBe(true); // Negative flag should be set
  });
});