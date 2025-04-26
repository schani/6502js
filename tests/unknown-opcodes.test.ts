import { describe, expect, it } from "bun:test";
import { type CPU, createCPU, step6502, CARRY, ZERO, INTERRUPT, DECIMAL, BREAK, UNUSED, OVERFLOW, NEGATIVE } from "./utils";

describe("Unknown opcodes", () => {
  it("should handle unknown opcodes gracefully", () => {
    const cpu = createCPU();
    
    // Load an invalid/unknown opcode (0xFF) into memory
    cpu.mem[0] = 0xFF;
    
    // Set PC to 0 to execute the unknown opcode
    cpu.pc = 0;
    
    // Execute the instruction
    const cycles = step6502(cpu);
    
    // Should take 2 cycles and increment PC
    expect(cycles).toBe(2);
    expect(cpu.pc).toBe(1);
  });

  it("should handle unknown opcodes with trace enabled", () => {
    const cpu = createCPU();
    
    // Save the original console.log
    const originalConsoleLog = console.log;
    
    // Mock console.log to track calls
    let logCalled = false;
    console.log = (...args: any[]) => {
      // Check if the log message contains "Unknown opcode"
      if (typeof args[0] === 'string' && args[0].includes('Unknown opcode')) {
        logCalled = true;
      }
    };
    
    try {
      // Load an invalid/unknown opcode (0xFF) into memory
      cpu.mem[0] = 0xFF;
      
      // Set PC to 0 to execute the unknown opcode
      cpu.pc = 0;
      
      // Execute the instruction with trace enabled
      const cycles = step6502(cpu, true);
      
      // Should take 2 cycles, increment PC, and log message
      expect(cycles).toBe(2);
      expect(cpu.pc).toBe(1);
      expect(logCalled).toBe(true);
    } finally {
      // Restore the original console.log
      console.log = originalConsoleLog;
    }
  });
});