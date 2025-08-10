import { describe, expect, it } from "bun:test";
import { createCPU } from "./utils";
import { CARRY, ZERO, NEGATIVE } from "../6502";

describe("Absolute Indexed Addressing Instructions", async () => {
  // Test ASL Absolute,X
  it("should test ASL Absolute,X", async () => {
    const cpu = createCPU();
    
    // Setup initial memory and CPU state
    await cpu.setProgramCounter(0);
    await cpu.loadByte(0, 0x1E); // ASL Absolute,X
    await cpu.loadByte(1, 0x00); // Low byte of address (0x1000)
    await cpu.loadByte(2, 0x10); // High byte of address
    await cpu.setXRegister(0x05); // X register = 5, so effective address is 0x1005
    await cpu.loadByte(0x1005, 0x80); // Value to shift (10000000)
    
    // Execute ASL Absolute,X
    await cpu.step();
    
    // After shift: 00000000, carry flag set (bit 7 was 1)
    expect(await cpu.readByte(0x1005)).toBe(0x00);
    expect(((await cpu.getState()).p & CARRY) !== 0).toBe(true);
    expect(((await cpu.getState()).p & ZERO) !== 0).toBe(true);
  });
  
  // Test LSR Absolute,X
  it("should test LSR Absolute,X", async () => {
    const cpu = createCPU();
    
    // Setup initial memory and CPU state
    await cpu.setProgramCounter(0);
    await cpu.loadByte(0, 0x5E); // LSR Absolute,X
    await cpu.loadByte(1, 0x00); // Low byte of address (0x1000)
    await cpu.loadByte(2, 0x10); // High byte of address
    await cpu.setXRegister(0x05); // X register = 5, so effective address is 0x1005
    await cpu.loadByte(0x1005, 0x01); // Value to shift (00000001)
    
    // Execute LSR Absolute,X
    await cpu.step();
    
    // After shift: 00000000, carry flag set (bit 0 was 1)
    expect(await cpu.readByte(0x1005)).toBe(0x00);
    expect(((await cpu.getState()).p & CARRY) !== 0).toBe(true);
    expect(((await cpu.getState()).p & ZERO) !== 0).toBe(true);
  });
  
  // Test ROL Absolute,X
  it("should test ROL Absolute,X", async () => {
    const cpu = createCPU();
    
    // Setup initial memory and CPU state
    await cpu.setProgramCounter(0);
    await cpu.loadByte(0, 0x3E); // ROL Absolute,X
    await cpu.loadByte(1, 0x00); // Low byte of address (0x1000)
    await cpu.loadByte(2, 0x10); // High byte of address
    await cpu.setXRegister(0x05); // X register = 5, so effective address is 0x1005
    await cpu.loadByte(0x1005, 0x80); // Value to rotate (10000000)
    await cpu.setStatusRegister(CARRY); // Set carry flag
    
    // Execute ROL Absolute,X
    await cpu.step();
    
    // After rotate: 00000001, carry flag set (bit 7 was 1)
    expect(await cpu.readByte(0x1005)).toBe(0x01);
    expect(((await cpu.getState()).p & CARRY) !== 0).toBe(true);
    expect(((await cpu.getState()).p & ZERO) !== 0).toBe(false);
  });
  
  // Test ROR Absolute,X
  it("should test ROR Absolute,X", async () => {
    const cpu = createCPU();
    
    // Setup initial memory and CPU state
    await cpu.setProgramCounter(0);
    await cpu.loadByte(0, 0x7E); // ROR Absolute,X
    await cpu.loadByte(1, 0x00); // Low byte of address (0x1000)
    await cpu.loadByte(2, 0x10); // High byte of address
    await cpu.setXRegister(0x05); // X register = 5, so effective address is 0x1005
    await cpu.loadByte(0x1005, 0x01); // Value to rotate (00000001)
    await cpu.setStatusRegister(CARRY); // Set carry flag
    
    // Execute ROR Absolute,X
    await cpu.step();
    
    // After rotate: 10000000, carry flag set (bit 0 was 1)
    expect(await cpu.readByte(0x1005)).toBe(0x80);
    expect(((await cpu.getState()).p & CARRY) !== 0).toBe(true);
    expect(((await cpu.getState()).p & NEGATIVE) !== 0).toBe(true);
  });
  
  // Test INC Absolute,X
  it("should test INC Absolute,X", async () => {
    const cpu = createCPU();
    
    // Setup initial memory and CPU state
    await cpu.setProgramCounter(0);
    await cpu.loadByte(0, 0xFE); // INC Absolute,X
    await cpu.loadByte(1, 0x00); // Low byte of address (0x1000)
    await cpu.loadByte(2, 0x10); // High byte of address
    await cpu.setXRegister(0x05); // X register = 5, so effective address is 0x1005
    await cpu.loadByte(0x1005, 0xFF); // Value to increment (will wrap to 0)
    
    // Execute INC Absolute,X
    await cpu.step();
    
    // After increment: 0x00, zero flag set
    expect(await cpu.readByte(0x1005)).toBe(0x00);
    expect(((await cpu.getState()).p & ZERO) !== 0).toBe(true);
  });
  
  // Test DEC Absolute,X
  it("should test DEC Absolute,X", async () => {
    const cpu = createCPU();
    
    // Setup initial memory and CPU state
    await cpu.setProgramCounter(0);
    await cpu.loadByte(0, 0xDE); // DEC Absolute,X
    await cpu.loadByte(1, 0x00); // Low byte of address (0x1000)
    await cpu.loadByte(2, 0x10); // High byte of address
    await cpu.setXRegister(0x05); // X register = 5, so effective address is 0x1005
    await cpu.loadByte(0x1005, 0x01); // Value to decrement (will be 0)
    
    // Execute DEC Absolute,X
    await cpu.step();
    
    // After decrement: 0x00, zero flag set
    expect(await cpu.readByte(0x1005)).toBe(0x00);
    expect(((await cpu.getState()).p & ZERO) !== 0).toBe(true);
  });

  // Test LDA Absolute,X with page crossing
  it("should test LDA Absolute,X with page crossing", async () => {
    const cpu = createCPU();
    
    // Setup initial memory and CPU state
    await cpu.setProgramCounter(0);
    await cpu.loadByte(0, 0xBD); // LDA Absolute,X
    await cpu.loadByte(1, 0xFF); // Low byte of address (0x01FF)
    await cpu.loadByte(2, 0x01); // High byte of address
    await cpu.setXRegister(0x01); // X register = 1, so effective address is 0x0200 (crosses page boundary)
    await cpu.loadByte(0x0200, 0x42); // Value to load
    
    // Execute LDA Absolute,X
    const cycles = await cpu.step();
    
    // Check cycles (should be 5 due to page crossing)
    expect(cycles).toBe(5);
    
    // Check if A register was loaded with the value
    expect(cpu.getAccumulator()).toBe(0x42);
  });
  
  // Test LDA Absolute,Y with page crossing
  it("should test LDA Absolute,Y with page crossing", async () => {
    const cpu = createCPU();
    
    // Setup initial memory and CPU state
    await cpu.setProgramCounter(0);
    await cpu.loadByte(0, 0xB9); // LDA Absolute,Y
    await cpu.loadByte(1, 0xFF); // Low byte of address (0x01FF)
    await cpu.loadByte(2, 0x01); // High byte of address
    await cpu.setYRegister(0x01); // Y register = 1, so effective address is 0x0200 (crosses page boundary)
    await cpu.loadByte(0x0200, 0x42); // Value to load
    
    // Execute LDA Absolute,Y
    const cycles = await cpu.step();
    
    // Check cycles (should be 5 due to page crossing)
    expect(cycles).toBe(5);
    
    // Check if A register was loaded with the value
    expect(cpu.getAccumulator()).toBe(0x42);
  });
});