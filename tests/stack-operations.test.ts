import { describe, expect, it } from "bun:test";
import { createCPU, step6502, ZERO, NEGATIVE, CARRY, BREAK, UNUSED } from "./utils";

describe("Stack operations", () => {
  it("should perform PHA and PLA instructions", () => {
    const cpu = createCPU();
    
    // Set up accumulator
    cpu.a = 0x42;
    
    // PHA - Push Accumulator on Stack
    cpu.mem[0] = 0x48; // PHA
    
    let cycles = step6502(cpu);
    
    // Check that SP was decremented
    expect(cpu.sp).toBe(0xFC);
    expect(cpu.mem[0x01FD]).toBe(0x42); // Stack value at 0x01FD should be 0x42
    expect(cpu.pc).toBe(1);
    expect(cycles).toBe(3);
    
    // Clear accumulator
    cpu.a = 0;
    
    // Set up PLA instruction
    cpu.mem[1] = 0x68; // PLA
    
    cycles = step6502(cpu);
    
    // Check that accumulator got value from stack and SP was incremented
    expect(cpu.a).toBe(0x42);
    expect(cpu.sp).toBe(0xFD);
    expect(cpu.pc).toBe(2);
    expect(cycles).toBe(4);
    expect(cpu.p & ZERO).toBe(0);
    expect(cpu.p & NEGATIVE).toBe(0);
  });
  
  it("should perform PHP and PLP instructions", () => {
    const cpu = createCPU();
    
    // Set up status register with some flags
    cpu.p = ZERO | CARRY;
    
    // PHP - Push Processor Status on Stack
    cpu.mem[0] = 0x08; // PHP
    
    let cycles = step6502(cpu);
    
    // Check that SP was decremented and status was pushed with B and unused flags set
    expect(cpu.sp).toBe(0xFC);
    expect(cpu.mem[0x01FD]).toBe((ZERO | CARRY | BREAK | UNUSED));
    expect(cpu.pc).toBe(1);
    expect(cycles).toBe(3);
    
    // Clear status register
    cpu.p = 0;
    
    // Set up PLP instruction
    cpu.mem[1] = 0x28; // PLP
    
    cycles = step6502(cpu);
    
    // Check that status was pulled from stack (B and unused should be ignored)
    expect(cpu.p).toBe(ZERO | CARRY | UNUSED);
    expect(cpu.sp).toBe(0xFD);
    expect(cpu.pc).toBe(2);
    expect(cycles).toBe(4);
  });
});
