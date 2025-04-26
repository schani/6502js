import { describe, expect, it } from "bun:test";
import { createCPU, step6502, ZERO, NEGATIVE } from "./utils";

describe("Increment and decrement operations", () => {
  it("should perform INX instruction", () => {
    const cpu = createCPU();
    
    // Set up CPU state
    cpu.x = 0x41;
    
    // Set up memory
    cpu.mem[0] = 0xE8; // INX
    
    const cycles = step6502(cpu);
    
    expect(cpu.x).toBe(0x42);
    expect(cpu.p & ZERO).toBe(0); // Result is not zero
    expect(cpu.p & NEGATIVE).toBe(0); // Result is not negative
    expect(cpu.pc).toBe(1);
    expect(cycles).toBe(2);
    
    // Test wrapping from 0xFF to 0x00
    cpu.pc = 0;
    cpu.x = 0xFF;
    
    step6502(cpu);
    
    expect(cpu.x).toBe(0x00);
    expect(cpu.p & ZERO).toBe(ZERO); // Result is zero
  });
  
  it("should perform INY instruction", () => {
    const cpu = createCPU();
    
    // Set up CPU state
    cpu.y = 0x41;
    
    // Set up memory
    cpu.mem[0] = 0xC8; // INY
    
    const cycles = step6502(cpu);
    
    expect(cpu.y).toBe(0x42);
    expect(cpu.p & ZERO).toBe(0); // Result is not zero
    expect(cpu.p & NEGATIVE).toBe(0); // Result is not negative
    expect(cpu.pc).toBe(1);
    expect(cycles).toBe(2);
  });
  
  it("should perform DEX instruction", () => {
    const cpu = createCPU();
    
    // Set up CPU state
    cpu.x = 0x43;
    
    // Set up memory
    cpu.mem[0] = 0xCA; // DEX
    
    const cycles = step6502(cpu);
    
    expect(cpu.x).toBe(0x42);
    expect(cpu.p & ZERO).toBe(0); // Result is not zero
    expect(cpu.p & NEGATIVE).toBe(0); // Result is not negative
    expect(cpu.pc).toBe(1);
    expect(cycles).toBe(2);
    
    // Test wrapping from 0x00 to 0xFF
    cpu.pc = 0;
    cpu.x = 0x00;
    
    step6502(cpu);
    
    expect(cpu.x).toBe(0xFF);
    expect(cpu.p & NEGATIVE).toBe(NEGATIVE); // Result is negative
  });
  
  it("should perform DEY instruction", () => {
    const cpu = createCPU();
    
    // Set up CPU state
    cpu.y = 0x43;
    
    // Set up memory
    cpu.mem[0] = 0x88; // DEY
    
    const cycles = step6502(cpu);
    
    expect(cpu.y).toBe(0x42);
    expect(cpu.p & ZERO).toBe(0); // Result is not zero
    expect(cpu.p & NEGATIVE).toBe(0); // Result is not negative
    expect(cpu.pc).toBe(1);
    expect(cycles).toBe(2);
  });
  
  it("should perform INC zero page instruction", () => {
    const cpu = createCPU();
    
    // Set up memory
    cpu.mem[0] = 0xE6; // INC zero page
    cpu.mem[1] = 0x20; // Zero page address
    cpu.mem[0x20] = 0x41; // Value to increment
    
    const cycles = step6502(cpu);
    
    expect(cpu.mem[0x20]).toBe(0x42);
    expect(cpu.p & ZERO).toBe(0); // Result is not zero
    expect(cpu.p & NEGATIVE).toBe(0); // Result is not negative
    expect(cpu.pc).toBe(2);
    expect(cycles).toBe(5);
  });
  
  it("should perform DEC zero page instruction", () => {
    const cpu = createCPU();
    
    // Set up memory
    cpu.mem[0] = 0xC6; // DEC zero page
    cpu.mem[1] = 0x20; // Zero page address
    cpu.mem[0x20] = 0x43; // Value to decrement
    
    const cycles = step6502(cpu);
    
    expect(cpu.mem[0x20]).toBe(0x42);
    expect(cpu.p & ZERO).toBe(0); // Result is not zero
    expect(cpu.p & NEGATIVE).toBe(0); // Result is not negative
    expect(cpu.pc).toBe(2);
    expect(cycles).toBe(5);
  });
});