import { describe, expect, it } from "bun:test";
import { createCPU, ZERO, NEGATIVE } from "./utils";

describe("Increment and decrement operations", () => {
  it("should perform INX instruction", () => {
    const cpu = createCPU();
    
    // Set up CPU state
    cpu.setXRegister(0x41);
    
    // Set up memory
    cpu.loadByte(0, 0xE8); // INX
    
    const cycles = cpu.step();
    
    expect(cpu.getXRegister()).toBe(0x42);
    expect(cpu.getStatusRegister() & ZERO).toBe(0); // Result is not zero
    expect(cpu.getStatusRegister() & NEGATIVE).toBe(0); // Result is not negative
    expect(cpu.getProgramCounter()).toBe(1);
    expect(cycles).toBe(2);
    
    // Test wrapping from 0xFF to 0x00
    cpu.setProgramCounter(0);
    cpu.setXRegister(0xFF);
    
    cpu.step();
    
    expect(cpu.getXRegister()).toBe(0x00);
    expect(cpu.getStatusRegister() & ZERO).toBe(ZERO); // Result is zero
  });
  
  it("should perform INY instruction", () => {
    const cpu = createCPU();
    
    // Set up CPU state
    cpu.setYRegister(0x41);
    
    // Set up memory
    cpu.loadByte(0, 0xC8); // INY
    
    const cycles = cpu.step();
    
    expect(cpu.getYRegister()).toBe(0x42);
    expect(cpu.getStatusRegister() & ZERO).toBe(0); // Result is not zero
    expect(cpu.getStatusRegister() & NEGATIVE).toBe(0); // Result is not negative
    expect(cpu.getProgramCounter()).toBe(1);
    expect(cycles).toBe(2);
  });
  
  it("should perform DEX instruction", () => {
    const cpu = createCPU();
    
    // Set up CPU state
    cpu.setXRegister(0x43);
    
    // Set up memory
    cpu.loadByte(0, 0xCA); // DEX
    
    const cycles = cpu.step();
    
    expect(cpu.getXRegister()).toBe(0x42);
    expect(cpu.getStatusRegister() & ZERO).toBe(0); // Result is not zero
    expect(cpu.getStatusRegister() & NEGATIVE).toBe(0); // Result is not negative
    expect(cpu.getProgramCounter()).toBe(1);
    expect(cycles).toBe(2);
    
    // Test wrapping from 0x00 to 0xFF
    cpu.setProgramCounter(0);
    cpu.setXRegister(0x00);
    
    cpu.step();
    
    expect(cpu.getXRegister()).toBe(0xFF);
    expect(cpu.getStatusRegister() & NEGATIVE).toBe(NEGATIVE); // Result is negative
  });
  
  it("should perform DEY instruction", () => {
    const cpu = createCPU();
    
    // Set up CPU state
    cpu.setYRegister(0x43);
    
    // Set up memory
    cpu.loadByte(0, 0x88); // DEY
    
    const cycles = cpu.step();
    
    expect(cpu.getYRegister()).toBe(0x42);
    expect(cpu.getStatusRegister() & ZERO).toBe(0); // Result is not zero
    expect(cpu.getStatusRegister() & NEGATIVE).toBe(0); // Result is not negative
    expect(cpu.getProgramCounter()).toBe(1);
    expect(cycles).toBe(2);
  });
  
  it("should perform INC zero page instruction", () => {
    const cpu = createCPU();
    
    // Set up memory
    cpu.loadByte(0, 0xE6); // INC zero page
    cpu.loadByte(1, 0x20); // Zero page address
    cpu.loadByte(0x20, 0x41); // Value to increment
    
    const cycles = cpu.step();
    
    expect(cpu.readByte(0x20)).toBe(0x42);
    expect(cpu.getStatusRegister() & ZERO).toBe(0); // Result is not zero
    expect(cpu.getStatusRegister() & NEGATIVE).toBe(0); // Result is not negative
    expect(cpu.getProgramCounter()).toBe(2);
    expect(cycles).toBe(5);
  });
  
  it("should perform DEC zero page instruction", () => {
    const cpu = createCPU();
    
    // Set up memory
    cpu.loadByte(0, 0xC6); // DEC zero page
    cpu.loadByte(1, 0x20); // Zero page address
    cpu.loadByte(0x20, 0x43); // Value to decrement
    
    const cycles = cpu.step();
    
    expect(cpu.readByte(0x20)).toBe(0x42);
    expect(cpu.getStatusRegister() & ZERO).toBe(0); // Result is not zero
    expect(cpu.getStatusRegister() & NEGATIVE).toBe(0); // Result is not negative
    expect(cpu.getProgramCounter()).toBe(2);
    expect(cycles).toBe(5);
  });
});