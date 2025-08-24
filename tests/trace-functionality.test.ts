import { describe, expect, it } from "bun:test";
import { CPU1 } from "../6502";
import { getAccumulator, getXRegister, getYRegister, getProgramCounter, getStackPointer, getStatusRegister } from "./utils";

describe("CPU trace functionality", () => {
  it("should log operations when trace is enabled", async () => {
    const cpu = new CPU1();
    
    // Save the original console.log
    const originalConsoleLog = console.log;
    
    // Mock console.log to track calls
    const logCalls: string[] = [];
    console.log = (message: string) => {
      logCalls.push(message);
    };
    
    try {
      // Setup a simple program with a few instructions
      await cpu.loadByte(0, 0xA9); // LDA Immediate
      await cpu.loadByte(1, 0x42); // with value 0x42
      await cpu.loadByte(2, 0xAA); // TAX (Transfer A to X)
      await cpu.loadByte(3, 0xEA); // NOP
      
      // Set PC to 0 to start execution
      await cpu.setProgramCounter(0);
      
      // Execute each instruction with trace enabled
      await cpu.step(true); // LDA
      await cpu.step(true); // TAX
      await cpu.step(true); // NOP
      
      // Verify that trace messages were logged
      expect(logCalls.length).toBe(3);
      
      // First log should be for LDA at PC=0
      expect(logCalls[0]).toContain('0000:');
      expect(logCalls[0]).toContain('LDA #$42');
      
      // Second log should be for TAX at PC=2
      expect(logCalls[1]).toContain('0002:');
      expect(logCalls[1]).toContain('TAX');
      
      // Third log should be for NOP at PC=3
      expect(logCalls[2]).toContain('0003:');
      expect(logCalls[2]).toContain('NOP');
      
      // Verify the CPU state is correct after execution
      expect(await getAccumulator(cpu)).toBe(0x42);
      expect(await getXRegister(cpu)).toBe(0x42);
      expect(await getProgramCounter(cpu)).toBe(4);
    } finally {
      // Restore the original console.log
      console.log = originalConsoleLog;
    }
  });
});