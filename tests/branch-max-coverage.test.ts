import { describe, expect, it } from "bun:test";
import { type CPU, createCPU, step6502, CARRY, ZERO, INTERRUPT, DECIMAL, BREAK, UNUSED, OVERFLOW, NEGATIVE } from "./utils";

describe("Branch instruction complete coverage", () => {
  // Test all branch instructions systematically to ensure 100% coverage
  it("should test all branch instructions with positive offsets and page crosses", () => {
    const cpu = createCPU();
    
    // BCC - Branch on Carry Clear
    cpu.mem[0x10F0] = 0x90; // BCC
    cpu.mem[0x10F1] = 0x20; // Offset (positive)
    cpu.p &= ~CARRY; // Clear carry (condition true)
    cpu.pc = 0x10F0;
    let cycles = step6502(cpu);
    expect(cycles).toBe(4); // 3 + 1 for page cross
    expect(cpu.pc).toBe(0x1112); // 0x10F2 + 0x20 = 0x1112
    
    // Reset PC for next test
    cpu.pc = 0x10F0;
    cpu.p |= CARRY; // Set carry (condition false)
    cycles = step6502(cpu);
    expect(cycles).toBe(2); // No branch taken
    expect(cpu.pc).toBe(0x10F2);
    
    // BCS - Branch on Carry Set
    cpu.mem[0x20F0] = 0xB0; // BCS
    cpu.mem[0x20F1] = 0x20; // Offset (positive)
    cpu.p |= CARRY; // Set carry (condition true)
    cpu.pc = 0x20F0;
    cycles = step6502(cpu);
    expect(cycles).toBe(4); // 3 + 1 for page cross
    expect(cpu.pc).toBe(0x2112); // 0x20F2 + 0x20 = 0x2112
    
    // Reset PC for next test
    cpu.pc = 0x20F0;
    cpu.p &= ~CARRY; // Clear carry (condition false)
    cycles = step6502(cpu);
    expect(cycles).toBe(2); // No branch taken
    expect(cpu.pc).toBe(0x20F2);
    
    // BEQ - Branch on Equal (Zero Set)
    cpu.mem[0x30F0] = 0xF0; // BEQ
    cpu.mem[0x30F1] = 0x20; // Offset (positive)
    cpu.p |= ZERO; // Set zero (condition true)
    cpu.pc = 0x30F0;
    cycles = step6502(cpu);
    expect(cycles).toBe(4); // 3 + 1 for page cross
    expect(cpu.pc).toBe(0x3112); // 0x30F2 + 0x20 = 0x3112
    
    // Reset PC for next test
    cpu.pc = 0x30F0;
    cpu.p &= ~ZERO; // Clear zero (condition false)
    cycles = step6502(cpu);
    expect(cycles).toBe(2); // No branch taken
    expect(cpu.pc).toBe(0x30F2);
    
    // BMI - Branch on Minus (Negative Set)
    cpu.mem[0x40F0] = 0x30; // BMI
    cpu.mem[0x40F1] = 0x20; // Offset (positive)
    cpu.p |= NEGATIVE; // Set negative (condition true)
    cpu.pc = 0x40F0;
    cycles = step6502(cpu);
    expect(cycles).toBe(4); // 3 + 1 for page cross
    expect(cpu.pc).toBe(0x4112); // 0x40F2 + 0x20 = 0x4112
    
    // Reset PC for next test
    cpu.pc = 0x40F0;
    cpu.p &= ~NEGATIVE; // Clear negative (condition false)
    cycles = step6502(cpu);
    expect(cycles).toBe(2); // No branch taken
    expect(cpu.pc).toBe(0x40F2);
  });
  
  it("should test all branch instructions with negative offsets and page crosses", () => {
    const cpu = createCPU();
    
    // BNE - Branch on Not Equal (Zero Clear)
    cpu.mem[0x1010] = 0xD0; // BNE
    cpu.mem[0x1011] = 0x80; // Offset (negative, -128 in 2's complement)
    cpu.p &= ~ZERO; // Clear zero (condition true)
    cpu.pc = 0x1010;
    let cycles = step6502(cpu);
    expect(cycles).toBe(4); // 3 + 1 for page cross
    expect(cpu.pc).toBe(0x0F92); // 0x1012 - 128 = 0x0F92
    
    // Reset PC for next test
    cpu.pc = 0x1010;
    cpu.p |= ZERO; // Set zero (condition false)
    cycles = step6502(cpu);
    expect(cycles).toBe(2); // No branch taken
    expect(cpu.pc).toBe(0x1012);
    
    // BPL - Branch on Plus (Negative Clear)
    cpu.mem[0x2010] = 0x10; // BPL
    cpu.mem[0x2011] = 0x80; // Offset (negative, -128 in 2's complement)
    cpu.p &= ~NEGATIVE; // Clear negative (condition true)
    cpu.pc = 0x2010;
    cycles = step6502(cpu);
    expect(cycles).toBe(4); // 3 + 1 for page cross
    expect(cpu.pc).toBe(0x1F92); // 0x2012 - 128 = 0x1F92
    
    // Reset PC for next test
    cpu.pc = 0x2010;
    cpu.p |= NEGATIVE; // Set negative (condition false)
    cycles = step6502(cpu);
    expect(cycles).toBe(2); // No branch taken
    expect(cpu.pc).toBe(0x2012);
    
    // BVC - Branch on Overflow Clear
    cpu.mem[0x3010] = 0x50; // BVC
    cpu.mem[0x3011] = 0x80; // Offset (negative, -128 in 2's complement)
    cpu.p &= ~OVERFLOW; // Clear overflow (condition true)
    cpu.pc = 0x3010;
    cycles = step6502(cpu);
    expect(cycles).toBe(4); // 3 + 1 for page cross
    expect(cpu.pc).toBe(0x2F92); // 0x3012 - 128 = 0x2F92
    
    // Reset PC for next test
    cpu.pc = 0x3010;
    cpu.p |= OVERFLOW; // Set overflow (condition false)
    cycles = step6502(cpu);
    expect(cycles).toBe(2); // No branch taken
    expect(cpu.pc).toBe(0x3012);
    
    // BVS - Branch on Overflow Set
    cpu.mem[0x4010] = 0x70; // BVS
    cpu.mem[0x4011] = 0x80; // Offset (negative, -128 in 2's complement)
    cpu.p |= OVERFLOW; // Set overflow (condition true)
    cpu.pc = 0x4010;
    cycles = step6502(cpu);
    expect(cycles).toBe(4); // 3 + 1 for page cross
    expect(cpu.pc).toBe(0x3F92); // 0x4012 - 128 = 0x3F92
    
    // Reset PC for next test
    cpu.pc = 0x4010;
    cpu.p &= ~OVERFLOW; // Clear overflow (condition false)
    cycles = step6502(cpu);
    expect(cycles).toBe(2); // No branch taken
    expect(cpu.pc).toBe(0x4012);
  });
});