import { describe, expect, it } from "bun:test";
import { createCPU, step6502 } from "./utils";

describe("System functions", () => {
  it("should perform NOP instruction", () => {
    const cpu = createCPU();
    
    // Set up memory
    cpu.mem[0] = 0xEA; // NOP
    
    const cycles = step6502(cpu);
    
    expect(cpu.pc).toBe(1);
    expect(cycles).toBe(2);
    // NOP should not affect any registers or flags
  });

  it("should allow trace logging", () => {
    const cpu = createCPU();
    
    // Set up memory
    cpu.mem[0] = 0xEA; // NOP
    
    // With trace logging enabled
    const cycles = step6502(cpu, true);
    
    expect(cpu.pc).toBe(1);
    expect(cycles).toBe(2);
  });

  // Add test for unknown opcodes
  it("should throw an error for unknown opcodes", () => {
    const cpu = createCPU();
    
    // Set up invalid opcode
    cpu.mem[0] = 0xFF; // Invalid opcode
    
    // Should throw an error
    expect(() => step6502(cpu)).toThrow("Unknown opcode");
    
    // Reset PC for second test
    cpu.pc = 0;
    
    // Should also throw an error with trace enabled
    expect(() => step6502(cpu, true)).toThrow("Unknown opcode");
  });
});
