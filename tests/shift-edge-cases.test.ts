import { describe, expect, it } from "bun:test";
import { ZERO, NEGATIVE, CARRY } from "../6502";
import { createCPU } from "./utils";

// This test targets specific edge cases for shift and rotate operations
describe("Shift and rotate edge cases for 100% coverage", () => {
  // Test ASL with edge cases
  it("should test ASL Zero Page with edge cases", () => {
    const cpu = createCPU();
    
    // Test ASL Zero Page with zero value (no carry, result zero)
    cpu.setProgramCounter(0);
    cpu.loadByte(0, 0x06); // ASL Zero Page
    cpu.loadByte(1, 0x80); // Zero page address
    cpu.loadByte(0x80, 0x00); // Value to shift
    
    cpu.step();
    expect(cpu.readByte(0x80)).toBe(0x00);
    expect(cpu.isStatusFlagSet(CARRY)).toBe(false); // Carry should be clear
    expect(cpu.isStatusFlagSet(ZERO)).toBe(true);   // Zero flag should be set
    
    // Test ASL Zero Page with 0x80 value (sets carry, result zero)
    cpu.setProgramCounter(0);
    cpu.loadByte(0, 0x06); // ASL Zero Page
    cpu.loadByte(1, 0x80); // Zero page address
    cpu.loadByte(0x80, 0x80); // Value to shift
    
    cpu.step();
    expect(cpu.readByte(0x80)).toBe(0x00);
    expect(cpu.isStatusFlagSet(CARRY)).toBe(true); // Carry should be set
    expect(cpu.isStatusFlagSet(ZERO)).toBe(true);  // Zero flag should be set
  });
  
  // Test ASL with edge cases - Absolute
  it("should test ASL Absolute with edge cases", () => {
    const cpu = createCPU();
    
    // Test ASL Absolute with 0x80 value (sets carry, result zero)
    cpu.setProgramCounter(0);
    cpu.loadByte(0, 0x0E); // ASL Absolute
    cpu.loadByte(1, 0x00); // Low byte of address
    cpu.loadByte(2, 0x10); // High byte of address
    cpu.loadByte(0x1000, 0x80); // Value to shift
    
    cpu.step();
    expect(cpu.readByte(0x1000)).toBe(0x00);
    expect(cpu.isStatusFlagSet(CARRY)).toBe(true); // Carry should be set
    expect(cpu.isStatusFlagSet(ZERO)).toBe(true);  // Zero flag should be set
  });
  
  // Test ASL with edge cases - Absolute,X
  it("should test ASL Absolute,X with edge cases", () => {
    const cpu = createCPU();
    
    // Test ASL Absolute,X with 0x80 value (sets carry, result zero)
    cpu.setProgramCounter(0);
    cpu.loadByte(0, 0x1E); // ASL Absolute,X
    cpu.loadByte(1, 0x00); // Low byte of address
    cpu.loadByte(2, 0x10); // High byte of address
    cpu.setXRegister(0x05);      // X register = 5
    cpu.loadByte(0x1005, 0x80); // Value to shift
    
    cpu.step();
    expect(cpu.readByte(0x1005)).toBe(0x00);
    expect(cpu.isStatusFlagSet(CARRY)).toBe(true); // Carry should be set
    expect(cpu.isStatusFlagSet(ZERO)).toBe(true);  // Zero flag should be set
  });
  
  // Test LSR with edge cases - Zero Page
  it("should test LSR Zero Page with edge cases", () => {
    const cpu = createCPU();
    
    // Test LSR Zero Page with 0x01 value (sets carry, result zero)
    cpu.setProgramCounter(0);
    cpu.loadByte(0, 0x46); // LSR Zero Page
    cpu.loadByte(1, 0x80); // Zero page address
    cpu.loadByte(0x80, 0x01); // Value to shift
    
    cpu.step();
    expect(cpu.readByte(0x80)).toBe(0x00);
    expect(cpu.isStatusFlagSet(CARRY)).toBe(true); // Carry should be set
    expect(cpu.isStatusFlagSet(ZERO)).toBe(true);  // Zero flag should be set
  });
  
  // Test LSR with edge cases - Absolute
  it("should test LSR Absolute with edge cases", () => {
    const cpu = createCPU();
    
    // Test LSR Absolute with 0x01 value (sets carry, result zero)
    cpu.setProgramCounter(0);
    cpu.loadByte(0, 0x4E); // LSR Absolute
    cpu.loadByte(1, 0x00); // Low byte of address
    cpu.loadByte(2, 0x10); // High byte of address
    cpu.loadByte(0x1000, 0x01); // Value to shift
    
    cpu.step();
    expect(cpu.readByte(0x1000)).toBe(0x00);
    expect(cpu.isStatusFlagSet(CARRY)).toBe(true); // Carry should be set
    expect(cpu.isStatusFlagSet(ZERO)).toBe(true);  // Zero flag should be set
  });
  
  // Test ROL with edge cases - Zero Page
  it("should test ROL Zero Page with edge cases", () => {
    const cpu = createCPU();
    
    // Test ROL Zero Page with zero value and carry set
    cpu.setProgramCounter(0);
    cpu.loadByte(0, 0x26); // ROL Zero Page
    cpu.loadByte(1, 0x80); // Zero page address
    cpu.loadByte(0x80, 0x00); // Value to rotate
    cpu.setStatusFlag(CARRY);     // Set carry flag
    
    cpu.step();
    expect(cpu.readByte(0x80)).toBe(0x01); // Rotated carry in
    expect(cpu.isStatusFlagSet(CARRY)).toBe(false); // No carry out
    expect(cpu.isStatusFlagSet(ZERO)).toBe(false);  // Not zero
    
    // Test ROL Zero Page with 0x80 value and carry set
    cpu.setProgramCounter(0);
    cpu.loadByte(0, 0x26); // ROL Zero Page
    cpu.loadByte(1, 0x80); // Zero page address
    cpu.loadByte(0x80, 0x80); // Value to rotate
    cpu.setStatusFlag(CARRY);     // Set carry flag
    
    cpu.step();
    expect(cpu.readByte(0x80)).toBe(0x01); // Rotated with carry set
    expect(cpu.isStatusFlagSet(CARRY)).toBe(true);  // Carry should be set from bit 7
    expect(cpu.isStatusFlagSet(ZERO)).toBe(false);  // Not zero
  });
  
  // Test ROR with edge cases - Zero Page
  it("should test ROR Zero Page with edge cases", () => {
    const cpu = createCPU();
    
    // Test ROR Zero Page with zero value and carry set
    cpu.setProgramCounter(0);
    cpu.loadByte(0, 0x66); // ROR Zero Page
    cpu.loadByte(1, 0x80); // Zero page address
    cpu.loadByte(0x80, 0x00); // Value to rotate
    cpu.setStatusFlag(CARRY);     // Set carry flag
    
    cpu.step();
    expect(cpu.readByte(0x80)).toBe(0x80); // Rotated carry to bit 7
    expect(cpu.isStatusFlagSet(CARRY)).toBe(false);     // No carry out
    expect(cpu.isStatusFlagSet(NEGATIVE)).toBe(true);   // Negative flag set
    
    // Test ROR Zero Page with 0x01 value and carry set
    cpu.setProgramCounter(0);
    cpu.loadByte(0, 0x66); // ROR Zero Page
    cpu.loadByte(1, 0x80); // Zero page address
    cpu.loadByte(0x80, 0x01); // Value to rotate
    cpu.setStatusFlag(CARRY);     // Set carry flag
    
    cpu.step();
    expect(cpu.readByte(0x80)).toBe(0x80); // Rotated with carry in
    expect(cpu.isStatusFlagSet(CARRY)).toBe(true);      // Carry should be set from bit 0
    expect(cpu.isStatusFlagSet(NEGATIVE)).toBe(true);   // Negative flag set
  });
});