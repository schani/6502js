import { describe, expect, it } from "bun:test";
import { createCPU, step6502 } from "./utils";
import { CARRY, ZERO, NEGATIVE, OVERFLOW, DECIMAL, INTERRUPT } from "../cpu";

describe("Remaining branch and flag operations", () => {
  it("should test BCS with page crossing", () => {
    const cpu = createCPU();
    
    // Setup for BCS with page crossing - need PC at a location where PC+2+offset crosses a page
    cpu.pc = 0x10F0;
    cpu.mem[0x10F0] = 0xB0; // BCS
    cpu.mem[0x10F1] = 0x10; // Offset 16 (crossing from 0x10F2 to 0x1102)
    cpu.p = CARRY;          // Set carry flag for branch to be taken
    
    // Execute BCS
    const cycles = step6502(cpu);
    
    // Branch calculation: PC (after fetching instruction) + offset
    // PC after fetching: 0x10F0 + 2 = 0x10F2
    // Effective PC: 0x10F2 + 0x10 = 0x1102 (crosses page boundary)
    
    // Check cycles (should be 4 due to page crossing)
    expect(cycles).toBe(4);
    
    // Check if PC was set correctly
    expect(cpu.pc).toBe(0x1102);
  });
  
  it("should test BEQ with page crossing", () => {
    const cpu = createCPU();
    
    // Setup for BEQ with page crossing
    cpu.pc = 0x10F0;
    cpu.mem[0x10F0] = 0xF0; // BEQ
    cpu.mem[0x10F1] = 0x10; // Offset 16 (crossing from 0x10F2 to 0x1102)
    cpu.p = ZERO;           // Set zero flag for branch to be taken
    
    // Execute BEQ
    const cycles = step6502(cpu);
    
    // Branch calculation: PC (after fetching instruction) + offset
    // PC after fetching: 0x10F0 + 2 = 0x10F2
    // Effective PC: 0x10F2 + 0x10 = 0x1102 (crosses page boundary)
    
    // Check cycles (should be 4 due to page crossing)
    expect(cycles).toBe(4);
    
    // Check if PC was set correctly
    expect(cpu.pc).toBe(0x1102);
  });
  
  it("should test BMI with page crossing", () => {
    const cpu = createCPU();
    
    // Setup for BMI with page crossing
    cpu.pc = 0x10F0;
    cpu.mem[0x10F0] = 0x30; // BMI
    cpu.mem[0x10F1] = 0x10; // Offset 16 (crossing from 0x10F2 to 0x1102)
    cpu.p = NEGATIVE;       // Set negative flag for branch to be taken
    
    // Execute BMI
    const cycles = step6502(cpu);
    
    // Branch calculation: PC (after fetching instruction) + offset
    // PC after fetching: 0x10F0 + 2 = 0x10F2
    // Effective PC: 0x10F2 + 0x10 = 0x1102 (crosses page boundary)
    
    // Check cycles (should be 4 due to page crossing)
    expect(cycles).toBe(4);
    
    // Check if PC was set correctly
    expect(cpu.pc).toBe(0x1102);
  });
  
  it("should test BVS with page crossing", () => {
    const cpu = createCPU();
    
    // Setup for BVS with page crossing
    cpu.pc = 0x10F0;
    cpu.mem[0x10F0] = 0x70; // BVS
    cpu.mem[0x10F1] = 0x10; // Offset 16 (crossing from 0x10F2 to 0x1102)
    cpu.p = OVERFLOW;       // Set overflow flag for branch to be taken
    
    // Execute BVS
    const cycles = step6502(cpu);
    
    // Branch calculation: PC (after fetching instruction) + offset
    // PC after fetching: 0x10F0 + 2 = 0x10F2
    // Effective PC: 0x10F2 + 0x10 = 0x1102 (crosses page boundary)
    
    // Check cycles (should be 4 due to page crossing)
    expect(cycles).toBe(4);
    
    // Check if PC was set correctly
    expect(cpu.pc).toBe(0x1102);
  });
  
  it("should test all flag setting and clearing instructions", () => {
    const cpu = createCPU();
    
    // Test CLC (Clear Carry)
    cpu.pc = 0;
    cpu.mem[0] = 0x18; // CLC
    cpu.p = CARRY;     // Set carry flag
    
    step6502(cpu);
    expect(cpu.p & CARRY).toBe(0); // Carry flag should be cleared
    
    // Test SEC (Set Carry)
    cpu.pc = 0;
    cpu.mem[0] = 0x38; // SEC
    cpu.p = 0;         // Clear carry flag
    
    step6502(cpu);
    expect(cpu.p & CARRY).toBe(CARRY); // Carry flag should be set
    
    // Test CLI (Clear Interrupt)
    cpu.pc = 0;
    cpu.mem[0] = 0x58; // CLI
    cpu.p = INTERRUPT; // Set interrupt flag
    
    step6502(cpu);
    expect(cpu.p & INTERRUPT).toBe(0); // Interrupt flag should be cleared
    
    // Test SEI (Set Interrupt)
    cpu.pc = 0;
    cpu.mem[0] = 0x78; // SEI
    cpu.p = 0;         // Clear interrupt flag
    
    step6502(cpu);
    expect(cpu.p & INTERRUPT).toBe(INTERRUPT); // Interrupt flag should be set
    
    // Test CLV (Clear Overflow)
    cpu.pc = 0;
    cpu.mem[0] = 0xB8; // CLV
    cpu.p = OVERFLOW;  // Set overflow flag
    
    step6502(cpu);
    expect(cpu.p & OVERFLOW).toBe(0); // Overflow flag should be cleared
    
    // Test CLD (Clear Decimal)
    cpu.pc = 0;
    cpu.mem[0] = 0xD8; // CLD
    cpu.p = DECIMAL;   // Set decimal flag
    
    step6502(cpu);
    expect(cpu.p & DECIMAL).toBe(0); // Decimal flag should be cleared
    
    // Test SED (Set Decimal)
    cpu.pc = 0;
    cpu.mem[0] = 0xF8; // SED
    cpu.p = 0;         // Clear decimal flag
    
    step6502(cpu);
    expect(cpu.p & DECIMAL).toBe(DECIMAL); // Decimal flag should be set
  });
  
  it("should test compare operations with various results", () => {
    const cpu = createCPU();
    
    // Test CMP with equal values (sets Z flag, sets C flag)
    cpu.pc = 0;
    cpu.mem[0] = 0xC9; // CMP Immediate
    cpu.mem[1] = 0x42; // Compare with value 0x42
    cpu.a = 0x42;      // Accumulator value
    
    step6502(cpu);
    expect(cpu.p & ZERO).toBe(ZERO);   // Zero flag should be set
    expect(cpu.p & CARRY).toBe(CARRY); // Carry flag should be set (A >= M)
    
    // Test CMP with accumulator greater (clears Z flag, sets C flag)
    cpu.pc = 0;
    cpu.mem[0] = 0xC9; // CMP Immediate
    cpu.mem[1] = 0x40; // Compare with value 0x40
    cpu.a = 0x42;      // Accumulator value
    
    step6502(cpu);
    expect(cpu.p & ZERO).toBe(0);      // Zero flag should be cleared
    expect(cpu.p & CARRY).toBe(CARRY); // Carry flag should be set (A >= M)
    
    // Test CMP with accumulator less (clears Z flag, clears C flag)
    cpu.pc = 0;
    cpu.mem[0] = 0xC9; // CMP Immediate
    cpu.mem[1] = 0x50; // Compare with value 0x50
    cpu.a = 0x42;      // Accumulator value
    
    step6502(cpu);
    expect(cpu.p & ZERO).toBe(0);  // Zero flag should be cleared
    expect(cpu.p & CARRY).toBe(0); // Carry flag should be cleared (A < M)
  });
});