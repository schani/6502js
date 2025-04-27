import { describe, expect, it } from "bun:test";
import { createCPU, CARRY, ZERO, NEGATIVE, OVERFLOW } from "./utils";

describe("Branch instructions", () => {
  it("should perform BCC instruction (branch taken)", () => {
    const cpu = createCPU();
    
    // Set up CPU state
    cpu.clearStatusFlag(CARRY); // Clear carry flag
    
    // Set up memory
    cpu.loadByte(0, 0x90); // BCC
    cpu.loadByte(1, 0x10); // Branch offset (forward 16 bytes)
    
    const cycles = cpu.step();
    
    expect(cpu.getProgramCounter()).toBe(0x12); // 0x02 + 0x10 = 0x12
    expect(cycles).toBe(3); // Base cycles (2) + branch taken (1)
  });
  
  it("should perform BCC instruction (branch not taken)", () => {
    const cpu = createCPU();
    
    // Set up CPU state
    cpu.setStatusFlag(CARRY); // Set carry flag
    
    // Set up memory
    cpu.loadByte(0, 0x90); // BCC
    cpu.loadByte(1, 0x10); // Branch offset (forward 16 bytes)
    
    const cycles = cpu.step();
    
    expect(cpu.getProgramCounter()).toBe(0x02); // PC advances past the branch instruction
    expect(cycles).toBe(2); // Base cycles (2) only
  });
  
  it("should add cycle when branch crosses page boundary", () => {
    const cpu = createCPU();
    
    // Set up CPU state
    cpu.clearStatusFlag(CARRY); // Clear carry flag
    cpu.setProgramCounter(0x00F0); // Set PC near page boundary
    
    // Set up memory
    cpu.loadByte(0x00F0, 0x90); // BCC
    cpu.loadByte(0x00F1, 0x20); // Branch offset (forward 32 bytes)
    
    const cycles = cpu.step();
    
    expect(cpu.getProgramCounter()).toBe(0x0112); // 0x00F2 + 0x20 = 0x0112 (crosses page boundary)
    expect(cycles).toBe(4); // Base cycles (2) + branch taken (1) + page boundary (1)
  });

  it("should handle negative branch offset", () => {
    const cpu = createCPU();
    
    // Set up CPU state
    cpu.clearStatusFlag(CARRY); // Clear carry flag
    cpu.setProgramCounter(0x0080);
    
    // Set up memory
    cpu.loadByte(0x0080, 0x90); // BCC
    cpu.loadByte(0x0081, 0xFE); // Branch offset (-2 in two's complement)
    
    const cycles = cpu.step();
    
    expect(cpu.getProgramCounter()).toBe(0x0080); // 0x0082 - 2 = 0x0080 (branch back to the BCC instruction)
    expect(cycles).toBe(3); // Base cycles (2) + branch taken (1)
  });
  
  it("should perform all branch instructions correctly", () => {
    const cpu = createCPU();
    
    // Test BCS (Branch if Carry Set)
    cpu.setProgramCounter(0);
    cpu.setStatusFlag(CARRY); // Set carry flag
    cpu.loadByte(0, 0xB0); // BCS
    cpu.loadByte(1, 0x10); // Branch offset
    
    let cycles = cpu.step();
    expect(cpu.getProgramCounter()).toBe(0x12); // Should branch
    expect(cycles).toBe(3);
    
    // Test BEQ (Branch if Equal/Zero Set)
    cpu.setProgramCounter(0);
    cpu.setStatusFlag(ZERO); // Set zero flag
    cpu.loadByte(0, 0xF0); // BEQ
    
    cycles = cpu.step();
    expect(cpu.getProgramCounter()).toBe(0x12); // Should branch
    expect(cycles).toBe(3);
    
    // Test BNE (Branch if Not Equal/Zero Clear)
    cpu.setProgramCounter(0);
    cpu.clearStatusFlag(ZERO); // Clear zero flag
    cpu.loadByte(0, 0xD0); // BNE
    
    cycles = cpu.step();
    expect(cpu.getProgramCounter()).toBe(0x12); // Should branch
    expect(cycles).toBe(3);
    
    // Test BMI (Branch if Minus/Negative Set)
    cpu.setProgramCounter(0);
    cpu.setStatusFlag(NEGATIVE); // Set negative flag
    cpu.loadByte(0, 0x30); // BMI
    
    cycles = cpu.step();
    expect(cpu.getProgramCounter()).toBe(0x12); // Should branch
    expect(cycles).toBe(3);
    
    // Test BPL (Branch if Plus/Negative Clear)
    cpu.setProgramCounter(0);
    cpu.clearStatusFlag(NEGATIVE); // Clear negative flag
    cpu.loadByte(0, 0x10); // BPL
    
    cycles = cpu.step();
    expect(cpu.getProgramCounter()).toBe(0x12); // Should branch
    expect(cycles).toBe(3);
    
    // Test BVC (Branch if Overflow Clear)
    cpu.setProgramCounter(0);
    cpu.clearStatusFlag(OVERFLOW); // Clear overflow flag
    cpu.loadByte(0, 0x50); // BVC
    
    cycles = cpu.step();
    expect(cpu.getProgramCounter()).toBe(0x12); // Should branch
    expect(cycles).toBe(3);
    
    // Test BVS (Branch if Overflow Set)
    cpu.setProgramCounter(0);
    cpu.setStatusFlag(OVERFLOW); // Set overflow flag
    cpu.loadByte(0, 0x70); // BVS
    
    cycles = cpu.step();
    expect(cpu.getProgramCounter()).toBe(0x12); // Should branch
    expect(cycles).toBe(3);
  });
});