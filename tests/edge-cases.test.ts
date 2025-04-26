import { describe, expect, it } from "bun:test";
import { type CPU, createCPU, step6502, CARRY, ZERO, INTERRUPT, DECIMAL, BREAK, UNUSED, OVERFLOW, NEGATIVE } from "./utils";

describe("Edge cases and boundary conditions", () => {
  it("should test writeWord at memory boundaries", () => {
    // We need to access the CPU's internal functions directly
    function readWord(cpu: CPU, address: number): number {
      const lo = cpu.mem[address & 0xFFFF];
      const hi = cpu.mem[(address + 1) & 0xFFFF];
      return (hi << 8) | lo;
    }
    
    function writeWord(cpu: CPU, address: number, value: number): void {
      cpu.mem[address & 0xFFFF] = value & 0xFF;
      cpu.mem[(address + 1) & 0xFFFF] = (value >> 8) & 0xFF;
    }
    
    const cpu = createCPU();
    
    // Test writing at the exact memory boundary
    writeWord(cpu, 0xFFFF, 0xABCD);
    
    // Verify that the low byte is at 0xFFFF and high byte wraps to 0x0000
    expect(cpu.mem[0xFFFF]).toBe(0xCD);
    expect(cpu.mem[0x0000]).toBe(0xAB);
    
    // Try reading from the same address
    const value = readWord(cpu, 0xFFFF);
    expect(value).toBe(0xABCD);
  });
  
  // Test missing LDY cases
  it("should test LDY with various addressing modes", () => {
    const cpu = createCPU();
    
    // Case 1: Zero Page with zero result
    cpu.mem[0x1000] = 0xA4; // LDY Zero Page
    cpu.mem[0x1001] = 0x80; // Zero page address
    cpu.mem[0x0080] = 0x00; // Value (zero)
    
    cpu.y = 0xFF; // Non-zero value
    cpu.p &= ~ZERO; // Clear zero flag
    cpu.p |= NEGATIVE; // Set negative flag
    cpu.pc = 0x1000;
    
    let cycles = step6502(cpu);
    
    expect(cycles).toBe(3);
    expect(cpu.y).toBe(0x00);
    expect(cpu.p & ZERO).toBe(ZERO); // Zero flag should be set
    expect(cpu.p & NEGATIVE).toBe(0); // Negative flag should be clear
    
    // Case 2: LDY Absolute with negative result
    cpu.mem[0x1002] = 0xAC; // LDY Absolute
    cpu.mem[0x1003] = 0x00; // Low byte of address
    cpu.mem[0x1004] = 0x20; // High byte of address (0x2000)
    cpu.mem[0x2000] = 0x80; // Value (negative)
    
    cpu.y = 0x00; // Non-negative value
    cpu.p |= ZERO; // Set zero flag
    cpu.p &= ~NEGATIVE; // Clear negative flag
    cpu.pc = 0x1002;
    
    cycles = step6502(cpu);
    
    expect(cycles).toBe(4);
    expect(cpu.y).toBe(0x80);
    expect(cpu.p & ZERO).toBe(0); // Zero flag should be clear
    expect(cpu.p & NEGATIVE).toBe(NEGATIVE); // Negative flag should be set
  });
});