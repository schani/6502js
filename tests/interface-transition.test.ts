import { describe, expect, it } from "bun:test";
/**
 * This test file demonstrates transitioning from direct CPU state access
 * to using the CPU interface methods
 */
import { getAccumulator, getXRegister, getYRegister, getProgramCounter, getStackPointer, getStatusRegister, createCPU, type CPU, CARRY, ZERO, NEGATIVE } from "./utils";
describe("CPU Interface Tests", () => {
  it("should demonstrate all interface methods", async () => {
    const cpu = createCPU();
    
    // Set registers
    await cpu.setAccumulator(0x42);
    await cpu.setXRegister(0x84);
    await cpu.setYRegister(0x28);
    await cpu.setStackPointer(0xF0);
    await cpu.setProgramCounter(0x1000);
    
    // Verify registers
    expect(await getAccumulator(cpu)).toBe(0x42);
    expect(await getXRegister(cpu)).toBe(0x84);
    expect(await getYRegister(cpu)).toBe(0x28);
    expect(await getStackPointer(cpu)).toBe(0xF0);
    expect(await getProgramCounter(cpu)).toBe(0x1000);
    
    // Set status flags
    await cpu.setStatusFlag(ZERO | CARRY);
    expect(((await cpu.getState()).p & ZERO) !== 0).toBe(true);
    expect(((await cpu.getState()).p & NEGATIVE) === 0).toBe(true);
    expect(((await cpu.getState()).p & CARRY) !== 0).toBe(true);
    
    // Clear status flags
    await cpu.clearStatusFlag(CARRY);
    expect(((await cpu.getState()).p & ZERO) !== 0).toBe(true);
    expect(((await cpu.getState()).p & CARRY) === 0).toBe(true);
    
    // Set full status register
    await cpu.setStatusRegister(NEGATIVE);
    expect(await getStatusRegister(cpu)).toBe(NEGATIVE);
    expect(((await cpu.getState()).p & NEGATIVE) !== 0).toBe(true);
    expect(((await cpu.getState()).p & ZERO) === 0).toBe(true);
    
    // Memory access
    await cpu.loadByte(0x2000, 0xFF);
    expect(await cpu.readByte(0x2000)).toBe(0xFF);
    
    await cpu.loadWord(0x2100, 0xABCD);
    expect(await cpu.readByte(0x2100)).toBe(0xCD); // Low byte
    expect(await cpu.readByte(0x2101)).toBe(0xAB); // High byte
    expect(await cpu.readWord(0x2100)).toBe(0xABCD);
    
    // Reset and verify defaults
    await cpu.reset();
    expect(await getAccumulator(cpu)).toBe(0);
    expect(await getXRegister(cpu)).toBe(0);
    expect(await getYRegister(cpu)).toBe(0);
    expect(await getProgramCounter(cpu)).toBe(0);
    expect(await getStackPointer(cpu)).toBe(0xFD);
  });
  
  it("should run a simple program using the interface", async () => {
    const cpu = createCPU();
    
    // Load a simple program:
    // LDA #5
    // ADC #3
    // STA $80
    await cpu.loadByte(0x1000, 0xA9); // LDA immediate
    await cpu.loadByte(0x1001, 0x05); // #5
    await cpu.loadByte(0x1002, 0x69); // ADC immediate
    await cpu.loadByte(0x1003, 0x03); // #3
    await cpu.loadByte(0x1004, 0x85); // STA zero page
    await cpu.loadByte(0x1005, 0x80); // $80
    
    // Initialize CPU
    await cpu.setProgramCounter(0x1000);
    await cpu.setStatusFlag(CARRY); // Set carry for ADC
    
    // Run the program
    await cpu.step(); // LDA #5
    expect(await getAccumulator(cpu)).toBe(5);
    
    await cpu.step(); // ADC #3 (with carry set, so 5 + 3 + 1 = 9)
    expect(await getAccumulator(cpu)).toBe(9);
    
    await cpu.step(); // STA $80
    expect(await cpu.readByte(0x80)).toBe(9);
    expect(await getProgramCounter(cpu)).toBe(0x1006);
  });
});