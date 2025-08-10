import { describe, expect, it } from "bun:test";
import { createCPU, CARRY, ZERO, NEGATIVE, OVERFLOW } from "./utils";

describe("Branch instructions", async () => {
  it("should perform BCC instruction (branch taken)", async () => {
    const cpu = createCPU();
    
    // Set up CPU state
    await cpu.clearStatusFlag(CARRY); // Clear carry flag
    
    // Set up memory
    await cpu.loadByte(0, 0x90); // BCC
    await cpu.loadByte(1, 0x10); // Branch offset (forward 16 bytes)
    
    const cycles = await cpu.step();
    
    expect(cpu.getProgramCounter()).toBe(0x12); // 0x02 + 0x10 = 0x12
    expect(cycles).toBe(3); // Base cycles (2) + branch taken (1)
  });
  
  it("should perform BCC instruction (branch not taken)", async () => {
    const cpu = createCPU();
    
    // Set up CPU state
    await cpu.setStatusFlag(CARRY); // Set carry flag
    
    // Set up memory
    await cpu.loadByte(0, 0x90); // BCC
    await cpu.loadByte(1, 0x10); // Branch offset (forward 16 bytes)
    
    const cycles = await cpu.step();
    
    expect(cpu.getProgramCounter()).toBe(0x02); // PC advances past the branch instruction
    expect(cycles).toBe(2); // Base cycles (2) only
  });
  
  it("should add cycle when branch crosses page boundary", async () => {
    const cpu = createCPU();
    
    // Set up CPU state
    await cpu.clearStatusFlag(CARRY); // Clear carry flag
    await cpu.setProgramCounter(0x00F0); // Set PC near page boundary
    
    // Set up memory
    await cpu.loadByte(0x00F0, 0x90); // BCC
    await cpu.loadByte(0x00F1, 0x20); // Branch offset (forward 32 bytes)
    
    const cycles = await cpu.step();
    
    expect(cpu.getProgramCounter()).toBe(0x0112); // 0x00F2 + 0x20 = 0x0112 (crosses page boundary)
    expect(cycles).toBe(4); // Base cycles (2) + branch taken (1) + page boundary (1)
  });

  it("should handle negative branch offset", async () => {
    const cpu = createCPU();
    
    // Set up CPU state
    await cpu.clearStatusFlag(CARRY); // Clear carry flag
    await cpu.setProgramCounter(0x0080);
    
    // Set up memory
    await cpu.loadByte(0x0080, 0x90); // BCC
    await cpu.loadByte(0x0081, 0xFE); // Branch offset (-2 in two's complement)
    
    const cycles = await cpu.step();
    
    expect(cpu.getProgramCounter()).toBe(0x0080); // 0x0082 - 2 = 0x0080 (branch back to the BCC instruction)
    expect(cycles).toBe(3); // Base cycles (2) + branch taken (1)
  });
  
  it("should perform all branch instructions correctly", async () => {
    const cpu = createCPU();
    
    // Test BCS (Branch if Carry Set)
    await cpu.setProgramCounter(0);
    await cpu.setStatusFlag(CARRY); // Set carry flag
    await cpu.loadByte(0, 0xB0); // BCS
    await cpu.loadByte(1, 0x10); // Branch offset
    
    let cycles = await cpu.step();
    expect(cpu.getProgramCounter()).toBe(0x12); // Should branch
    expect(cycles).toBe(3);
    
    // Test BEQ (Branch if Equal/Zero Set)
    await cpu.setProgramCounter(0);
    await cpu.setStatusFlag(ZERO); // Set zero flag
    await cpu.loadByte(0, 0xF0); // BEQ
    
    cycles = await cpu.step();
    expect(cpu.getProgramCounter()).toBe(0x12); // Should branch
    expect(cycles).toBe(3);
    
    // Test BNE (Branch if Not Equal/Zero Clear)
    await cpu.setProgramCounter(0);
    await cpu.clearStatusFlag(ZERO); // Clear zero flag
    await cpu.loadByte(0, 0xD0); // BNE
    
    cycles = await cpu.step();
    expect(cpu.getProgramCounter()).toBe(0x12); // Should branch
    expect(cycles).toBe(3);
    
    // Test BMI (Branch if Minus/Negative Set)
    await cpu.setProgramCounter(0);
    await cpu.setStatusFlag(NEGATIVE); // Set negative flag
    await cpu.loadByte(0, 0x30); // BMI
    
    cycles = await cpu.step();
    expect(cpu.getProgramCounter()).toBe(0x12); // Should branch
    expect(cycles).toBe(3);
    
    // Test BPL (Branch if Plus/Negative Clear)
    await cpu.setProgramCounter(0);
    await cpu.clearStatusFlag(NEGATIVE); // Clear negative flag
    await cpu.loadByte(0, 0x10); // BPL
    
    cycles = await cpu.step();
    expect(cpu.getProgramCounter()).toBe(0x12); // Should branch
    expect(cycles).toBe(3);
    
    // Test BVC (Branch if Overflow Clear)
    await cpu.setProgramCounter(0);
    await cpu.clearStatusFlag(OVERFLOW); // Clear overflow flag
    await cpu.loadByte(0, 0x50); // BVC
    
    cycles = await cpu.step();
    expect(cpu.getProgramCounter()).toBe(0x12); // Should branch
    expect(cycles).toBe(3);
    
    // Test BVS (Branch if Overflow Set)
    await cpu.setProgramCounter(0);
    await cpu.setStatusFlag(OVERFLOW); // Set overflow flag
    await cpu.loadByte(0, 0x70); // BVS
    
    cycles = await cpu.step();
    expect(cpu.getProgramCounter()).toBe(0x12); // Should branch
    expect(cycles).toBe(3);
  });
});