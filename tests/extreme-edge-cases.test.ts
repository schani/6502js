import { describe, expect, it } from "bun:test";
import { ZERO, NEGATIVE, CARRY } from "../6502";
import { createCPU } from "./utils";

describe("Extreme edge cases to achieve 100% coverage", () => {
  // Test ASL Zero Page,X with zero input (no carry out, zero result)
  it("should test ASL Zero Page,X with zero input", () => {
    const cpu = createCPU();
    
    cpu.setProgramCounter(0);
    cpu.loadByte(0, 0x16); // ASL Zero Page,X
    cpu.loadByte(1, 0x80); // Zero page address
    cpu.setXRegister(0x01);      // X = 1, so effective address is 0x81
    cpu.loadByte(0x81, 0x00); // Value to shift
    
    cpu.step();
    expect(cpu.readByte(0x81)).toBe(0x00);
    expect((cpu.getState().p & CARRY)).toBe(false); // No carry out
    expect((cpu.getState().p & ZERO) !== 0).toBe(true);   // Zero flag set
  });
  
  // Test ASL Absolute,X with zero input (no carry out, zero result)
  it("should test ASL Absolute,X with zero input", () => {
    const cpu = createCPU();
    
    cpu.setProgramCounter(0);
    cpu.loadByte(0, 0x1E); // ASL Absolute,X
    cpu.loadByte(1, 0x00); // Low byte
    cpu.loadByte(2, 0x10); // High byte
    cpu.setXRegister(0x05);      // X = 5, so effective address is 0x1005
    cpu.loadByte(0x1005, 0x00); // Value to shift
    
    cpu.step();
    expect(cpu.readByte(0x1005)).toBe(0x00);
    expect((cpu.getState().p & CARRY)).toBe(false); // No carry out
    expect((cpu.getState().p & ZERO) !== 0).toBe(true);   // Zero flag set
  });
  
  // Test LSR Zero Page,X with zero input (no carry out, zero result)
  it("should test LSR Zero Page,X with zero input", () => {
    const cpu = createCPU();
    
    cpu.setProgramCounter(0);
    cpu.loadByte(0, 0x56); // LSR Zero Page,X
    cpu.loadByte(1, 0x80); // Zero page address
    cpu.setXRegister(0x01);      // X = 1, so effective address is 0x81
    cpu.loadByte(0x81, 0x00); // Value to shift
    
    cpu.step();
    expect(cpu.readByte(0x81)).toBe(0x00);
    expect((cpu.getState().p & CARRY)).toBe(false); // No carry out
    expect((cpu.getState().p & ZERO) !== 0).toBe(true);   // Zero flag set
  });
  
  // Test LSR Absolute,X with zero input (no carry out, zero result)
  it("should test LSR Absolute,X with zero input", () => {
    const cpu = createCPU();
    
    cpu.setProgramCounter(0);
    cpu.loadByte(0, 0x5E); // LSR Absolute,X
    cpu.loadByte(1, 0x00); // Low byte
    cpu.loadByte(2, 0x10); // High byte
    cpu.setXRegister(0x05);      // X = 5, so effective address is 0x1005
    cpu.loadByte(0x1005, 0x00); // Value to shift
    
    cpu.step();
    expect(cpu.readByte(0x1005)).toBe(0x00);
    expect((cpu.getState().p & CARRY)).toBe(false); // No carry out
    expect((cpu.getState().p & ZERO) !== 0).toBe(true);   // Zero flag set
  });
  
  // Test ROL Zero Page,X with zero input (no carry out, zero/carry result)
  it("should test ROL Zero Page,X with zero input", () => {
    const cpu = createCPU();
    
    // Test with carry clear
    cpu.setProgramCounter(0);
    cpu.loadByte(0, 0x36); // ROL Zero Page,X
    cpu.loadByte(1, 0x80); // Zero page address
    cpu.setXRegister(0x01);      // X = 1, so effective address is 0x81
    cpu.loadByte(0x81, 0x00); // Value to rotate
    cpu.clearStatusFlag(CARRY);  // Clear carry flag
    
    cpu.step();
    expect(cpu.readByte(0x81)).toBe(0x00);
    expect((cpu.getState().p & CARRY)).toBe(false); // No carry out
    expect((cpu.getState().p & ZERO) !== 0).toBe(true);   // Zero flag set
    
    // Test with carry set
    cpu.setProgramCounter(0);
    cpu.loadByte(0, 0x36); // ROL Zero Page,X
    cpu.loadByte(1, 0x80); // Zero page address
    cpu.setXRegister(0x01);      // X = 1, so effective address is 0x81
    cpu.loadByte(0x81, 0x00); // Value to rotate
    cpu.setStatusFlag(CARRY);    // Set carry flag
    
    cpu.step();
    expect(cpu.readByte(0x81)).toBe(0x01);
    expect((cpu.getState().p & CARRY)).toBe(false); // No carry out
    expect((cpu.getState().p & ZERO)).toBe(false);  // Zero flag clear
  });
  
  // Test ROL Absolute,X with various inputs
  it("should test ROL Absolute,X with various inputs", () => {
    const cpu = createCPU();
    
    // Test with carry clear, zero input
    cpu.setProgramCounter(0);
    cpu.loadByte(0, 0x3E); // ROL Absolute,X
    cpu.loadByte(1, 0x00); // Low byte
    cpu.loadByte(2, 0x10); // High byte
    cpu.setXRegister(0x05);      // X = 5, so effective address is 0x1005
    cpu.loadByte(0x1005, 0x00); // Value to rotate
    cpu.clearStatusFlag(CARRY);  // Clear carry flag
    
    cpu.step();
    expect(cpu.readByte(0x1005)).toBe(0x00);
    expect((cpu.getState().p & CARRY)).toBe(false); // No carry out
    expect((cpu.getState().p & ZERO) !== 0).toBe(true);   // Zero flag set
    
    // Test with carry set, zero input
    cpu.setProgramCounter(0);
    cpu.loadByte(0, 0x3E); // ROL Absolute,X
    cpu.loadByte(1, 0x00); // Low byte
    cpu.loadByte(2, 0x10); // High byte
    cpu.setXRegister(0x05);      // X = 5, so effective address is 0x1005
    cpu.loadByte(0x1005, 0x00); // Value to rotate
    cpu.setStatusFlag(CARRY);    // Set carry flag
    
    cpu.step();
    expect(cpu.readByte(0x1005)).toBe(0x01);
    expect((cpu.getState().p & CARRY)).toBe(false); // No carry out
    expect((cpu.getState().p & ZERO)).toBe(false);  // Zero flag clear
  });
  
  // Test ROR Zero Page,X with various inputs
  it("should test ROR Zero Page,X with various inputs", () => {
    const cpu = createCPU();
    
    // Test with carry clear, zero input
    cpu.setProgramCounter(0);
    cpu.loadByte(0, 0x76); // ROR Zero Page,X
    cpu.loadByte(1, 0x80); // Zero page address
    cpu.setXRegister(0x01);      // X = 1, so effective address is 0x81
    cpu.loadByte(0x81, 0x00); // Value to rotate
    cpu.clearStatusFlag(CARRY);  // Clear carry flag
    
    cpu.step();
    expect(cpu.readByte(0x81)).toBe(0x00);
    expect((cpu.getState().p & CARRY)).toBe(false); // No carry out
    expect((cpu.getState().p & ZERO) !== 0).toBe(true);   // Zero flag set
    
    // Test with carry set, zero input
    cpu.setProgramCounter(0);
    cpu.loadByte(0, 0x76); // ROR Zero Page,X
    cpu.loadByte(1, 0x80); // Zero page address
    cpu.setXRegister(0x01);      // X = 1, so effective address is 0x81
    cpu.loadByte(0x81, 0x00); // Value to rotate
    cpu.setStatusFlag(CARRY);    // Set carry flag
    
    cpu.step();
    expect(cpu.readByte(0x81)).toBe(0x80);  // Carry rotated to bit 7
    expect((cpu.getState().p & CARRY)).toBe(false); // No carry out
    expect((cpu.getState().p & NEGATIVE) !== 0).toBe(true); // Negative flag set
  });
  
  // Test ROR Absolute,X with various inputs
  it("should test ROR Absolute,X with various inputs", () => {
    const cpu = createCPU();
    
    // Test with carry clear, zero input
    cpu.setProgramCounter(0);
    cpu.loadByte(0, 0x7E); // ROR Absolute,X
    cpu.loadByte(1, 0x00); // Low byte
    cpu.loadByte(2, 0x10); // High byte
    cpu.setXRegister(0x05);      // X = 5, so effective address is 0x1005
    cpu.loadByte(0x1005, 0x00); // Value to rotate
    cpu.clearStatusFlag(CARRY);  // Clear carry flag
    
    cpu.step();
    expect(cpu.readByte(0x1005)).toBe(0x00);
    expect((cpu.getState().p & CARRY)).toBe(false); // No carry out
    expect((cpu.getState().p & ZERO) !== 0).toBe(true);   // Zero flag set
    
    // Test with carry set, zero input
    cpu.setProgramCounter(0);
    cpu.loadByte(0, 0x7E); // ROR Absolute,X
    cpu.loadByte(1, 0x00); // Low byte
    cpu.loadByte(2, 0x10); // High byte
    cpu.setXRegister(0x05);      // X = 5, so effective address is 0x1005
    cpu.loadByte(0x1005, 0x00); // Value to rotate
    cpu.setStatusFlag(CARRY);    // Set carry flag
    
    cpu.step();
    expect(cpu.readByte(0x1005)).toBe(0x80);  // Carry rotated to bit 7
    expect((cpu.getState().p & CARRY)).toBe(false); // No carry out
    expect((cpu.getState().p & NEGATIVE) !== 0).toBe(true); // Negative flag set
  });
});