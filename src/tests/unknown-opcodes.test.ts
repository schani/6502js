import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { type CPU, createCPU } from "./utils.ts";

describe("Unknown opcodes", () => {
  it("should throw an error for unknown opcodes", async () => {
    const cpu = createCPU();
    
    // Load an invalid/unknown opcode (0xFF) into memory
    await cpu.loadByte(0, 0xFF);
    
    // Set PC to 0 to execute the unknown opcode
    await cpu.setProgramCounter(0);
    
    // Should throw an error
    await assert.rejects(async () => await cpu.step(), /Unknown opcode/);
  });

  it("should throw an error for unknown opcodes with trace enabled", async () => {
    const cpu = createCPU();
    
    // Save the original console.log
    const originalConsoleLog = console.log;
    
    // Mock console.log to capture trace output
    let traceOutput = false;
    console.log = (...args: any[]) => {
      // Trace output will be logged before the error is thrown
      traceOutput = true;
    };
    
    try {
      // Load an invalid/unknown opcode (0xFF) into memory
      await cpu.loadByte(0, 0xFF);
      
      // Set PC to 0 to execute the unknown opcode
      await cpu.setProgramCounter(0);
      
      // Should throw an error but will log trace info first
      await assert.rejects(async () => await cpu.step(true), /Unknown opcode/);
      
      // Trace logging should have been called
      assert.strictEqual(traceOutput, true);
    } finally {
      // Restore the original console.log
      console.log = originalConsoleLog;
    }
  });
});