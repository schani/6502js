import { describe, expect, it } from "bun:test";
import { createCPU } from "./utils";

describe("System functions", () => {
  it("should perform NOP instruction", async () => {
    const cpu = createCPU();
    
    // Set up memory
    await cpu.loadByte(0, 0xEA); // NOP
    
    const cycles = await cpu.step();
    
    expect(cpu.getProgramCounter()).toBe(1);
    expect(cycles).toBe(2);
    // NOP should not affect any registers or flags
  });

  it("should allow trace logging", async () => {
    const cpu = createCPU();
    
    // Set up memory
    await cpu.loadByte(0, 0xEA); // NOP
    
    // With trace logging enabled
    const cycles = await cpu.step(true);
    
    expect(cpu.getProgramCounter()).toBe(1);
    expect(cycles).toBe(2);
  });

  // Add test for unknown opcodes
  it("should throw an error for unknown opcodes", async () => {
    const cpu = createCPU();
    
    // Set up invalid opcode
    cpu.loadByte(0, 0xFF); // Invalid opcode
    
    // Should throw an error
    await expect(cpu.step()).rejects.toThrow("Unknown opcode");
    
    // Reset PC for second test
    await cpu.setProgramCounter(0);
    
    // Should also throw an error with trace enabled
    await expect(cpu.step(true)).rejects.toThrow("Unknown opcode");
  });
});
