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
  it("should handle unknown opcodes", () => {
    const cpu = createCPU();
    
    // Set up invalid opcode
    cpu.mem[0] = 0xFF; // Invalid opcode
    
    const cycles = step6502(cpu);
    cpu.pc = 0; // Reset PC for second test
    const cyclesWithTrace = step6502(cpu, true);
    
    expect(cycles).toBe(2);
    expect(cyclesWithTrace).toBe(2);
  });
});
