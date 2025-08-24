import { describe, expect, it } from "bun:test";
import { CARRY, ZERO, NEGATIVE, OVERFLOW, DECIMAL, INTERRUPT } from "../6502";
import { createCPU, getProgramCounter } from "./utils";

describe("Remaining branch and flag operations", async () => {
  it("should test BCS with page crossing", async () => {
    const cpu = createCPU();
    
    // Setup for BCS with page crossing - need PC at a location where PC+2+offset crosses a page
    await cpu.setProgramCounter(0x10F0);
    await cpu.loadByte(0x10F0, 0xB0); // BCS
    await cpu.loadByte(0x10F1, 0x10); // Offset 16 (crossing from 0x10F2 to 0x1102)
    await cpu.setStatusFlag(CARRY);   // Set carry flag for branch to be taken
    
    // Execute BCS
    const cycles = await cpu.step();
    
    // Branch calculation: PC (after fetching instruction) + offset
    // PC after fetching: 0x10F0 + 2 = 0x10F2
    // Effective PC: 0x10F2 + 0x10 = 0x1102 (crosses page boundary)
    
    // Check cycles (should be 4 due to page crossing)
    expect(cycles).toBe(4);
    
    // Check if PC was set correctly
    expect(await await getProgramCounter(cpu)).toBe(0x1102);
  });
  
  it("should test BEQ with page crossing", async () => {
    const cpu = createCPU();
    
    // Setup for BEQ with page crossing
    await cpu.setProgramCounter(0x10F0);
    await cpu.loadByte(0x10F0, 0xF0); // BEQ
    await cpu.loadByte(0x10F1, 0x10); // Offset 16 (crossing from 0x10F2 to 0x1102)
    await cpu.setStatusFlag(ZERO);    // Set zero flag for branch to be taken
    
    // Execute BEQ
    const cycles = await cpu.step();
    
    // Branch calculation: PC (after fetching instruction) + offset
    // PC after fetching: 0x10F0 + 2 = 0x10F2
    // Effective PC: 0x10F2 + 0x10 = 0x1102 (crosses page boundary)
    
    // Check cycles (should be 4 due to page crossing)
    expect(cycles).toBe(4);
    
    // Check if PC was set correctly
    expect(await await getProgramCounter(cpu)).toBe(0x1102);
  });
  
  it("should test BMI with page crossing", async () => {
    const cpu = createCPU();
    
    // Setup for BMI with page crossing
    await cpu.setProgramCounter(0x10F0);
    await cpu.loadByte(0x10F0, 0x30); // BMI
    await cpu.loadByte(0x10F1, 0x10); // Offset 16 (crossing from 0x10F2 to 0x1102)
    await cpu.setStatusFlag(NEGATIVE);  // Set negative flag for branch to be taken
    
    // Execute BMI
    const cycles = await cpu.step();
    
    // Branch calculation: PC (after fetching instruction) + offset
    // PC after fetching: 0x10F0 + 2 = 0x10F2
    // Effective PC: 0x10F2 + 0x10 = 0x1102 (crosses page boundary)
    
    // Check cycles (should be 4 due to page crossing)
    expect(cycles).toBe(4);
    
    // Check if PC was set correctly
    expect(await await getProgramCounter(cpu)).toBe(0x1102);
  });
  
  it("should test BVS with page crossing", async () => {
    const cpu = createCPU();
    
    // Setup for BVS with page crossing
    await cpu.setProgramCounter(0x10F0);
    await cpu.loadByte(0x10F0, 0x70); // BVS
    await cpu.loadByte(0x10F1, 0x10); // Offset 16 (crossing from 0x10F2 to 0x1102)
    await cpu.setStatusFlag(OVERFLOW);  // Set overflow flag for branch to be taken
    
    // Execute BVS
    const cycles = await cpu.step();
    
    // Branch calculation: PC (after fetching instruction) + offset
    // PC after fetching: 0x10F0 + 2 = 0x10F2
    // Effective PC: 0x10F2 + 0x10 = 0x1102 (crosses page boundary)
    
    // Check cycles (should be 4 due to page crossing)
    expect(cycles).toBe(4);
    
    // Check if PC was set correctly
    expect(await await getProgramCounter(cpu)).toBe(0x1102);
  });
  
  it("should test all flag setting and clearing instructions", async () => {
    const cpu = createCPU();
    
    // Test CLC (Clear Carry)
    await cpu.setProgramCounter(0);
    await cpu.loadByte(0, 0x18); // CLC
    await cpu.setStatusFlag(CARRY);  // Set carry flag
    
    await cpu.step();
    expect(((await cpu.getState()).p & CARRY) === 0).toBe(true); // Carry flag should be cleared
    
    // Test SEC (Set Carry)
    await cpu.setProgramCounter(0);
    await cpu.loadByte(0, 0x38); // SEC
    await cpu.clearStatusFlag(CARRY);  // Clear carry flag
    
    await cpu.step();
    expect(((await cpu.getState()).p & CARRY) !== 0).toBe(true); // Carry flag should be set
    
    // Test CLI (Clear Interrupt)
    await cpu.setProgramCounter(0);
    await cpu.loadByte(0, 0x58); // CLI
    await cpu.setStatusFlag(INTERRUPT); // Set interrupt flag
    
    await cpu.step();
    expect(((await cpu.getState()).p & INTERRUPT) === 0).toBe(true); // Interrupt flag should be cleared
    
    // Test SEI (Set Interrupt)
    await cpu.setProgramCounter(0);
    await cpu.loadByte(0, 0x78); // SEI
    await cpu.clearStatusFlag(INTERRUPT); // Clear interrupt flag
    
    await cpu.step();
    expect(((await cpu.getState()).p & INTERRUPT) !== 0).toBe(true); // Interrupt flag should be set
    
    // Test CLV (Clear Overflow)
    await cpu.setProgramCounter(0);
    await cpu.loadByte(0, 0xB8); // CLV
    await cpu.setStatusFlag(OVERFLOW);  // Set overflow flag
    
    await cpu.step();
    expect(((await cpu.getState()).p & OVERFLOW) === 0).toBe(true); // Overflow flag should be cleared
    
    // Test CLD (Clear Decimal)
    await cpu.setProgramCounter(0);
    await cpu.loadByte(0, 0xD8); // CLD
    await cpu.setStatusFlag(DECIMAL);   // Set decimal flag
    
    await cpu.step();
    expect(((await cpu.getState()).p & DECIMAL) === 0).toBe(true); // Decimal flag should be cleared
    
    // Test SED (Set Decimal)
    await cpu.setProgramCounter(0);
    await cpu.loadByte(0, 0xF8); // SED
    await cpu.clearStatusFlag(DECIMAL); // Clear decimal flag
    
    await cpu.step();
    expect(((await cpu.getState()).p & DECIMAL) !== 0).toBe(true); // Decimal flag should be set
  });
  
  it("should test compare operations with various results", async () => {
    const cpu = createCPU();
    
    // Test CMP with equal values (sets Z flag, sets C flag)
    await cpu.setProgramCounter(0);
    await cpu.loadByte(0, 0xC9); // CMP Immediate
    await cpu.loadByte(1, 0x42); // Compare with value 0x42
    await cpu.setAccumulator(0x42);  // Accumulator value
    
    await cpu.step();
    expect(((await cpu.getState()).p & ZERO) !== 0).toBe(true);   // Zero flag should be set
    expect(((await cpu.getState()).p & CARRY) !== 0).toBe(true);  // Carry flag should be set (A >= M)
    
    // Test CMP with accumulator greater (clears Z flag, sets C flag)
    await cpu.setProgramCounter(0);
    await cpu.loadByte(0, 0xC9); // CMP Immediate
    await cpu.loadByte(1, 0x40); // Compare with value 0x40
    await cpu.setAccumulator(0x42);  // Accumulator value
    
    await cpu.step();
    expect(((await cpu.getState()).p & ZERO) === 0).toBe(true);   // Zero flag should be cleared
    expect(((await cpu.getState()).p & CARRY) !== 0).toBe(true);   // Carry flag should be set (A >= M)
    
    // Test CMP with accumulator less (clears Z flag, clears C flag)
    await cpu.setProgramCounter(0);
    await cpu.loadByte(0, 0xC9); // CMP Immediate
    await cpu.loadByte(1, 0x50); // Compare with value 0x50
    await cpu.setAccumulator(0x42);  // Accumulator value
    
    await cpu.step();
    expect(((await cpu.getState()).p & ZERO) === 0).toBe(true);   // Zero flag should be cleared
    expect(((await cpu.getState()).p & CARRY) === 0).toBe(true);  // Carry flag should be cleared (A < M)
  });
});