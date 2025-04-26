import { describe, expect, it } from "bun:test";
import { createCPU, step6502 } from "./utils";
import { ZERO, NEGATIVE } from "../cpu";

describe("LDX Absolute,Y addressing mode", () => {
  it("should test LDX Absolute,Y with page crossing", () => {
    const cpu = createCPU();
    
    // Setup for LDX Absolute,Y with page crossing
    cpu.pc = 0x1000;
    cpu.mem[0x1000] = 0xBE; // LDX Absolute,Y
    cpu.mem[0x1001] = 0xFF; // Low byte of address (0x01FF)
    cpu.mem[0x1002] = 0x01; // High byte of address
    cpu.y = 0x01;           // Y register = 1, effective address = 0x0200
    
    // Value to load at the effective address
    cpu.mem[0x0200] = 0x42;
    
    // Execute the instruction
    const cycles = step6502(cpu);
    
    // Check cycles (should be 5 due to page crossing)
    expect(cycles).toBe(5);
    
    // Check if X register was loaded with the value
    expect(cpu.x).toBe(0x42);
    
    // Check PC was incremented correctly
    expect(cpu.pc).toBe(0x1003);
    
    // Now test without page crossing
    cpu.pc = 0x1000;
    cpu.mem[0x1000] = 0xBE; // LDX Absolute,Y
    cpu.mem[0x1001] = 0x50; // Low byte of address (0x0150)
    cpu.mem[0x1002] = 0x01; // High byte of address
    cpu.y = 0x01;           // Y register = 1, effective address = 0x0151
    
    // Value to load at the effective address
    cpu.mem[0x0151] = 0x84; // Negative value
    
    // Execute the instruction
    const cyclesNoPageCross = step6502(cpu);
    
    // Check cycles (should be 4 without page crossing)
    expect(cyclesNoPageCross).toBe(4);
    
    // Check if X register was loaded with the value
    expect(cpu.x).toBe(0x84);
    
    // Check if negative flag was set
    expect(cpu.p & NEGATIVE).toBe(NEGATIVE);
    
    // One more test with zero result
    cpu.pc = 0x1000;
    cpu.mem[0x1000] = 0xBE; // LDX Absolute,Y
    cpu.mem[0x1001] = 0x50; // Low byte of address (0x0150)
    cpu.mem[0x1002] = 0x01; // High byte of address
    cpu.y = 0x01;           // Y register = 1, effective address = 0x0151
    
    // Value to load at the effective address
    cpu.mem[0x0151] = 0x00; // Zero value
    
    // Execute the instruction
    step6502(cpu);
    
    // Check if X register was loaded with the value
    expect(cpu.x).toBe(0x00);
    
    // Check if zero flag was set
    expect(cpu.p & ZERO).toBe(ZERO);
  });
});