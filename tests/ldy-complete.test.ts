import { describe, expect, it } from "bun:test";
import { type CPU, createCPU, step6502, CARRY, ZERO, INTERRUPT, DECIMAL, BREAK, UNUSED, OVERFLOW, NEGATIVE } from "./utils";

describe("LDY instruction complete coverage", () => {
  it("should cover LDY instruction with all addressing modes", () => {
    // Create an uninitialized CPU
    const cpu = createCPU();
    
    // Test LDY Immediate
    cpu.mem[0x1000] = 0xA0; // LDY #$42
    cpu.mem[0x1001] = 0x42;
    cpu.pc = 0x1000;
    let cycles = step6502(cpu);
    expect(cycles).toBe(2);
    expect(cpu.y).toBe(0x42);
    
    // Test LDY Zero Page
    cpu.mem[0x1002] = 0xA4; // LDY $50
    cpu.mem[0x1003] = 0x50;
    cpu.mem[0x0050] = 0x99;
    cpu.pc = 0x1002;
    cycles = step6502(cpu);
    expect(cycles).toBe(3);
    expect(cpu.y).toBe(0x99);
    
    // Test LDY Zero Page,X
    cpu.mem[0x1004] = 0xB4; // LDY $60,X
    cpu.mem[0x1005] = 0x60;
    cpu.mem[0x0070] = 0x88; // Value at $60 + $10
    cpu.x = 0x10;
    cpu.pc = 0x1004;
    cycles = step6502(cpu);
    expect(cycles).toBe(4);
    expect(cpu.y).toBe(0x88);
    
    // Test LDY Absolute
    cpu.mem[0x1006] = 0xAC; // LDY $2000
    cpu.mem[0x1007] = 0x00;
    cpu.mem[0x1008] = 0x20;
    cpu.mem[0x2000] = 0x77;
    cpu.pc = 0x1006;
    cycles = step6502(cpu);
    expect(cycles).toBe(4);
    expect(cpu.y).toBe(0x77);
    
    // Test LDY Absolute,X
    cpu.mem[0x1009] = 0xBC; // LDY $2100,X
    cpu.mem[0x100A] = 0x00;
    cpu.mem[0x100B] = 0x21;
    cpu.mem[0x2110] = 0x66; // Value at $2100 + $10
    cpu.x = 0x10;
    cpu.pc = 0x1009;
    cycles = step6502(cpu);
    expect(cycles).toBe(4);
    expect(cpu.y).toBe(0x66);
    
    // Test LDY Absolute,X with page crossing
    cpu.mem[0x100C] = 0xBC; // LDY $21F0,X
    cpu.mem[0x100D] = 0xF0;
    cpu.mem[0x100E] = 0x21;
    cpu.mem[0x2200] = 0x55; // Value at $21F0 + $10 (page boundary crossed)
    cpu.x = 0x10;
    cpu.pc = 0x100C;
    cycles = step6502(cpu);
    expect(cycles).toBe(5); // +1 cycle for page boundary crossing
    expect(cpu.y).toBe(0x55);
  });
  
  it("should test negative/zero flag setting with LDY", () => {
    const cpu = createCPU();
    
    // Test LDY with zero result
    cpu.mem[0x1000] = 0xA0; // LDY #$00
    cpu.mem[0x1001] = 0x00;
    cpu.pc = 0x1000;
    cpu.p &= ~ZERO; // Clear zero flag
    cpu.p &= ~NEGATIVE; // Clear negative flag
    let cycles = step6502(cpu);
    expect(cycles).toBe(2);
    expect(cpu.y).toBe(0x00);
    expect(cpu.p & ZERO).toBe(ZERO); // Zero flag should be set
    expect(cpu.p & NEGATIVE).toBe(0); // Negative flag should be clear
    
    // Test LDY with negative result
    cpu.mem[0x1002] = 0xA0; // LDY #$80
    cpu.mem[0x1003] = 0x80;
    cpu.pc = 0x1002;
    cpu.p &= ~ZERO; // Clear zero flag
    cpu.p &= ~NEGATIVE; // Clear negative flag
    cycles = step6502(cpu);
    expect(cycles).toBe(2);
    expect(cpu.y).toBe(0x80);
    expect(cpu.p & ZERO).toBe(0); // Zero flag should be clear
    expect(cpu.p & NEGATIVE).toBe(NEGATIVE); // Negative flag should be set
  });
});