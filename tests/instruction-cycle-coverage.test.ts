import { describe, expect, it } from "bun:test";
import { type CPU, createCPU, step6502, CARRY, ZERO, OVERFLOW, NEGATIVE } from "./utils";

describe("Instruction cycle counting and edge cases", () => {
  // Focus on simpler tests that don't rely on complex memory layouts
  it("should test BVS/BMI branches with negative offsets", () => {
    const cpu = createCPU();
    
    // Setup BVS instruction with negative offset
    cpu.mem[0x2000] = 0x70; // BVS
    cpu.mem[0x2001] = 0xFB; // -5 in two's complement
    
    cpu.p |= OVERFLOW; // Set overflow flag (condition true)
    cpu.pc = 0x2000;
    
    // Execute BVS
    let cycles = step6502(cpu);
    expect(cycles).toBe(4); // 4 cycles for branch taken across page boundary
    expect(cpu.pc).toBe(0x1FFD); // 0x2002 - 5 = 0x1FFD
    
    // Setup BMI instruction with negative offset
    cpu.mem[0x3000] = 0x30; // BMI
    cpu.mem[0x3001] = 0xFB; // -5 in two's complement
    
    cpu.p |= NEGATIVE; // Set negative flag (condition true)
    cpu.pc = 0x3000;
    
    // Execute BMI
    cycles = step6502(cpu);
    expect(cycles).toBe(4); // 4 cycles for branch taken across page boundary
    expect(cpu.pc).toBe(0x2FFD); // 0x3002 - 5 = 0x2FFD
  });
  
  it("should test branches with branch taken", () => {
    const cpu = createCPU();
    
    // Test BVC (Branch on Overflow Clear)
    cpu.mem[0x1000] = 0x50; // BVC
    cpu.mem[0x1001] = 0x10; // Branch offset (positive)
    
    cpu.p &= ~OVERFLOW; // Clear overflow flag (branch condition true)
    cpu.pc = 0x1000;
    
    let cycles = step6502(cpu);
    expect(cycles).toBe(3); // 3 cycles for branch taken without page crossing
    expect(cpu.pc).toBe(0x1012);
    
    // Test BVS (Branch on Overflow Set)
    cpu.mem[0x2000] = 0x70; // BVS
    cpu.mem[0x2001] = 0x10; // Branch offset (positive)
    
    cpu.p |= OVERFLOW; // Set overflow flag (branch condition true)
    cpu.pc = 0x2000;
    
    cycles = step6502(cpu);
    expect(cycles).toBe(3); // 3 cycles for branch taken without page crossing
    expect(cpu.pc).toBe(0x2012);
  });
  
  it("should test branches with branch not taken", () => {
    const cpu = createCPU();
    
    // Test BVC (Branch on Overflow Clear)
    cpu.mem[0x1000] = 0x50; // BVC
    cpu.mem[0x1001] = 0x10; // Branch offset (not used)
    
    cpu.p |= OVERFLOW; // Set overflow flag (branch condition false)
    cpu.pc = 0x1000;
    
    let cycles = step6502(cpu);
    expect(cycles).toBe(2); // 2 cycles for branch not taken
    expect(cpu.pc).toBe(0x1002);
    
    // Test BVS (Branch on Overflow Set)
    cpu.mem[0x2000] = 0x70; // BVS
    cpu.mem[0x2001] = 0x10; // Branch offset (not used)
    
    cpu.p &= ~OVERFLOW; // Clear overflow flag (branch condition false)
    cpu.pc = 0x2000;
    
    cycles = step6502(cpu);
    expect(cycles).toBe(2); // 2 cycles for branch not taken
    expect(cpu.pc).toBe(0x2002);
  });
});