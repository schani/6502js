import { describe, expect, it } from "bun:test";
import { type CPU, createCPU, step6502, CARRY, ZERO, INTERRUPT, DECIMAL, BREAK, UNUSED, OVERFLOW, NEGATIVE } from "./utils";

describe("Additional branch instruction tests", () => {
  // This adds even more branch tests to ensure 100% coverage
  it("should test branches with small positive offset (no page crossing)", () => {
    const cpu = createCPU();
    
    // BPL - Branch on Plus (Negative Clear)
    cpu.mem[0x1000] = 0x10; // BPL
    cpu.mem[0x1001] = 0x05; // Offset (positive, small)
    cpu.p &= ~NEGATIVE; // Clear negative (condition true)
    cpu.pc = 0x1000;
    let cycles = step6502(cpu);
    expect(cycles).toBe(3); // 3 cycles, no page cross
    expect(cpu.pc).toBe(0x1007); // 0x1002 + 0x05 = 0x1007
    
    // BVC - Branch on Overflow Clear
    cpu.mem[0x2000] = 0x50; // BVC
    cpu.mem[0x2001] = 0x05; // Offset (positive, small)
    cpu.p &= ~OVERFLOW; // Clear overflow (condition true)
    cpu.pc = 0x2000;
    cycles = step6502(cpu);
    expect(cycles).toBe(3); // 3 cycles, no page cross
    expect(cpu.pc).toBe(0x2007); // 0x2002 + 0x05 = 0x2007
    
    // BVS - Branch on Overflow Set
    cpu.mem[0x3000] = 0x70; // BVS
    cpu.mem[0x3001] = 0x05; // Offset (positive, small)
    cpu.p |= OVERFLOW; // Set overflow (condition true)
    cpu.pc = 0x3000;
    cycles = step6502(cpu);
    expect(cycles).toBe(3); // 3 cycles, no page cross
    expect(cpu.pc).toBe(0x3007); // 0x3002 + 0x05 = 0x3007
  });
  
  it("should test branches with small negative offset (no page crossing)", () => {
    const cpu = createCPU();
    
    // BCC - Branch on Carry Clear
    cpu.mem[0x1010] = 0x90; // BCC
    cpu.mem[0x1011] = 0xFD; // Offset (negative, -3 in 2's complement)
    cpu.p &= ~CARRY; // Clear carry (condition true)
    cpu.pc = 0x1010;
    let cycles = step6502(cpu);
    expect(cycles).toBe(3); // 3 cycles, no page cross
    expect(cpu.pc).toBe(0x100F); // 0x1012 - 3 = 0x100F
    
    // BCS - Branch on Carry Set
    cpu.mem[0x2010] = 0xB0; // BCS
    cpu.mem[0x2011] = 0xFD; // Offset (negative, -3 in 2's complement)
    cpu.p |= CARRY; // Set carry (condition true)
    cpu.pc = 0x2010;
    cycles = step6502(cpu);
    expect(cycles).toBe(3); // 3 cycles, no page cross
    expect(cpu.pc).toBe(0x200F); // 0x2012 - 3 = 0x200F
    
    // BEQ - Branch on Equal (Zero Set)
    cpu.mem[0x3010] = 0xF0; // BEQ
    cpu.mem[0x3011] = 0xFD; // Offset (negative, -3 in 2's complement)
    cpu.p |= ZERO; // Set zero (condition true)
    cpu.pc = 0x3010;
    cycles = step6502(cpu);
    expect(cycles).toBe(3); // 3 cycles, no page cross
    expect(cpu.pc).toBe(0x300F); // 0x3012 - 3 = 0x300F
    
    // BNE - Branch on Not Equal (Zero Clear)
    cpu.mem[0x4010] = 0xD0; // BNE
    cpu.mem[0x4011] = 0xFD; // Offset (negative, -3 in 2's complement)
    cpu.p &= ~ZERO; // Clear zero (condition true)
    cpu.pc = 0x4010;
    cycles = step6502(cpu);
    expect(cycles).toBe(3); // 3 cycles, no page cross
    expect(cpu.pc).toBe(0x400F); // 0x4012 - 3 = 0x400F
    
    // BMI - Branch on Minus (Negative Set)
    cpu.mem[0x5010] = 0x30; // BMI
    cpu.mem[0x5011] = 0xFD; // Offset (negative, -3 in 2's complement)
    cpu.p |= NEGATIVE; // Set negative (condition true)
    cpu.pc = 0x5010;
    cycles = step6502(cpu);
    expect(cycles).toBe(3); // 3 cycles, no page cross
    expect(cpu.pc).toBe(0x500F); // 0x5012 - 3 = 0x500F
  });
});