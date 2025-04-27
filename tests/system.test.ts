import { describe, expect, it } from "bun:test";
import { createCPU } from "./utils";

describe("System functions", () => {
  it("should perform NOP instruction", () => {
    const cpu = createCPU();
    
    // Set up memory
    cpu.loadByte(0, 0xEA); // NOP
    
    const cycles = cpu.step();
    
    expect(cpu.getProgramCounter()).toBe(1);
    expect(cycles).toBe(2);
    // NOP should not affect any registers or flags
  });

  it("should allow trace logging", () => {
    const cpu = createCPU();
    
    // Set up memory
    cpu.loadByte(0, 0xEA); // NOP
    
    // With trace logging enabled
    const cycles = cpu.step(true);
    
    expect(cpu.getProgramCounter()).toBe(1);
    expect(cycles).toBe(2);
  });

  // Add test for unknown opcodes
  it("should throw an error for unknown opcodes", () => {
    const cpu = createCPU();
    
    // Set up invalid opcode
    cpu.loadByte(0, 0xFF); // Invalid opcode
    
    // Should throw an error
    expect(() => cpu.step()).toThrow("Unknown opcode");
    
    // Reset PC for second test
    cpu.setProgramCounter(0);
    
    // Should also throw an error with trace enabled
    expect(() => cpu.step(true)).toThrow("Unknown opcode");
  });
});
