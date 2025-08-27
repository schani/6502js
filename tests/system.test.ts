import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createCPU, getProgramCounter } from "./utils.ts";

describe("System functions", () => {
  it("should perform NOP instruction", async () => {
    const cpu = createCPU();
    
    // Set up memory
    await cpu.loadByte(0, 0xEA); // NOP
    
    const cycles = await cpu.step();
    
    assert.strictEqual(await getProgramCounter(cpu), 1);
    assert.strictEqual(cycles, 2);
    // NOP should not affect any registers or flags
  });

  it("should allow trace logging", async () => {
    const cpu = createCPU();
    
    // Set up memory
    await cpu.loadByte(0, 0xEA); // NOP
    
    // With trace logging enabled
    const cycles = await cpu.step(true);
    
    assert.strictEqual(await getProgramCounter(cpu), 1);
    assert.strictEqual(cycles, 2);
  });

  // Add test for unknown opcodes
  it("should throw an error for unknown opcodes", async () => {
    const cpu = createCPU();
    
    // Set up invalid opcode
    cpu.loadByte(0, 0xFF); // Invalid opcode
    
    // Should throw an error
    await assert.rejects(cpu.step(), /Unknown opcode/);
    
    // Reset PC for second test
    await cpu.setProgramCounter(0);
    
    // Should also throw an error with trace enabled
    await assert.rejects(cpu.step(true), /Unknown opcode/);
  });
});
