import { describe, expect, it } from "bun:test";
import { CPU1, CARRY, ZERO, OVERFLOW, NEGATIVE } from "../6502";

describe("Additional branch instruction tests", () => {
  // This adds even more branch tests to ensure 100% coverage
  it("should test branches with small positive offset (no page crossing)", () => {
    const cpu = new CPU1();
    
    // BPL - Branch on Plus (Negative Clear)
    cpu.loadByte(0x1000, 0x10); // BPL
    cpu.loadByte(0x1001, 0x05); // Offset (positive, small)
    cpu.clearStatusFlag(NEGATIVE); // Clear negative (condition true)
    cpu.setProgramCounter(0x1000);
    let cycles = cpu.step();
    expect(cycles).toBe(3); // 3 cycles, no page cross
    expect(cpu.getProgramCounter()).toBe(0x1007); // 0x1002 + 0x05 = 0x1007
    
    // BVC - Branch on Overflow Clear
    cpu.loadByte(0x2000, 0x50); // BVC
    cpu.loadByte(0x2001, 0x05); // Offset (positive, small)
    cpu.clearStatusFlag(OVERFLOW); // Clear overflow (condition true)
    cpu.setProgramCounter(0x2000);
    cycles = cpu.step();
    expect(cycles).toBe(3); // 3 cycles, no page cross
    expect(cpu.getProgramCounter()).toBe(0x2007); // 0x2002 + 0x05 = 0x2007
    
    // BVS - Branch on Overflow Set
    cpu.loadByte(0x3000, 0x70); // BVS
    cpu.loadByte(0x3001, 0x05); // Offset (positive, small)
    cpu.setStatusFlag(OVERFLOW); // Set overflow (condition true)
    cpu.setProgramCounter(0x3000);
    cycles = cpu.step();
    expect(cycles).toBe(3); // 3 cycles, no page cross
    expect(cpu.getProgramCounter()).toBe(0x3007); // 0x3002 + 0x05 = 0x3007
  });
  
  it("should test branches with small negative offset (no page crossing)", () => {
    const cpu = new CPU1();
    
    // BCC - Branch on Carry Clear
    cpu.loadByte(0x1010, 0x90); // BCC
    cpu.loadByte(0x1011, 0xFD); // Offset (negative, -3 in 2's complement)
    cpu.clearStatusFlag(CARRY); // Clear carry (condition true)
    cpu.setProgramCounter(0x1010);
    let cycles = cpu.step();
    expect(cycles).toBe(3); // 3 cycles, no page cross
    expect(cpu.getProgramCounter()).toBe(0x100F); // 0x1012 - 3 = 0x100F
    
    // BCS - Branch on Carry Set
    cpu.loadByte(0x2010, 0xB0); // BCS
    cpu.loadByte(0x2011, 0xFD); // Offset (negative, -3 in 2's complement)
    cpu.setStatusFlag(CARRY); // Set carry (condition true)
    cpu.setProgramCounter(0x2010);
    cycles = cpu.step();
    expect(cycles).toBe(3); // 3 cycles, no page cross
    expect(cpu.getProgramCounter()).toBe(0x200F); // 0x2012 - 3 = 0x200F
    
    // BEQ - Branch on Equal (Zero Set)
    cpu.loadByte(0x3010, 0xF0); // BEQ
    cpu.loadByte(0x3011, 0xFD); // Offset (negative, -3 in 2's complement)
    cpu.setStatusFlag(ZERO); // Set zero (condition true)
    cpu.setProgramCounter(0x3010);
    cycles = cpu.step();
    expect(cycles).toBe(3); // 3 cycles, no page cross
    expect(cpu.getProgramCounter()).toBe(0x300F); // 0x3012 - 3 = 0x300F
    
    // BNE - Branch on Not Equal (Zero Clear)
    cpu.loadByte(0x4010, 0xD0); // BNE
    cpu.loadByte(0x4011, 0xFD); // Offset (negative, -3 in 2's complement)
    cpu.clearStatusFlag(ZERO); // Clear zero (condition true)
    cpu.setProgramCounter(0x4010);
    cycles = cpu.step();
    expect(cycles).toBe(3); // 3 cycles, no page cross
    expect(cpu.getProgramCounter()).toBe(0x400F); // 0x4012 - 3 = 0x400F
    
    // BMI - Branch on Minus (Negative Set)
    cpu.loadByte(0x5010, 0x30); // BMI
    cpu.loadByte(0x5011, 0xFD); // Offset (negative, -3 in 2's complement)
    cpu.setStatusFlag(NEGATIVE); // Set negative (condition true)
    cpu.setProgramCounter(0x5010);
    cycles = cpu.step();
    expect(cycles).toBe(3); // 3 cycles, no page cross
    expect(cpu.getProgramCounter()).toBe(0x500F); // 0x5012 - 3 = 0x500F
  });
});