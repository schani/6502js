import { describe, expect, it } from "bun:test";
import { type CPU, createCPU, step6502, ZERO, NEGATIVE } from "./utils";

describe("LDY with different addressing modes", () => {
  it("should perform LDY Zero Page,X instruction", () => {
    const cpu = createCPU();
    
    // Setup
    cpu.mem[0] = 0xB4; // LDY Zero Page,X
    cpu.mem[1] = 0x80; // Zero page address
    cpu.mem[0x90] = 0x42; // Value at 0x80 + 0x10 (with zero page wrap-around)
    
    cpu.x = 0x10; // X offset
    cpu.pc = 0;
    
    // Execute
    const cycles = step6502(cpu);
    
    // Verify
    expect(cycles).toBe(4);
    expect(cpu.y).toBe(0x42);
    expect(cpu.p & ZERO).toBe(0); // Result is not zero
    expect(cpu.p & NEGATIVE).toBe(0); // Result is not negative
  });
  
  it("should perform LDY Absolute instruction", () => {
    const cpu = createCPU();
    
    // Setup
    cpu.mem[0] = 0xAC; // LDY Absolute
    cpu.mem[1] = 0x00; // Low byte of address
    cpu.mem[2] = 0x20; // High byte of address (0x2000)
    cpu.mem[0x2000] = 0x80; // Value at absolute address
    
    cpu.pc = 0;
    
    // Execute
    const cycles = step6502(cpu);
    
    // Verify
    expect(cycles).toBe(4);
    expect(cpu.y).toBe(0x80);
    expect(cpu.p & ZERO).toBe(0); // Result is not zero
    expect(cpu.p & NEGATIVE).toBe(NEGATIVE); // Result is negative (bit 7 set)
  });
  
  it("should perform LDY Absolute,X instruction", () => {
    const cpu = createCPU();
    
    // Setup
    cpu.mem[0] = 0xBC; // LDY Absolute,X
    cpu.mem[1] = 0x00; // Low byte of address
    cpu.mem[2] = 0x20; // High byte of address (0x2000)
    cpu.mem[0x2010] = 0x00; // Value at 0x2000 + 0x10 = 0x2010
    
    cpu.x = 0x10; // X offset
    cpu.pc = 0;
    
    // Execute
    const cycles = step6502(cpu);
    
    // Verify
    expect(cycles).toBe(4); // No page boundary crossed
    expect(cpu.y).toBe(0x00);
    expect(cpu.p & ZERO).toBe(ZERO); // Result is zero
    expect(cpu.p & NEGATIVE).toBe(0); // Result is not negative
  });
  
  it("should perform LDY Absolute,X instruction with page crossing", () => {
    const cpu = createCPU();
    
    // Setup
    cpu.mem[0] = 0xBC; // LDY Absolute,X
    cpu.mem[1] = 0xF0; // Low byte of address
    cpu.mem[2] = 0x20; // High byte of address (0x20F0)
    cpu.mem[0x2100] = 0xFF; // Value at 0x20F0 + 0x10 = 0x2100 (page boundary crossed)
    
    cpu.x = 0x10; // X offset
    cpu.pc = 0;
    
    // Execute
    const cycles = step6502(cpu);
    
    // Verify
    expect(cycles).toBe(5); // +1 cycle for page boundary crossing
    expect(cpu.y).toBe(0xFF);
    expect(cpu.p & ZERO).toBe(0); // Result is not zero
    expect(cpu.p & NEGATIVE).toBe(NEGATIVE); // Result is negative (bit 7 set)
  });
});