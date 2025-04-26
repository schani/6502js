import { describe, expect, it } from "bun:test";
import { createCPU, step6502, CARRY, INTERRUPT, DECIMAL, OVERFLOW } from "./utils";

describe("Status flag instructions", () => {
  it("should perform CLC instruction", () => {
    const cpu = createCPU();
    
    // Set up CPU state
    cpu.p |= CARRY; // Set carry flag
    
    // Set up memory
    cpu.mem[0] = 0x18; // CLC
    
    const cycles = step6502(cpu);
    
    expect(cpu.p & CARRY).toBe(0); // Carry should be cleared
    expect(cpu.pc).toBe(1);
    expect(cycles).toBe(2);
  });
  
  it("should perform SEC instruction", () => {
    const cpu = createCPU();
    
    // Set up CPU state
    cpu.p &= ~CARRY; // Clear carry flag
    
    // Set up memory
    cpu.mem[0] = 0x38; // SEC
    
    const cycles = step6502(cpu);
    
    expect(cpu.p & CARRY).toBe(CARRY); // Carry should be set
    expect(cpu.pc).toBe(1);
    expect(cycles).toBe(2);
  });
  
  it("should perform CLI instruction", () => {
    const cpu = createCPU();
    
    // Set up CPU state
    cpu.p |= INTERRUPT; // Set interrupt disable flag
    
    // Set up memory
    cpu.mem[0] = 0x58; // CLI
    
    const cycles = step6502(cpu);
    
    expect(cpu.p & INTERRUPT).toBe(0); // Interrupt disable should be cleared
    expect(cpu.pc).toBe(1);
    expect(cycles).toBe(2);
  });
  
  it("should perform SEI instruction", () => {
    const cpu = createCPU();
    
    // Set up CPU state
    cpu.p &= ~INTERRUPT; // Clear interrupt disable flag
    
    // Set up memory
    cpu.mem[0] = 0x78; // SEI
    
    const cycles = step6502(cpu);
    
    expect(cpu.p & INTERRUPT).toBe(INTERRUPT); // Interrupt disable should be set
    expect(cpu.pc).toBe(1);
    expect(cycles).toBe(2);
  });
  
  it("should perform CLD instruction", () => {
    const cpu = createCPU();
    
    // Set up CPU state
    cpu.p |= DECIMAL; // Set decimal flag
    
    // Set up memory
    cpu.mem[0] = 0xD8; // CLD
    
    const cycles = step6502(cpu);
    
    expect(cpu.p & DECIMAL).toBe(0); // Decimal flag should be cleared
    expect(cpu.pc).toBe(1);
    expect(cycles).toBe(2);
  });
  
  it("should perform SED instruction", () => {
    const cpu = createCPU();
    
    // Set up CPU state
    cpu.p &= ~DECIMAL; // Clear decimal flag
    
    // Set up memory
    cpu.mem[0] = 0xF8; // SED
    
    const cycles = step6502(cpu);
    
    expect(cpu.p & DECIMAL).toBe(DECIMAL); // Decimal flag should be set
    expect(cpu.pc).toBe(1);
    expect(cycles).toBe(2);
  });
  
  it("should perform CLV instruction", () => {
    const cpu = createCPU();
    
    // Set up CPU state
    cpu.p |= OVERFLOW; // Set overflow flag
    
    // Set up memory
    cpu.mem[0] = 0xB8; // CLV
    
    const cycles = step6502(cpu);
    
    expect(cpu.p & OVERFLOW).toBe(0); // Overflow flag should be cleared
    expect(cpu.pc).toBe(1);
    expect(cycles).toBe(2);
  });
});
