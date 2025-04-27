import { describe, expect, it } from "bun:test";
import { CPU1, CARRY, ZERO, OVERFLOW, NEGATIVE } from "../6502";

describe("Instruction cycle counting and edge cases", () => {
  // Focus on simpler tests that don't rely on complex memory layouts
  it("should test BVS/BMI branches with negative offsets", () => {
    const cpu = new CPU1();
    
    // Setup BVS instruction with negative offset
    cpu.loadByte(0x2000, 0x70); // BVS
    cpu.loadByte(0x2001, 0xFB); // -5 in two's complement
    
    cpu.setStatusFlag(OVERFLOW); // Set overflow flag (condition true)
    cpu.setProgramCounter(0x2000);
    
    // Execute BVS
    let cycles = cpu.step();
    expect(cycles).toBe(4); // 4 cycles for branch taken across page boundary
    expect(cpu.getProgramCounter()).toBe(0x1FFD); // 0x2002 - 5 = 0x1FFD
    
    // Setup BMI instruction with negative offset
    cpu.loadByte(0x3000, 0x30); // BMI
    cpu.loadByte(0x3001, 0xFB); // -5 in two's complement
    
    cpu.setStatusFlag(NEGATIVE); // Set negative flag (condition true)
    cpu.setProgramCounter(0x3000);
    
    // Execute BMI
    cycles = cpu.step();
    expect(cycles).toBe(4); // 4 cycles for branch taken across page boundary
    expect(cpu.getProgramCounter()).toBe(0x2FFD); // 0x3002 - 5 = 0x2FFD
  });
  
  it("should test branches with branch taken", () => {
    const cpu = new CPU1();
    
    // Test BVC (Branch on Overflow Clear)
    cpu.loadByte(0x1000, 0x50); // BVC
    cpu.loadByte(0x1001, 0x10); // Branch offset (positive)
    
    cpu.clearStatusFlag(OVERFLOW); // Clear overflow flag (branch condition true)
    cpu.setProgramCounter(0x1000);
    
    let cycles = cpu.step();
    expect(cycles).toBe(3); // 3 cycles for branch taken without page crossing
    expect(cpu.getProgramCounter()).toBe(0x1012);
    
    // Test BVS (Branch on Overflow Set)
    cpu.loadByte(0x2000, 0x70); // BVS
    cpu.loadByte(0x2001, 0x10); // Branch offset (positive)
    
    cpu.setStatusFlag(OVERFLOW); // Set overflow flag (branch condition true)
    cpu.setProgramCounter(0x2000);
    
    cycles = cpu.step();
    expect(cycles).toBe(3); // 3 cycles for branch taken without page crossing
    expect(cpu.getProgramCounter()).toBe(0x2012);
  });
  
  it("should test branches with branch not taken", () => {
    const cpu = new CPU1();
    
    // Test BVC (Branch on Overflow Clear)
    cpu.loadByte(0x1000, 0x50); // BVC
    cpu.loadByte(0x1001, 0x10); // Branch offset (not used)
    
    cpu.setStatusFlag(OVERFLOW); // Set overflow flag (branch condition false)
    cpu.setProgramCounter(0x1000);
    
    let cycles = cpu.step();
    expect(cycles).toBe(2); // 2 cycles for branch not taken
    expect(cpu.getProgramCounter()).toBe(0x1002);
    
    // Test BVS (Branch on Overflow Set)
    cpu.loadByte(0x2000, 0x70); // BVS
    cpu.loadByte(0x2001, 0x10); // Branch offset (not used)
    
    cpu.clearStatusFlag(OVERFLOW); // Clear overflow flag (branch condition false)
    cpu.setProgramCounter(0x2000);
    
    cycles = cpu.step();
    expect(cycles).toBe(2); // 2 cycles for branch not taken
    expect(cpu.getProgramCounter()).toBe(0x2002);
  });
});