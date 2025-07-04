import { describe, expect, it } from "bun:test";
import { type CPU, createCPU, ZERO, NEGATIVE } from "./utils";

describe("INC and DEC with all addressing modes", () => {
  it("should perform INC with Zero Page,X addressing", () => {
    const cpu = createCPU();
    
    // Setup
    cpu.loadByte(0, 0xF6); // INC Zero Page,X
    cpu.loadByte(1, 0x80); // Zero page address
    cpu.loadByte(0x90, 0x41); // Value at 0x80 + 0x10 (with zero page wrap-around)
    
    cpu.setXRegister(0x10); // X offset
    cpu.setProgramCounter(0);
    
    // Execute
    const cycles = cpu.step();
    
    // Verify
    expect(cycles).toBe(6);
    expect(cpu.readByte(0x90)).toBe(0x42); // 0x41 + 1 = 0x42
    expect(cpu.getStatusRegister() & ZERO).toBe(0); // Result is not zero
    expect(cpu.getStatusRegister() & NEGATIVE).toBe(0); // Result is not negative
  });
  
  it("should perform INC with Absolute addressing", () => {
    const cpu = createCPU();
    
    // Setup
    cpu.loadByte(0, 0xEE); // INC Absolute
    cpu.loadByte(1, 0x00); // Low byte of address
    cpu.loadByte(2, 0x20); // High byte of address (0x2000)
    cpu.loadByte(0x2000, 0xFF); // Value at absolute address
    
    cpu.setProgramCounter(0);
    
    // Execute
    const cycles = cpu.step();
    
    // Verify
    expect(cycles).toBe(6);
    expect(cpu.readByte(0x2000)).toBe(0x00); // 0xFF + 1 = 0x00 (wraps around)
    expect(cpu.getStatusRegister() & ZERO).toBe(ZERO); // Result is zero
    expect(cpu.getStatusRegister() & NEGATIVE).toBe(0); // Result is not negative
  });
  
  it("should perform INC with Absolute,X addressing", () => {
    const cpu = createCPU();
    
    // Setup
    cpu.loadByte(0, 0xFE); // INC Absolute,X
    cpu.loadByte(1, 0x00); // Low byte of address
    cpu.loadByte(2, 0x20); // High byte of address (0x2000)
    cpu.loadByte(0x2010, 0x7F); // Value at 0x2000 + 0x10 = 0x2010
    
    cpu.setXRegister(0x10); // X offset
    cpu.setProgramCounter(0);
    
    // Execute
    const cycles = cpu.step();
    
    // Verify
    expect(cycles).toBe(7);
    expect(cpu.readByte(0x2010)).toBe(0x80); // 0x7F + 1 = 0x80
    expect(cpu.getStatusRegister() & ZERO).toBe(0); // Result is not zero
    expect(cpu.getStatusRegister() & NEGATIVE).toBe(NEGATIVE); // Result is negative (bit 7 set)
  });
  
  it("should perform DEC with Zero Page,X addressing", () => {
    const cpu = createCPU();
    
    // Setup
    cpu.loadByte(0, 0xD6); // DEC Zero Page,X
    cpu.loadByte(1, 0x80); // Zero page address
    cpu.loadByte(0x90, 0x42); // Value at 0x80 + 0x10 (with zero page wrap-around)
    
    cpu.setXRegister(0x10); // X offset
    cpu.setProgramCounter(0);
    
    // Execute
    const cycles = cpu.step();
    
    // Verify
    expect(cycles).toBe(6);
    expect(cpu.readByte(0x90)).toBe(0x41); // 0x42 - 1 = 0x41
    expect(cpu.getStatusRegister() & ZERO).toBe(0); // Result is not zero
    expect(cpu.getStatusRegister() & NEGATIVE).toBe(0); // Result is not negative
  });
  
  it("should perform DEC with Absolute addressing", () => {
    const cpu = createCPU();
    
    // Setup
    cpu.loadByte(0, 0xCE); // DEC Absolute
    cpu.loadByte(1, 0x00); // Low byte of address
    cpu.loadByte(2, 0x20); // High byte of address (0x2000)
    cpu.loadByte(0x2000, 0x01); // Value at absolute address
    
    cpu.setProgramCounter(0);
    
    // Execute
    const cycles = cpu.step();
    
    // Verify
    expect(cycles).toBe(6);
    expect(cpu.readByte(0x2000)).toBe(0x00); // 0x01 - 1 = 0x00
    expect(cpu.getStatusRegister() & ZERO).toBe(ZERO); // Result is zero
    expect(cpu.getStatusRegister() & NEGATIVE).toBe(0); // Result is not negative
  });
  
  it("should perform DEC with Absolute,X addressing", () => {
    const cpu = createCPU();
    
    // Setup
    cpu.loadByte(0, 0xDE); // DEC Absolute,X
    cpu.loadByte(1, 0x00); // Low byte of address
    cpu.loadByte(2, 0x20); // High byte of address (0x2000)
    cpu.loadByte(0x2010, 0x00); // Value at 0x2000 + 0x10 = 0x2010
    
    cpu.setXRegister(0x10); // X offset
    cpu.setProgramCounter(0);
    
    // Execute
    const cycles = cpu.step();
    
    // Verify
    expect(cycles).toBe(7);
    expect(cpu.readByte(0x2010)).toBe(0xFF); // 0x00 - 1 = 0xFF (wraps around)
    expect(cpu.getStatusRegister() & ZERO).toBe(0); // Result is not zero
    expect(cpu.getStatusRegister() & NEGATIVE).toBe(NEGATIVE); // Result is negative (bit 7 set)
  });
});