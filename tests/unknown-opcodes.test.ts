import { describe, expect, it } from "bun:test";
import { type CPU, createCPU, step6502, CARRY, ZERO, INTERRUPT, DECIMAL, BREAK, UNUSED, OVERFLOW, NEGATIVE } from "./utils";

describe("Unknown opcodes", () => {
  it("should throw an error for unknown opcodes", () => {
    const cpu = createCPU();
    
    // Load an invalid/unknown opcode (0xFF) into memory
    cpu.mem[0] = 0xFF;
    
    // Set PC to 0 to execute the unknown opcode
    cpu.pc = 0;
    
    // Should throw an error
    expect(() => step6502(cpu)).toThrow("Unknown opcode");
  });

  it("should throw an error for unknown opcodes with trace enabled", () => {
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
      cpu.mem[0] = 0xFF;
      
      // Set PC to 0 to execute the unknown opcode
      cpu.pc = 0;
      
      // Should throw an error but will log trace info first
      expect(() => step6502(cpu, true)).toThrow("Unknown opcode");
      
      // Trace logging should have been called
      expect(traceOutput).toBe(true);
    } finally {
      // Restore the original console.log
      console.log = originalConsoleLog;
    }
  });
});