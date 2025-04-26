import { describe, expect, it } from "bun:test";
import { createCPU, step6502, ZERO, NEGATIVE } from "./utils";

describe("Load instructions", () => {
  it("should perform LDA immediate instruction", () => {
    const cpu = createCPU();
    
    // LDA #$42 - Load accumulator with value 0x42
    cpu.mem[0] = 0xA9; // LDA immediate
    cpu.mem[1] = 0x42; // Value to load

    const cycles = step6502(cpu);
    
    expect(cpu.a).toBe(0x42);
    expect(cpu.pc).toBe(2);  // PC should advance by 2 bytes
    expect(cycles).toBe(2);  // LDA immediate takes 2 cycles
    expect(cpu.p & ZERO).toBe(0); // Zero flag should be clear
    expect(cpu.p & NEGATIVE).toBe(0); // Negative flag should be clear
    
    // Test zero flag
    cpu.pc = 0;
    cpu.mem[1] = 0x00;
    step6502(cpu);
    expect(cpu.a).toBe(0);
    expect(cpu.p & ZERO).toBe(ZERO); // Zero flag should be set
    
    // Test negative flag
    cpu.pc = 0;
    cpu.mem[1] = 0x80;
    step6502(cpu);
    expect(cpu.a).toBe(0x80);
    expect(cpu.p & NEGATIVE).toBe(NEGATIVE); // Negative flag should be set
  });

  it("should perform LDX immediate instruction", () => {
    const cpu = createCPU();
    
    // LDX #$42 - Load X register with value 0x42
    cpu.mem[0] = 0xA2; // LDX immediate
    cpu.mem[1] = 0x42; // Value to load

    const cycles = step6502(cpu);
    
    expect(cpu.x).toBe(0x42);
    expect(cpu.pc).toBe(2);
    expect(cycles).toBe(2);
    expect(cpu.p & ZERO).toBe(0);
    expect(cpu.p & NEGATIVE).toBe(0);
  });

  it("should perform LDY immediate instruction", () => {
    const cpu = createCPU();
    
    // LDY #$42 - Load Y register with value 0x42
    cpu.mem[0] = 0xA0; // LDY immediate
    cpu.mem[1] = 0x42; // Value to load

    const cycles = step6502(cpu);
    
    expect(cpu.y).toBe(0x42);
    expect(cpu.pc).toBe(2);
    expect(cycles).toBe(2);
    expect(cpu.p & ZERO).toBe(0);
    expect(cpu.p & NEGATIVE).toBe(0);
  });

  it("should perform LDA zero page instruction", () => {
    const cpu = createCPU();
    
    // Set up memory
    cpu.mem[0] = 0xA5; // LDA zero page
    cpu.mem[1] = 0x42; // Zero page address
    cpu.mem[0x42] = 0x37; // Value at zero page address
    
    const cycles = step6502(cpu);
    
    expect(cpu.a).toBe(0x37);
    expect(cpu.pc).toBe(2);
    expect(cycles).toBe(3);
  });

  it("should perform LDX zero page instruction", () => {
    const cpu = createCPU();
    
    // Set up memory
    cpu.mem[0] = 0xA6; // LDX zero page
    cpu.mem[1] = 0x42; // Zero page address
    cpu.mem[0x42] = 0x37; // Value at zero page address
    
    const cycles = step6502(cpu);
    
    expect(cpu.x).toBe(0x37);
    expect(cpu.pc).toBe(2);
    expect(cycles).toBe(3);
  });
  
  // Add tests for zero page,X and zero page,Y addressing
  it("should perform LDA zero page,X instruction", () => {
    const cpu = createCPU();
    
    // Set up CPU state
    cpu.x = 0x05;
    
    // Set up memory
    cpu.mem[0] = 0xB5; // LDA zero page,X
    cpu.mem[1] = 0x20; // Zero page address
    cpu.mem[0x25] = 0x42; // Value at (zero page address + X)
    
    const cycles = step6502(cpu);
    
    expect(cpu.a).toBe(0x42);
    expect(cpu.pc).toBe(2);
    expect(cycles).toBe(4);
  });
  
  it("should handle zero page,X wrap-around", () => {
    const cpu = createCPU();
    
    // Set up CPU state
    cpu.x = 0xFF;
    
    // Set up memory
    cpu.mem[0] = 0xB5; // LDA zero page,X
    cpu.mem[1] = 0x80; // Zero page address
    cpu.mem[0x7F] = 0x42; // Value at (0x80 + 0xFF) & 0xFF = 0x7F (wrap around)
    
    const cycles = step6502(cpu);
    
    expect(cpu.a).toBe(0x42);
    expect(cpu.pc).toBe(2);
    expect(cycles).toBe(4);
  });
  
  it("should perform LDX zero page,Y instruction", () => {
    const cpu = createCPU();
    
    // Set up CPU state
    cpu.y = 0x05;
    
    // Set up memory
    cpu.mem[0] = 0xB6; // LDX zero page,Y
    cpu.mem[1] = 0x20; // Zero page address
    cpu.mem[0x25] = 0x42; // Value at (zero page address + Y)
    
    const cycles = step6502(cpu);
    
    expect(cpu.x).toBe(0x42);
    expect(cpu.pc).toBe(2);
    expect(cycles).toBe(4);
  });
  
  // Tests for absolute addressing
  it("should perform LDA absolute instruction", () => {
    const cpu = createCPU();
    
    // Set up memory
    cpu.mem[0] = 0xAD; // LDA absolute
    cpu.mem[1] = 0x34; // Low byte of address
    cpu.mem[2] = 0x12; // High byte of address
    cpu.mem[0x1234] = 0x42; // Value at absolute address
    
    const cycles = step6502(cpu);
    
    expect(cpu.a).toBe(0x42);
    expect(cpu.pc).toBe(3);
    expect(cycles).toBe(4);
  });
  
  it("should perform LDA absolute,X instruction", () => {
    const cpu = createCPU();
    
    // Set up CPU state
    cpu.x = 0x05;
    
    // Set up memory
    cpu.mem[0] = 0xBD; // LDA absolute,X
    cpu.mem[1] = 0x34; // Low byte of address
    cpu.mem[2] = 0x12; // High byte of address
    cpu.mem[0x1239] = 0x42; // Value at (absolute address + X)
    
    const cycles = step6502(cpu);
    
    expect(cpu.a).toBe(0x42);
    expect(cpu.pc).toBe(3);
    expect(cycles).toBe(4);
  });
  
  it("should add cycle when crossing page boundary with absolute,X", () => {
    const cpu = createCPU();
    
    // Set up CPU state
    cpu.x = 0xFF;
    
    // Set up memory
    cpu.mem[0] = 0xBD; // LDA absolute,X
    cpu.mem[1] = 0x01; // Low byte of address
    cpu.mem[2] = 0x12; // High byte of address
    cpu.mem[0x1300] = 0x42; // Value at (0x1201 + 0xFF) = 0x1300 (page boundary crossed)
    
    const cycles = step6502(cpu);
    
    expect(cpu.a).toBe(0x42);
    expect(cpu.pc).toBe(3);
    expect(cycles).toBe(5); // Extra cycle for page boundary crossing
  });
  
  it("should perform LDA absolute,Y instruction", () => {
    const cpu = createCPU();
    
    // Set up CPU state
    cpu.y = 0x05;
    
    // Set up memory
    cpu.mem[0] = 0xB9; // LDA absolute,Y
    cpu.mem[1] = 0x34; // Low byte of address
    cpu.mem[2] = 0x12; // High byte of address
    cpu.mem[0x1239] = 0x42; // Value at (absolute address + Y)
    
    const cycles = step6502(cpu);
    
    expect(cpu.a).toBe(0x42);
    expect(cpu.pc).toBe(3);
    expect(cycles).toBe(4);
  });
});
