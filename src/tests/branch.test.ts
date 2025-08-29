import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createCPU, CARRY, ZERO, NEGATIVE, OVERFLOW, getProgramCounter } from "./utils.ts";

describe("Branch instructions", async () => {
  it("should perform BCC instruction (branch taken)", async () => {
    const cpu = createCPU();
    
    // Set up CPU state
    await cpu.clearStatusFlag(CARRY); // Clear carry flag
    
    // Set up memory
    await cpu.loadByte(0, 0x90); // BCC
    await cpu.loadByte(1, 0x10); // Branch offset (forward 16 bytes)
    
    await cpu.step();
    
    assert.strictEqual(await getProgramCounter(cpu), 0x12); // 0x02 + 0x10 = 0x12
    
  });
  
  it("should perform BCC instruction (branch not taken)", async () => {
    const cpu = createCPU();
    
    // Set up CPU state
    await cpu.setStatusFlag(CARRY); // Set carry flag
    
    // Set up memory
    await cpu.loadByte(0, 0x90); // BCC
    await cpu.loadByte(1, 0x10); // Branch offset (forward 16 bytes)
    
    await cpu.step();
    
    assert.strictEqual(await getProgramCounter(cpu), 0x02); // PC advances past the branch instruction
    
  });
  
  it("should handle branch crosses page boundary", async () => {
    const cpu = createCPU();
    
    // Set up CPU state
    await cpu.clearStatusFlag(CARRY); // Clear carry flag
    await cpu.setProgramCounter(0x00F0); // Set PC near page boundary
    
    // Set up memory
    await cpu.loadByte(0x00F0, 0x90); // BCC
    await cpu.loadByte(0x00F1, 0x20); // Branch offset (forward 32 bytes)
    
    await cpu.step();
    
    assert.strictEqual(await getProgramCounter(cpu), 0x0112); // 0x00F2 + 0x20 = 0x0112 (crosses page boundary)
    
  });

  it("should handle negative branch offset", async () => {
    const cpu = createCPU();
    
    // Set up CPU state
    await cpu.clearStatusFlag(CARRY); // Clear carry flag
    await cpu.setProgramCounter(0x0080);
    
    // Set up memory
    await cpu.loadByte(0x0080, 0x90); // BCC
    await cpu.loadByte(0x0081, 0xFE); // Branch offset (-2 in two's complement)
    
    await cpu.step();
    
    assert.strictEqual(await getProgramCounter(cpu), 0x0080); // 0x0082 - 2 = 0x0080 (branch back to the BCC instruction)
    
  });
  
  it("should perform all branch instructions correctly", async () => {
    const cpu = createCPU();
    
    // Test BCS (Branch if Carry Set)
    await cpu.setProgramCounter(0);
    await cpu.setStatusFlag(CARRY); // Set carry flag
    await cpu.loadByte(0, 0xB0); // BCS
    await cpu.loadByte(1, 0x10); // Branch offset
    
    await cpu.step();
    assert.strictEqual(await getProgramCounter(cpu), 0x12); // Should branch
    
    await cpu.setProgramCounter(0);
    await cpu.setStatusFlag(ZERO); // Set zero flag
    await cpu.loadByte(0, 0xF0); // BEQ
    
    await cpu.step();
    assert.strictEqual(await getProgramCounter(cpu), 0x12); // Should branch
    
    await cpu.setProgramCounter(0);
    await cpu.clearStatusFlag(ZERO); // Clear zero flag
    await cpu.loadByte(0, 0xD0); // BNE
    
    await cpu.step();
    assert.strictEqual(await getProgramCounter(cpu), 0x12); // Should branch
    
    await cpu.setProgramCounter(0);
    await cpu.setStatusFlag(NEGATIVE); // Set negative flag
    await cpu.loadByte(0, 0x30); // BMI
    
    await cpu.step();
    assert.strictEqual(await getProgramCounter(cpu), 0x12); // Should branch
    
    await cpu.setProgramCounter(0);
    await cpu.clearStatusFlag(NEGATIVE); // Clear negative flag
    await cpu.loadByte(0, 0x10); // BPL
    
    await cpu.step();
    assert.strictEqual(await getProgramCounter(cpu), 0x12); // Should branch
    
    await cpu.setProgramCounter(0);
    await cpu.clearStatusFlag(OVERFLOW); // Clear overflow flag
    await cpu.loadByte(0, 0x50); // BVC
    
    await cpu.step();
    assert.strictEqual(await getProgramCounter(cpu), 0x12); // Should branch
    
    await cpu.setProgramCounter(0);
    await cpu.setStatusFlag(OVERFLOW); // Set overflow flag
    await cpu.loadByte(0, 0x70); // BVS
    
    await cpu.step();
    assert.strictEqual(await getProgramCounter(cpu), 0x12); // Should branch
    
  });
});