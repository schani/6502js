import { describe, expect, it } from "bun:test";
import { createCPU, ZERO, NEGATIVE, OVERFLOW } from "./utils";

describe("Logical operations", () => {
  it("should perform AND immediate instruction", () => {
    const cpu = createCPU();
    
    // Set up CPU state
    cpu.setAccumulator(0xF0);
    
    // Set up memory
    cpu.loadByte(0, 0x29); // AND immediate
    cpu.loadByte(1, 0x0F); // Value to AND with accumulator
    
    const cycles = cpu.step();
    
    expect(cpu.getAccumulator()).toBe(0x00); // 0xF0 & 0x0F = 0x00
    expect(cpu.getProgramCounter()).toBe(2);
    expect(cycles).toBe(2);
    expect(cpu.getStatusRegister() & ZERO).toBe(ZERO); // Zero flag should be set
  });
  
  it("should perform AND zero page instruction", () => {
    const cpu = createCPU();
    
    // Set up CPU state
    cpu.setAccumulator(0xF0);
    
    // Set up memory
    cpu.loadByte(0, 0x25); // AND zero page
    cpu.loadByte(1, 0x42); // Zero page address
    cpu.loadByte(0x42, 0x0F); // Value to AND with accumulator
    
    const cycles = cpu.step();
    
    expect(cpu.getAccumulator()).toBe(0x00); // 0xF0 & 0x0F = 0x00
    expect(cpu.getProgramCounter()).toBe(2);
    expect(cycles).toBe(3);
    expect(cpu.getStatusRegister() & ZERO).toBe(ZERO); // Zero flag should be set
  });

  it("should perform AND zero page,X instruction", () => {
    const cpu = createCPU();
    
    // Set up CPU state
    cpu.setAccumulator(0xF0);
    cpu.setXRegister(0x05);
    
    // Set up memory
    cpu.loadByte(0, 0x35); // AND zero page,X
    cpu.loadByte(1, 0x42); // Zero page address
    cpu.loadByte(0x47, 0x0F); // Value at (zero page address + X)
    
    const cycles = cpu.step();
    
    expect(cpu.getAccumulator()).toBe(0x00); // 0xF0 & 0x0F = 0x00
    expect(cpu.getProgramCounter()).toBe(2);
    expect(cycles).toBe(4);
    expect(cpu.getStatusRegister() & ZERO).toBe(ZERO); // Zero flag should be set
  });

  it("should perform AND absolute instruction", () => {
    const cpu = createCPU();
    
    // Set up CPU state
    cpu.setAccumulator(0xF0);
    
    // Set up memory
    cpu.loadByte(0, 0x2D); // AND absolute
    cpu.loadByte(1, 0x34); // Low byte of address
    cpu.loadByte(2, 0x12); // High byte of address
    cpu.loadByte(0x1234, 0x0F); // Value at absolute address
    
    const cycles = cpu.step();
    
    expect(cpu.getAccumulator()).toBe(0x00); // 0xF0 & 0x0F = 0x00
    expect(cpu.getProgramCounter()).toBe(3);
    expect(cycles).toBe(4);
    expect(cpu.getStatusRegister() & ZERO).toBe(ZERO); // Zero flag should be set
  });
  
  it("should perform ORA immediate instruction", () => {
    const cpu = createCPU();
    
    // Set up CPU state
    cpu.setAccumulator(0xF0);
    
    // Set up memory
    cpu.loadByte(0, 0x09); // ORA immediate
    cpu.loadByte(1, 0x0F); // Value to OR with accumulator
    
    const cycles = cpu.step();
    
    expect(cpu.getAccumulator()).toBe(0xFF); // 0xF0 | 0x0F = 0xFF
    expect(cpu.getProgramCounter()).toBe(2);
    expect(cycles).toBe(2);
    expect(cpu.getStatusRegister() & NEGATIVE).toBe(NEGATIVE); // Negative flag should be set
  });
  
  it("should perform ORA zero page instruction", () => {
    const cpu = createCPU();
    
    // Set up CPU state
    cpu.setAccumulator(0xF0);
    
    // Set up memory
    cpu.loadByte(0, 0x05); // ORA zero page
    cpu.loadByte(1, 0x42); // Zero page address
    cpu.loadByte(0x42, 0x0F); // Value to OR with accumulator
    
    const cycles = cpu.step();
    
    expect(cpu.getAccumulator()).toBe(0xFF); // 0xF0 | 0x0F = 0xFF
    expect(cpu.getProgramCounter()).toBe(2);
    expect(cycles).toBe(3);
    expect(cpu.getStatusRegister() & NEGATIVE).toBe(NEGATIVE); // Negative flag should be set
  });
  
  it("should perform ORA absolute instruction", () => {
    const cpu = createCPU();
    
    // Set up CPU state
    cpu.setAccumulator(0xF0);
    
    // Set up memory
    cpu.loadByte(0, 0x0D); // ORA absolute
    cpu.loadByte(1, 0x34); // Low byte of address
    cpu.loadByte(2, 0x12); // High byte of address
    cpu.loadByte(0x1234, 0x0F); // Value at absolute address
    
    const cycles = cpu.step();
    
    expect(cpu.getAccumulator()).toBe(0xFF); // 0xF0 | 0x0F = 0xFF
    expect(cpu.getProgramCounter()).toBe(3);
    expect(cycles).toBe(4);
    expect(cpu.getStatusRegister() & NEGATIVE).toBe(NEGATIVE); // Negative flag should be set
  });
  
  it("should perform EOR immediate instruction", () => {
    const cpu = createCPU();
    
    // Set up CPU state
    cpu.setAccumulator(0xFF);
    
    // Set up memory
    cpu.loadByte(0, 0x49); // EOR immediate
    cpu.loadByte(1, 0xF0); // Value to XOR with accumulator
    
    const cycles = cpu.step();
    
    expect(cpu.getAccumulator()).toBe(0x0F); // 0xFF ^ 0xF0 = 0x0F
    expect(cpu.getProgramCounter()).toBe(2);
    expect(cycles).toBe(2);
  });
  
  it("should perform EOR zero page instruction", () => {
    const cpu = createCPU();
    
    // Set up CPU state
    cpu.setAccumulator(0xFF);
    
    // Set up memory
    cpu.loadByte(0, 0x45); // EOR zero page
    cpu.loadByte(1, 0x42); // Zero page address
    cpu.loadByte(0x42, 0xF0); // Value to XOR with accumulator
    
    const cycles = cpu.step();
    
    expect(cpu.getAccumulator()).toBe(0x0F); // 0xFF ^ 0xF0 = 0x0F
    expect(cpu.getProgramCounter()).toBe(2);
    expect(cycles).toBe(3);
  });
  
  it("should perform EOR absolute instruction", () => {
    const cpu = createCPU();
    
    // Set up CPU state
    cpu.setAccumulator(0xFF);
    
    // Set up memory
    cpu.loadByte(0, 0x4D); // EOR absolute
    cpu.loadByte(1, 0x34); // Low byte of address
    cpu.loadByte(2, 0x12); // High byte of address
    cpu.loadByte(0x1234, 0xF0); // Value at absolute address
    
    const cycles = cpu.step();
    
    expect(cpu.getAccumulator()).toBe(0x0F); // 0xFF ^ 0xF0 = 0x0F
    expect(cpu.getProgramCounter()).toBe(3);
    expect(cycles).toBe(4);
  });
  
  it("should perform BIT zero page instruction", () => {
    const cpu = createCPU();
    
    // Set up CPU state
    cpu.setAccumulator(0x0F);
    cpu.setStatusRegister(0); // Clear all flags
    
    // Set up memory
    cpu.loadByte(0, 0x24); // BIT zero page
    cpu.loadByte(1, 0x20); // Zero page address
    cpu.loadByte(0x20, 0xC0); // Test value (bits 7 and 6 are set)
    
    const cycles = cpu.step();
    
    // BIT sets N and V from bits 7 and 6 of memory
    expect(cpu.getStatusRegister() & NEGATIVE).toBe(NEGATIVE); // Bit 7 of memory -> N flag
    expect(cpu.getStatusRegister() & OVERFLOW).toBe(OVERFLOW); // Bit 6 of memory -> V flag
    
    // BIT sets Z based on AND result
    expect(cpu.getStatusRegister() & ZERO).toBe(ZERO); // 0x0F & 0xC0 = 0, so Z flag is set
    
    // Accumulator should not be modified
    expect(cpu.getAccumulator()).toBe(0x0F);
    expect(cpu.getProgramCounter()).toBe(2);
    expect(cycles).toBe(3);
  });
  
  it("should perform BIT absolute instruction", () => {
    const cpu = createCPU();
    
    // Set up CPU state
    cpu.setAccumulator(0x0F);
    cpu.setStatusRegister(0); // Clear all flags
    
    // Set up memory
    cpu.loadByte(0, 0x2C); // BIT absolute
    cpu.loadByte(1, 0x34); // Low byte of address
    cpu.loadByte(2, 0x12); // High byte of address
    cpu.loadByte(0x1234, 0xC0); // Test value (bits 7 and 6 are set)
    
    const cycles = cpu.step();
    
    // BIT sets N and V from bits 7 and 6 of memory
    expect(cpu.getStatusRegister() & NEGATIVE).toBe(NEGATIVE); // Bit 7 of memory -> N flag
    expect(cpu.getStatusRegister() & OVERFLOW).toBe(OVERFLOW); // Bit 6 of memory -> V flag
    
    // BIT sets Z based on AND result
    expect(cpu.getStatusRegister() & ZERO).toBe(ZERO); // 0x0F & 0xC0 = 0, so Z flag is set
    
    // Accumulator should not be modified
    expect(cpu.getAccumulator()).toBe(0x0F);
    expect(cpu.getProgramCounter()).toBe(3);
    expect(cycles).toBe(4);
  });
  
  it("should correctly handle BIT with matching bits", () => {
    const cpu = createCPU();
    
    // Set up CPU state
    cpu.setAccumulator(0xC0); // Matches the test value
    cpu.setStatusRegister(0); // Clear all flags
    
    // Set up memory
    cpu.loadByte(0, 0x24); // BIT zero page
    cpu.loadByte(1, 0x20); // Zero page address
    cpu.loadByte(0x20, 0xC0); // Test value (bits 7 and 6 are set)
    
    const cycles = cpu.step();
    
    // BIT sets N and V from bits 7 and 6 of memory
    expect(cpu.getStatusRegister() & NEGATIVE).toBe(NEGATIVE); // Bit 7 of memory -> N flag
    expect(cpu.getStatusRegister() & OVERFLOW).toBe(OVERFLOW); // Bit 6 of memory -> V flag
    
    // BIT sets Z based on AND result
    expect(cpu.getStatusRegister() & ZERO).toBe(0); // 0xC0 & 0xC0 = 0xC0, so Z flag should be clear
    
    // Accumulator should not be modified
    expect(cpu.getAccumulator()).toBe(0xC0);
    expect(cpu.getProgramCounter()).toBe(2);
    expect(cycles).toBe(3);
  });
});
