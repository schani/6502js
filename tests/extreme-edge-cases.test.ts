import { describe, expect, it } from "bun:test";
import { ZERO, NEGATIVE, CARRY } from "../6502";
import { createCPU } from "./utils";

describe("Extreme edge cases to achieve 100% coverage", async () => {
  // Test ASL Zero Page,X with zero input (no carry out, zero result)
  it("should test ASL Zero Page,X with zero input", async () => {
    const cpu = createCPU();
    
    await cpu.setProgramCounter(0);
    await cpu.loadByte(0, 0x16); // ASL Zero Page,X
    await cpu.loadByte(1, 0x80); // Zero page address
    await cpu.setXRegister(0x01);      // X = 1, so effective address is 0x81
    await cpu.loadByte(0x81, 0x00); // Value to shift
    
    await cpu.step();
    expect(await cpu.readByte(0x81)).toBe(0x00);
    expect((((await cpu.getState()).p & CARRY) !== 0)).toBe(false); // No carry out
    expect(((await cpu.getState()).p & ZERO) !== 0).toBe(true);   // Zero flag set
  });
  
  // Test ASL Absolute,X with zero input (no carry out, zero result)
  it("should test ASL Absolute,X with zero input", async () => {
    const cpu = createCPU();
    
    await cpu.setProgramCounter(0);
    await cpu.loadByte(0, 0x1E); // ASL Absolute,X
    await cpu.loadByte(1, 0x00); // Low byte
    await cpu.loadByte(2, 0x10); // High byte
    await cpu.setXRegister(0x05);      // X = 5, so effective address is 0x1005
    await cpu.loadByte(0x1005, 0x00); // Value to shift
    
    await cpu.step();
    expect(await cpu.readByte(0x1005)).toBe(0x00);
    expect((((await cpu.getState()).p & CARRY) !== 0)).toBe(false); // No carry out
    expect(((await cpu.getState()).p & ZERO) !== 0).toBe(true);   // Zero flag set
  });
  
  // Test LSR Zero Page,X with zero input (no carry out, zero result)
  it("should test LSR Zero Page,X with zero input", async () => {
    const cpu = createCPU();
    
    await cpu.setProgramCounter(0);
    await cpu.loadByte(0, 0x56); // LSR Zero Page,X
    await cpu.loadByte(1, 0x80); // Zero page address
    await cpu.setXRegister(0x01);      // X = 1, so effective address is 0x81
    await cpu.loadByte(0x81, 0x00); // Value to shift
    
    await cpu.step();
    expect(await cpu.readByte(0x81)).toBe(0x00);
    expect((((await cpu.getState()).p & CARRY) !== 0)).toBe(false); // No carry out
    expect(((await cpu.getState()).p & ZERO) !== 0).toBe(true);   // Zero flag set
  });
  
  // Test LSR Absolute,X with zero input (no carry out, zero result)
  it("should test LSR Absolute,X with zero input", async () => {
    const cpu = createCPU();
    
    await cpu.setProgramCounter(0);
    await cpu.loadByte(0, 0x5E); // LSR Absolute,X
    await cpu.loadByte(1, 0x00); // Low byte
    await cpu.loadByte(2, 0x10); // High byte
    await cpu.setXRegister(0x05);      // X = 5, so effective address is 0x1005
    await cpu.loadByte(0x1005, 0x00); // Value to shift
    
    await cpu.step();
    expect(await cpu.readByte(0x1005)).toBe(0x00);
    expect((((await cpu.getState()).p & CARRY) !== 0)).toBe(false); // No carry out
    expect(((await cpu.getState()).p & ZERO) !== 0).toBe(true);   // Zero flag set
  });
  
  // Test ROL Zero Page,X with zero input (no carry out, zero/carry result)
  it("should test ROL Zero Page,X with zero input", async () => {
    const cpu = createCPU();
    
    // Test with carry clear
    await cpu.setProgramCounter(0);
    await cpu.loadByte(0, 0x36); // ROL Zero Page,X
    await cpu.loadByte(1, 0x80); // Zero page address
    await cpu.setXRegister(0x01);      // X = 1, so effective address is 0x81
    await cpu.loadByte(0x81, 0x00); // Value to rotate
    await cpu.clearStatusFlag(CARRY);  // Clear carry flag
    
    await cpu.step();
    expect(await cpu.readByte(0x81)).toBe(0x00);
    expect((((await cpu.getState()).p & CARRY) !== 0)).toBe(false); // No carry out
    expect(((await cpu.getState()).p & ZERO) !== 0).toBe(true);   // Zero flag set
    
    // Test with carry set
    await cpu.setProgramCounter(0);
    await cpu.loadByte(0, 0x36); // ROL Zero Page,X
    await cpu.loadByte(1, 0x80); // Zero page address
    await cpu.setXRegister(0x01);      // X = 1, so effective address is 0x81
    await cpu.loadByte(0x81, 0x00); // Value to rotate
    await cpu.setStatusFlag(CARRY);    // Set carry flag
    
    await cpu.step();
    expect(await cpu.readByte(0x81)).toBe(0x01);
    expect((((await cpu.getState()).p & CARRY) !== 0)).toBe(false); // No carry out
    expect((((await cpu.getState()).p & ZERO) !== 0)).toBe(false);  // Zero flag clear
  });
  
  // Test ROL Absolute,X with various inputs
  it("should test ROL Absolute,X with various inputs", async () => {
    const cpu = createCPU();
    
    // Test with carry clear, zero input
    await cpu.setProgramCounter(0);
    await cpu.loadByte(0, 0x3E); // ROL Absolute,X
    await cpu.loadByte(1, 0x00); // Low byte
    await cpu.loadByte(2, 0x10); // High byte
    await cpu.setXRegister(0x05);      // X = 5, so effective address is 0x1005
    await cpu.loadByte(0x1005, 0x00); // Value to rotate
    await cpu.clearStatusFlag(CARRY);  // Clear carry flag
    
    await cpu.step();
    expect(await cpu.readByte(0x1005)).toBe(0x00);
    expect((((await cpu.getState()).p & CARRY) !== 0)).toBe(false); // No carry out
    expect(((await cpu.getState()).p & ZERO) !== 0).toBe(true);   // Zero flag set
    
    // Test with carry set, zero input
    await cpu.setProgramCounter(0);
    await cpu.loadByte(0, 0x3E); // ROL Absolute,X
    await cpu.loadByte(1, 0x00); // Low byte
    await cpu.loadByte(2, 0x10); // High byte
    await cpu.setXRegister(0x05);      // X = 5, so effective address is 0x1005
    await cpu.loadByte(0x1005, 0x00); // Value to rotate
    await cpu.setStatusFlag(CARRY);    // Set carry flag
    
    await cpu.step();
    expect(await cpu.readByte(0x1005)).toBe(0x01);
    expect((((await cpu.getState()).p & CARRY) !== 0)).toBe(false); // No carry out
    expect((((await cpu.getState()).p & ZERO) !== 0)).toBe(false);  // Zero flag clear
  });
  
  // Test ROR Zero Page,X with various inputs
  it("should test ROR Zero Page,X with various inputs", async () => {
    const cpu = createCPU();
    
    // Test with carry clear, zero input
    await cpu.setProgramCounter(0);
    await cpu.loadByte(0, 0x76); // ROR Zero Page,X
    await cpu.loadByte(1, 0x80); // Zero page address
    await cpu.setXRegister(0x01);      // X = 1, so effective address is 0x81
    await cpu.loadByte(0x81, 0x00); // Value to rotate
    await cpu.clearStatusFlag(CARRY);  // Clear carry flag
    
    await cpu.step();
    expect(await cpu.readByte(0x81)).toBe(0x00);
    expect((((await cpu.getState()).p & CARRY) !== 0)).toBe(false); // No carry out
    expect(((await cpu.getState()).p & ZERO) !== 0).toBe(true);   // Zero flag set
    
    // Test with carry set, zero input
    await cpu.setProgramCounter(0);
    await cpu.loadByte(0, 0x76); // ROR Zero Page,X
    await cpu.loadByte(1, 0x80); // Zero page address
    await cpu.setXRegister(0x01);      // X = 1, so effective address is 0x81
    await cpu.loadByte(0x81, 0x00); // Value to rotate
    await cpu.setStatusFlag(CARRY);    // Set carry flag
    
    await cpu.step();
    expect(await cpu.readByte(0x81)).toBe(0x80);  // Carry rotated to bit 7
    expect((((await cpu.getState()).p & CARRY) !== 0)).toBe(false); // No carry out
    expect(((await cpu.getState()).p & NEGATIVE) !== 0).toBe(true); // Negative flag set
  });
  
  // Test ROR Absolute,X with various inputs
  it("should test ROR Absolute,X with various inputs", async () => {
    const cpu = createCPU();
    
    // Test with carry clear, zero input
    await cpu.setProgramCounter(0);
    await cpu.loadByte(0, 0x7E); // ROR Absolute,X
    await cpu.loadByte(1, 0x00); // Low byte
    await cpu.loadByte(2, 0x10); // High byte
    await cpu.setXRegister(0x05);      // X = 5, so effective address is 0x1005
    await cpu.loadByte(0x1005, 0x00); // Value to rotate
    await cpu.clearStatusFlag(CARRY);  // Clear carry flag
    
    await cpu.step();
    expect(await cpu.readByte(0x1005)).toBe(0x00);
    expect((((await cpu.getState()).p & CARRY) !== 0)).toBe(false); // No carry out
    expect(((await cpu.getState()).p & ZERO) !== 0).toBe(true);   // Zero flag set
    
    // Test with carry set, zero input
    await cpu.setProgramCounter(0);
    await cpu.loadByte(0, 0x7E); // ROR Absolute,X
    await cpu.loadByte(1, 0x00); // Low byte
    await cpu.loadByte(2, 0x10); // High byte
    await cpu.setXRegister(0x05);      // X = 5, so effective address is 0x1005
    await cpu.loadByte(0x1005, 0x00); // Value to rotate
    await cpu.setStatusFlag(CARRY);    // Set carry flag
    
    await cpu.step();
    expect(await cpu.readByte(0x1005)).toBe(0x80);  // Carry rotated to bit 7
    expect((((await cpu.getState()).p & CARRY) !== 0)).toBe(false); // No carry out
    expect(((await cpu.getState()).p & NEGATIVE) !== 0).toBe(true); // Negative flag set
  });
});