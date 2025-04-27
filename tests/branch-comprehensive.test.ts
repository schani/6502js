import { describe, expect, it } from "bun:test";
import { type CPU, createCPU, CARRY, ZERO, OVERFLOW, NEGATIVE } from "./utils";

describe("Comprehensive branch instruction tests", () => {
  it("should test all branch instructions in various scenarios", () => {
    const cpu = createCPU();
    
    // BCS (Branch if Carry Set)
    cpu.loadByte(0, 0xB0); // BCS
    cpu.loadByte(1, 0x10); // Branch offset
    
    // First with carry clear (should not branch)
    cpu.clearStatusFlag(CARRY); // Clear carry flag
    cpu.setProgramCounter(0);
    
    let cycles = cpu.step();
    
    expect(cycles).toBe(2); // No branch taken
    expect(cpu.getProgramCounter()).toBe(2); // PC only advances past the instruction
    
    // Now with carry set (should branch)
    cpu.setStatusFlag(CARRY); // Set carry flag
    cpu.setProgramCounter(0);
    
    cycles = cpu.step();
    
    expect(cycles).toBe(3); // Branch taken
    expect(cpu.getProgramCounter()).toBe(0x12); // PC = 2 + 0x10 (branch offset)
    
    // BEQ (Branch if Equal / Zero Set)
    cpu.loadByte(0x12, 0xF0); // BEQ
    cpu.loadByte(0x13, 0x10); // Branch offset
    
    // First with zero clear (should not branch)
    cpu.clearStatusFlag(ZERO); // Clear zero flag
    
    cycles = cpu.step();
    
    expect(cycles).toBe(2); // No branch taken
    expect(cpu.getProgramCounter()).toBe(0x14); // PC only advances past the instruction
    
    // Now with zero set (should branch)
    cpu.setStatusFlag(ZERO); // Set zero flag
    cpu.setProgramCounter(0x12);
    
    cycles = cpu.step();
    
    expect(cycles).toBe(3); // Branch taken
    expect(cpu.getProgramCounter()).toBe(0x24); // PC = 0x14 + 0x10 (branch offset)
    
    // BMI (Branch if Minus / Negative Set)
    cpu.loadByte(0x24, 0x30); // BMI
    cpu.loadByte(0x25, 0x10); // Branch offset
    
    // First with negative clear (should not branch)
    cpu.clearStatusFlag(NEGATIVE); // Clear negative flag
    
    cycles = cpu.step();
    
    expect(cycles).toBe(2); // No branch taken
    expect(cpu.getProgramCounter()).toBe(0x26); // PC only advances past the instruction
    
    // Now with negative set (should branch)
    cpu.setStatusFlag(NEGATIVE); // Set negative flag
    cpu.setProgramCounter(0x24);
    
    cycles = cpu.step();
    
    expect(cycles).toBe(3); // Branch taken
    expect(cpu.getProgramCounter()).toBe(0x36); // PC = 0x26 + 0x10 (branch offset)
    
    // BVS (Branch if Overflow Set)
    cpu.loadByte(0x36, 0x70); // BVS
    cpu.loadByte(0x37, 0x10); // Branch offset
    
    // First with overflow clear (should not branch)
    cpu.clearStatusFlag(OVERFLOW); // Clear overflow flag
    
    cycles = cpu.step();
    
    expect(cycles).toBe(2); // No branch taken
    expect(cpu.getProgramCounter()).toBe(0x38); // PC only advances past the instruction
    
    // Now with overflow set (should branch)
    cpu.setStatusFlag(OVERFLOW); // Set overflow flag
    cpu.setProgramCounter(0x36);
    
    cycles = cpu.step();
    
    expect(cycles).toBe(3); // Branch taken
    expect(cpu.getProgramCounter()).toBe(0x48); // PC = 0x38 + 0x10 (branch offset)
    
    // Test negative branch offset with page crossing
    
    // BPL (Branch if Plus / Negative Clear)
    cpu.loadByte(0x0F01, 0x10); // BPL
    cpu.loadByte(0x0F02, 0x80); // Branch offset (-128 in two's complement)
    
    cpu.clearStatusFlag(NEGATIVE); // Clear negative flag (condition true)
    cpu.setProgramCounter(0x0F01);
    
    cycles = cpu.step();
    
    expect(cycles).toBe(4); // Branch taken with page crossing
    expect(cpu.getProgramCounter()).toBe(0x0E83); // PC = 0x0F03 - 128 (negative branch crosses page boundary)
    
    // BNE (Branch if Not Equal / Zero Clear)
    cpu.loadByte(0x2001, 0xD0); // BNE
    cpu.loadByte(0x2002, 0xFD); // Branch offset (-3 in two's complement)
    
    cpu.clearStatusFlag(ZERO); // Clear zero flag (condition true)
    cpu.setProgramCounter(0x2001);
    
    cycles = cpu.step();
    
    expect(cycles).toBe(3); // Branch taken without page crossing
    expect(cpu.getProgramCounter()).toBe(0x2000); // PC = 0x2003 - 3
    
    // BVC (Branch if Overflow Clear)
    cpu.loadByte(0x3001, 0x50); // BVC
    cpu.loadByte(0x3002, 0xFC); // Branch offset (-4 in two's complement)
    
    cpu.clearStatusFlag(OVERFLOW); // Clear overflow flag (condition true)
    cpu.setProgramCounter(0x3001);
    
    cycles = cpu.step();
    
    expect(cycles).toBe(4); // Branch taken with page crossing
    expect(cpu.getProgramCounter()).toBe(0x2FFF); // PC = 0x3003 - 4 (crosses page boundary)
    
    // BCC (Branch if Carry Clear)
    cpu.loadByte(0x4001, 0x90); // BCC
    cpu.loadByte(0x4002, 0xFB); // Branch offset (-5 in two's complement)
    
    cpu.clearStatusFlag(CARRY); // Clear carry flag (condition true)
    cpu.setProgramCounter(0x4001);
    
    cycles = cpu.step();
    
    expect(cycles).toBe(4); // Branch taken with page crossing
    expect(cpu.getProgramCounter()).toBe(0x3FFE); // PC = 0x4003 - 5 (crosses page boundary)
  });
});