import { describe, expect, it } from "bun:test";
import { type CPU, createCPU, CARRY, ZERO, OVERFLOW, NEGATIVE, getProgramCounter } from "./utils";

describe("Comprehensive branch instruction tests", async () => {
  it("should test all branch instructions in various scenarios", async () => {
    const cpu = createCPU();
    
    // BCS (Branch if Carry Set)
    await cpu.loadByte(0, 0xB0); // BCS
    await cpu.loadByte(1, 0x10); // Branch offset
    
    // First with carry clear (should not branch)
    await cpu.clearStatusFlag(CARRY); // Clear carry flag
    await cpu.setProgramCounter(0);
    
    let cycles = await cpu.step();
    
    expect(cycles).toBe(2); // No branch taken
    expect(await getProgramCounter(cpu)).toBe(2); // PC only advances past the instruction
    
    // Now with carry set (should branch)
    await cpu.setStatusFlag(CARRY); // Set carry flag
    await cpu.setProgramCounter(0);
    
    cycles = await cpu.step();
    
    expect(cycles).toBe(3); // Branch taken
    expect(await getProgramCounter(cpu)).toBe(0x12); // PC = 2 + 0x10 (branch offset)
    
    // BEQ (Branch if Equal / Zero Set)
    await cpu.loadByte(0x12, 0xF0); // BEQ
    await cpu.loadByte(0x13, 0x10); // Branch offset
    
    // First with zero clear (should not branch)
    await cpu.clearStatusFlag(ZERO); // Clear zero flag
    
    cycles = await cpu.step();
    
    expect(cycles).toBe(2); // No branch taken
    expect(await getProgramCounter(cpu)).toBe(0x14); // PC only advances past the instruction
    
    // Now with zero set (should branch)
    await cpu.setStatusFlag(ZERO); // Set zero flag
    await cpu.setProgramCounter(0x12);
    
    cycles = await cpu.step();
    
    expect(cycles).toBe(3); // Branch taken
    expect(await getProgramCounter(cpu)).toBe(0x24); // PC = 0x14 + 0x10 (branch offset)
    
    // BMI (Branch if Minus / Negative Set)
    await cpu.loadByte(0x24, 0x30); // BMI
    await cpu.loadByte(0x25, 0x10); // Branch offset
    
    // First with negative clear (should not branch)
    await cpu.clearStatusFlag(NEGATIVE); // Clear negative flag
    
    cycles = await cpu.step();
    
    expect(cycles).toBe(2); // No branch taken
    expect(await getProgramCounter(cpu)).toBe(0x26); // PC only advances past the instruction
    
    // Now with negative set (should branch)
    await cpu.setStatusFlag(NEGATIVE); // Set negative flag
    await cpu.setProgramCounter(0x24);
    
    cycles = await cpu.step();
    
    expect(cycles).toBe(3); // Branch taken
    expect(await getProgramCounter(cpu)).toBe(0x36); // PC = 0x26 + 0x10 (branch offset)
    
    // BVS (Branch if Overflow Set)
    await cpu.loadByte(0x36, 0x70); // BVS
    await cpu.loadByte(0x37, 0x10); // Branch offset
    
    // First with overflow clear (should not branch)
    await cpu.clearStatusFlag(OVERFLOW); // Clear overflow flag
    
    cycles = await cpu.step();
    
    expect(cycles).toBe(2); // No branch taken
    expect(await getProgramCounter(cpu)).toBe(0x38); // PC only advances past the instruction
    
    // Now with overflow set (should branch)
    await cpu.setStatusFlag(OVERFLOW); // Set overflow flag
    await cpu.setProgramCounter(0x36);
    
    cycles = await cpu.step();
    
    expect(cycles).toBe(3); // Branch taken
    expect(await getProgramCounter(cpu)).toBe(0x48); // PC = 0x38 + 0x10 (branch offset)
    
    // Test negative branch offset with page crossing
    
    // BPL (Branch if Plus / Negative Clear)
    await cpu.loadByte(0x0F01, 0x10); // BPL
    await cpu.loadByte(0x0F02, 0x80); // Branch offset (-128 in two's complement)
    
    await cpu.clearStatusFlag(NEGATIVE); // Clear negative flag (condition true)
    await cpu.setProgramCounter(0x0F01);
    
    cycles = await cpu.step();
    
    expect(cycles).toBe(4); // Branch taken with page crossing
    expect(await getProgramCounter(cpu)).toBe(0x0E83); // PC = 0x0F03 - 128 (negative branch crosses page boundary)
    
    // BNE (Branch if Not Equal / Zero Clear)
    await cpu.loadByte(0x2001, 0xD0); // BNE
    await cpu.loadByte(0x2002, 0xFD); // Branch offset (-3 in two's complement)
    
    await cpu.clearStatusFlag(ZERO); // Clear zero flag (condition true)
    await cpu.setProgramCounter(0x2001);
    
    cycles = await cpu.step();
    
    expect(cycles).toBe(3); // Branch taken without page crossing
    expect(await getProgramCounter(cpu)).toBe(0x2000); // PC = 0x2003 - 3
    
    // BVC (Branch if Overflow Clear)
    await cpu.loadByte(0x3001, 0x50); // BVC
    await cpu.loadByte(0x3002, 0xFC); // Branch offset (-4 in two's complement)
    
    await cpu.clearStatusFlag(OVERFLOW); // Clear overflow flag (condition true)
    await cpu.setProgramCounter(0x3001);
    
    cycles = await cpu.step();
    
    expect(cycles).toBe(4); // Branch taken with page crossing
    expect(await getProgramCounter(cpu)).toBe(0x2FFF); // PC = 0x3003 - 4 (crosses page boundary)
    
    // BCC (Branch if Carry Clear)
    await cpu.loadByte(0x4001, 0x90); // BCC
    await cpu.loadByte(0x4002, 0xFB); // Branch offset (-5 in two's complement)
    
    await cpu.clearStatusFlag(CARRY); // Clear carry flag (condition true)
    await cpu.setProgramCounter(0x4001);
    
    cycles = await cpu.step();
    
    expect(cycles).toBe(4); // Branch taken with page crossing
    expect(await getProgramCounter(cpu)).toBe(0x3FFE); // PC = 0x4003 - 5 (crosses page boundary)
  });
});