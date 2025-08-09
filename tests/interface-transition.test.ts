/**
 * This test file demonstrates transitioning from direct CPU state access
 * to using the CPU interface methods
 */
import { describe, expect, it } from "bun:test";
import { type CPU, createCPU, ZERO, NEGATIVE, CARRY } from "./utils";

describe("CPU Interface Tests", () => {
  it("should demonstrate all interface methods", () => {
    const cpu = createCPU();
    
    // Set registers
    cpu.setAccumulator(0x42);
    cpu.setXRegister(0x84);
    cpu.setYRegister(0x28);
    cpu.setStackPointer(0xF0);
    cpu.setProgramCounter(0x1000);
    
    // Verify registers
    expect(cpu.getAccumulator()).toBe(0x42);
    expect(cpu.getXRegister()).toBe(0x84);
    expect(cpu.getYRegister()).toBe(0x28);
    expect(cpu.getStackPointer()).toBe(0xF0);
    expect(cpu.getProgramCounter()).toBe(0x1000);
    
    // Set status flags
    cpu.setStatusFlag(ZERO | CARRY);
    expect((cpu.getState().p & ZERO) !== 0).toBe(true);
    expect((cpu.getState().p & NEGATIVE) === 0).toBe(false);
    expect((cpu.getState().p & CARRY) !== 0).toBe(true);
    
    // Clear status flags
    cpu.clearStatusFlag(CARRY);
    expect((cpu.getState().p & ZERO) !== 0).toBe(true);
    expect((cpu.getState().p & CARRY) === 0).toBe(false);
    
    // Set full status register
    cpu.setStatusRegister(NEGATIVE);
    expect(cpu.getStatusRegister()).toBe(NEGATIVE);
    expect((cpu.getState().p & NEGATIVE) !== 0).toBe(true);
    expect((cpu.getState().p & ZERO) === 0).toBe(false);
    
    // Memory access
    cpu.loadByte(0x2000, 0xFF);
    expect(cpu.readByte(0x2000)).toBe(0xFF);
    
    cpu.loadWord(0x2100, 0xABCD);
    expect(cpu.readByte(0x2100)).toBe(0xCD); // Low byte
    expect(cpu.readByte(0x2101)).toBe(0xAB); // High byte
    expect(cpu.readWord(0x2100)).toBe(0xABCD);
    
    // Reset and verify defaults
    cpu.reset();
    expect(cpu.getAccumulator()).toBe(0);
    expect(cpu.getXRegister()).toBe(0);
    expect(cpu.getYRegister()).toBe(0);
    expect(cpu.getProgramCounter()).toBe(0);
    expect(cpu.getStackPointer()).toBe(0xFD);
  });
  
  it("should run a simple program using the interface", () => {
    const cpu = createCPU();
    
    // Load a simple program:
    // LDA #5
    // ADC #3
    // STA $80
    cpu.loadByte(0x1000, 0xA9); // LDA immediate
    cpu.loadByte(0x1001, 0x05); // #5
    cpu.loadByte(0x1002, 0x69); // ADC immediate
    cpu.loadByte(0x1003, 0x03); // #3
    cpu.loadByte(0x1004, 0x85); // STA zero page
    cpu.loadByte(0x1005, 0x80); // $80
    
    // Initialize CPU
    cpu.setProgramCounter(0x1000);
    cpu.setStatusFlag(CARRY); // Set carry for ADC
    
    // Run the program
    cpu.step(); // LDA #5
    expect(cpu.getAccumulator()).toBe(5);
    
    cpu.step(); // ADC #3 (with carry set, so 5 + 3 + 1 = 9)
    expect(cpu.getAccumulator()).toBe(9);
    
    cpu.step(); // STA $80
    expect(cpu.readByte(0x80)).toBe(9);
    expect(cpu.getProgramCounter()).toBe(0x1006);
  });
});