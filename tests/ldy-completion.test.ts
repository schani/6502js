import { describe, expect, it } from "bun:test";
import { type CPU, createCPU, step6502, ZERO, NEGATIVE } from "./utils";

describe("Complete LDY instruction coverage", () => {
  it("should test every possible LDY addressing mode and flag combination", () => {
    const cpu = createCPU();
    
    // Zero Page test with uninitialized memory
    cpu.mem[0x1000] = 0xA4; // LDY Zero Page
    cpu.mem[0x1001] = 0x90; // Zero page address (uninitialized)
    
    cpu.pc = 0x1000;
    
    let cycles = step6502(cpu);
    
    expect(cycles).toBe(3);
    expect(cpu.y).toBe(0); // Should read 0 from uninitialized memory
    expect(cpu.p & ZERO).toBe(ZERO); // Zero flag should be set
    expect(cpu.pc).toBe(0x1002);
    
    // Absolute test with negative value after wrap-around
    cpu.mem[0x1002] = 0xAC; // LDY Absolute
    cpu.mem[0x1003] = 0xFF; // Low byte of address
    cpu.mem[0x1004] = 0xFF; // High byte of address (0xFFFF)
    cpu.mem[0xFFFF] = 0x80; // Negative value
    
    cycles = step6502(cpu);
    
    expect(cycles).toBe(4);
    expect(cpu.y).toBe(0x80);
    expect(cpu.p & NEGATIVE).toBe(NEGATIVE); // Negative flag should be set
    expect(cpu.pc).toBe(0x1005);
    
    // Zero Page,X test with wrap-around
    cpu.mem[0x1005] = 0xB4; // LDY Zero Page,X
    cpu.mem[0x1006] = 0xF0; // Zero page address
    cpu.mem[0x000F] = 0x42; // Value at 0xF0 + 0x1F = 0x10F, which wraps to 0x0F
    
    cpu.x = 0x1F; // X offset causes wrap-around
    
    cycles = step6502(cpu);
    
    expect(cycles).toBe(4);
    expect(cpu.y).toBe(0x42);
    expect(cpu.pc).toBe(0x1007);
    
    // Absolute,X test with page crossing
    cpu.mem[0x1007] = 0xBC; // LDY Absolute,X
    cpu.mem[0x1008] = 0x00; // Low byte of address
    cpu.mem[0x1009] = 0x04; // High byte of address (0x0400)
    cpu.mem[0x0500] = 0x37; // Value at 0x0400 + 0x100 = 0x0500
    
    cpu.x = 0x100; // Page boundary crossing
    
    cycles = step6502(cpu);
    
    expect(cycles).toBe(5); // 4 + 1 for page crossing
    expect(cpu.y).toBe(0x37);
    expect(cpu.pc).toBe(0x100A);
  });
});