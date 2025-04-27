import { describe, expect, it } from "bun:test";
import { createCPU } from "./utils";
import { CARRY, ZERO, NEGATIVE } from "../6502";

describe("Absolute Indexed Addressing Instructions", () => {
  // Test ASL Absolute,X
  it("should test ASL Absolute,X", () => {
    const cpu = createCPU();
    
    // Setup initial memory and CPU state
    cpu.setProgramCounter(0);
    cpu.loadByte(0, 0x1E); // ASL Absolute,X
    cpu.loadByte(1, 0x00); // Low byte of address (0x1000)
    cpu.loadByte(2, 0x10); // High byte of address
    cpu.setXRegister(0x05); // X register = 5, so effective address is 0x1005
    cpu.loadByte(0x1005, 0x80); // Value to shift (10000000)
    
    // Execute ASL Absolute,X
    cpu.step();
    
    // After shift: 00000000, carry flag set (bit 7 was 1)
    expect(cpu.readByte(0x1005)).toBe(0x00);
    expect(cpu.isStatusFlagSet(CARRY)).toBe(true);
    expect(cpu.isStatusFlagSet(ZERO)).toBe(true);
  });
  
  // Test LSR Absolute,X
  it("should test LSR Absolute,X", () => {
    const cpu = createCPU();
    
    // Setup initial memory and CPU state
    cpu.setProgramCounter(0);
    cpu.loadByte(0, 0x5E); // LSR Absolute,X
    cpu.loadByte(1, 0x00); // Low byte of address (0x1000)
    cpu.loadByte(2, 0x10); // High byte of address
    cpu.setXRegister(0x05); // X register = 5, so effective address is 0x1005
    cpu.loadByte(0x1005, 0x01); // Value to shift (00000001)
    
    // Execute LSR Absolute,X
    cpu.step();
    
    // After shift: 00000000, carry flag set (bit 0 was 1)
    expect(cpu.readByte(0x1005)).toBe(0x00);
    expect(cpu.isStatusFlagSet(CARRY)).toBe(true);
    expect(cpu.isStatusFlagSet(ZERO)).toBe(true);
  });
  
  // Test ROL Absolute,X
  it("should test ROL Absolute,X", () => {
    const cpu = createCPU();
    
    // Setup initial memory and CPU state
    cpu.setProgramCounter(0);
    cpu.loadByte(0, 0x3E); // ROL Absolute,X
    cpu.loadByte(1, 0x00); // Low byte of address (0x1000)
    cpu.loadByte(2, 0x10); // High byte of address
    cpu.setXRegister(0x05); // X register = 5, so effective address is 0x1005
    cpu.loadByte(0x1005, 0x80); // Value to rotate (10000000)
    cpu.setStatusRegister(CARRY); // Set carry flag
    
    // Execute ROL Absolute,X
    cpu.step();
    
    // After rotate: 00000001, carry flag set (bit 7 was 1)
    expect(cpu.readByte(0x1005)).toBe(0x01);
    expect(cpu.isStatusFlagSet(CARRY)).toBe(true);
    expect(cpu.isStatusFlagSet(ZERO)).toBe(false);
  });
  
  // Test ROR Absolute,X
  it("should test ROR Absolute,X", () => {
    const cpu = createCPU();
    
    // Setup initial memory and CPU state
    cpu.setProgramCounter(0);
    cpu.loadByte(0, 0x7E); // ROR Absolute,X
    cpu.loadByte(1, 0x00); // Low byte of address (0x1000)
    cpu.loadByte(2, 0x10); // High byte of address
    cpu.setXRegister(0x05); // X register = 5, so effective address is 0x1005
    cpu.loadByte(0x1005, 0x01); // Value to rotate (00000001)
    cpu.setStatusRegister(CARRY); // Set carry flag
    
    // Execute ROR Absolute,X
    cpu.step();
    
    // After rotate: 10000000, carry flag set (bit 0 was 1)
    expect(cpu.readByte(0x1005)).toBe(0x80);
    expect(cpu.isStatusFlagSet(CARRY)).toBe(true);
    expect(cpu.isStatusFlagSet(NEGATIVE)).toBe(true);
  });
  
  // Test INC Absolute,X
  it("should test INC Absolute,X", () => {
    const cpu = createCPU();
    
    // Setup initial memory and CPU state
    cpu.setProgramCounter(0);
    cpu.loadByte(0, 0xFE); // INC Absolute,X
    cpu.loadByte(1, 0x00); // Low byte of address (0x1000)
    cpu.loadByte(2, 0x10); // High byte of address
    cpu.setXRegister(0x05); // X register = 5, so effective address is 0x1005
    cpu.loadByte(0x1005, 0xFF); // Value to increment (will wrap to 0)
    
    // Execute INC Absolute,X
    cpu.step();
    
    // After increment: 0x00, zero flag set
    expect(cpu.readByte(0x1005)).toBe(0x00);
    expect(cpu.isStatusFlagSet(ZERO)).toBe(true);
  });
  
  // Test DEC Absolute,X
  it("should test DEC Absolute,X", () => {
    const cpu = createCPU();
    
    // Setup initial memory and CPU state
    cpu.setProgramCounter(0);
    cpu.loadByte(0, 0xDE); // DEC Absolute,X
    cpu.loadByte(1, 0x00); // Low byte of address (0x1000)
    cpu.loadByte(2, 0x10); // High byte of address
    cpu.setXRegister(0x05); // X register = 5, so effective address is 0x1005
    cpu.loadByte(0x1005, 0x01); // Value to decrement (will be 0)
    
    // Execute DEC Absolute,X
    cpu.step();
    
    // After decrement: 0x00, zero flag set
    expect(cpu.readByte(0x1005)).toBe(0x00);
    expect(cpu.isStatusFlagSet(ZERO)).toBe(true);
  });

  // Test LDA Absolute,X with page crossing
  it("should test LDA Absolute,X with page crossing", () => {
    const cpu = createCPU();
    
    // Setup initial memory and CPU state
    cpu.setProgramCounter(0);
    cpu.loadByte(0, 0xBD); // LDA Absolute,X
    cpu.loadByte(1, 0xFF); // Low byte of address (0x01FF)
    cpu.loadByte(2, 0x01); // High byte of address
    cpu.setXRegister(0x01); // X register = 1, so effective address is 0x0200 (crosses page boundary)
    cpu.loadByte(0x0200, 0x42); // Value to load
    
    // Execute LDA Absolute,X
    const cycles = cpu.step();
    
    // Check cycles (should be 5 due to page crossing)
    expect(cycles).toBe(5);
    
    // Check if A register was loaded with the value
    expect(cpu.getAccumulator()).toBe(0x42);
  });
  
  // Test LDA Absolute,Y with page crossing
  it("should test LDA Absolute,Y with page crossing", () => {
    const cpu = createCPU();
    
    // Setup initial memory and CPU state
    cpu.setProgramCounter(0);
    cpu.loadByte(0, 0xB9); // LDA Absolute,Y
    cpu.loadByte(1, 0xFF); // Low byte of address (0x01FF)
    cpu.loadByte(2, 0x01); // High byte of address
    cpu.setYRegister(0x01); // Y register = 1, so effective address is 0x0200 (crosses page boundary)
    cpu.loadByte(0x0200, 0x42); // Value to load
    
    // Execute LDA Absolute,Y
    const cycles = cpu.step();
    
    // Check cycles (should be 5 due to page crossing)
    expect(cycles).toBe(5);
    
    // Check if A register was loaded with the value
    expect(cpu.getAccumulator()).toBe(0x42);
  });
});