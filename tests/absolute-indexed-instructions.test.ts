import { describe, expect, it } from "bun:test";
import { createCPU, step6502 } from "./utils";
import { CARRY, ZERO, NEGATIVE } from "../cpu";

describe("Absolute Indexed Addressing Instructions", () => {
  // Test ASL Absolute,X
  it("should test ASL Absolute,X", () => {
    const cpu = createCPU();
    
    // Setup initial memory and CPU state
    cpu.pc = 0;
    cpu.mem[0] = 0x1E; // ASL Absolute,X
    cpu.mem[1] = 0x00; // Low byte of address (0x1000)
    cpu.mem[2] = 0x10; // High byte of address
    cpu.x = 0x05;      // X register = 5, so effective address is 0x1005
    cpu.mem[0x1005] = 0x80; // Value to shift (10000000)
    
    // Execute ASL Absolute,X
    step6502(cpu);
    
    // After shift: 00000000, carry flag set (bit 7 was 1)
    expect(cpu.mem[0x1005]).toBe(0x00);
    expect(cpu.p & CARRY).toBe(CARRY);
    expect(cpu.p & ZERO).toBe(ZERO);
  });
  
  // Test LSR Absolute,X
  it("should test LSR Absolute,X", () => {
    const cpu = createCPU();
    
    // Setup initial memory and CPU state
    cpu.pc = 0;
    cpu.mem[0] = 0x5E; // LSR Absolute,X
    cpu.mem[1] = 0x00; // Low byte of address (0x1000)
    cpu.mem[2] = 0x10; // High byte of address
    cpu.x = 0x05;      // X register = 5, so effective address is 0x1005
    cpu.mem[0x1005] = 0x01; // Value to shift (00000001)
    
    // Execute LSR Absolute,X
    step6502(cpu);
    
    // After shift: 00000000, carry flag set (bit 0 was 1)
    expect(cpu.mem[0x1005]).toBe(0x00);
    expect(cpu.p & CARRY).toBe(CARRY);
    expect(cpu.p & ZERO).toBe(ZERO);
  });
  
  // Test ROL Absolute,X
  it("should test ROL Absolute,X", () => {
    const cpu = createCPU();
    
    // Setup initial memory and CPU state
    cpu.pc = 0;
    cpu.mem[0] = 0x3E; // ROL Absolute,X
    cpu.mem[1] = 0x00; // Low byte of address (0x1000)
    cpu.mem[2] = 0x10; // High byte of address
    cpu.x = 0x05;      // X register = 5, so effective address is 0x1005
    cpu.mem[0x1005] = 0x80; // Value to rotate (10000000)
    cpu.p = CARRY;     // Set carry flag
    
    // Execute ROL Absolute,X
    step6502(cpu);
    
    // After rotate: 00000001, carry flag set (bit 7 was 1)
    expect(cpu.mem[0x1005]).toBe(0x01);
    expect(cpu.p & CARRY).toBe(CARRY);
    expect(cpu.p & ZERO).toBe(0);
  });
  
  // Test ROR Absolute,X
  it("should test ROR Absolute,X", () => {
    const cpu = createCPU();
    
    // Setup initial memory and CPU state
    cpu.pc = 0;
    cpu.mem[0] = 0x7E; // ROR Absolute,X
    cpu.mem[1] = 0x00; // Low byte of address (0x1000)
    cpu.mem[2] = 0x10; // High byte of address
    cpu.x = 0x05;      // X register = 5, so effective address is 0x1005
    cpu.mem[0x1005] = 0x01; // Value to rotate (00000001)
    cpu.p = CARRY;     // Set carry flag
    
    // Execute ROR Absolute,X
    step6502(cpu);
    
    // After rotate: 10000000, carry flag set (bit 0 was 1)
    expect(cpu.mem[0x1005]).toBe(0x80);
    expect(cpu.p & CARRY).toBe(CARRY);
    expect(cpu.p & NEGATIVE).toBe(NEGATIVE);
  });
  
  // Test INC Absolute,X
  it("should test INC Absolute,X", () => {
    const cpu = createCPU();
    
    // Setup initial memory and CPU state
    cpu.pc = 0;
    cpu.mem[0] = 0xFE; // INC Absolute,X
    cpu.mem[1] = 0x00; // Low byte of address (0x1000)
    cpu.mem[2] = 0x10; // High byte of address
    cpu.x = 0x05;      // X register = 5, so effective address is 0x1005
    cpu.mem[0x1005] = 0xFF; // Value to increment (will wrap to 0)
    
    // Execute INC Absolute,X
    step6502(cpu);
    
    // After increment: 0x00, zero flag set
    expect(cpu.mem[0x1005]).toBe(0x00);
    expect(cpu.p & ZERO).toBe(ZERO);
  });
  
  // Test DEC Absolute,X
  it("should test DEC Absolute,X", () => {
    const cpu = createCPU();
    
    // Setup initial memory and CPU state
    cpu.pc = 0;
    cpu.mem[0] = 0xDE; // DEC Absolute,X
    cpu.mem[1] = 0x00; // Low byte of address (0x1000)
    cpu.mem[2] = 0x10; // High byte of address
    cpu.x = 0x05;      // X register = 5, so effective address is 0x1005
    cpu.mem[0x1005] = 0x01; // Value to decrement (will be 0)
    
    // Execute DEC Absolute,X
    step6502(cpu);
    
    // After decrement: 0x00, zero flag set
    expect(cpu.mem[0x1005]).toBe(0x00);
    expect(cpu.p & ZERO).toBe(ZERO);
  });

  // Test LDA Absolute,X with page crossing
  it("should test LDA Absolute,X with page crossing", () => {
    const cpu = createCPU();
    
    // Setup initial memory and CPU state
    cpu.pc = 0;
    cpu.mem[0] = 0xBD; // LDA Absolute,X
    cpu.mem[1] = 0xFF; // Low byte of address (0x01FF)
    cpu.mem[2] = 0x01; // High byte of address
    cpu.x = 0x01;      // X register = 1, so effective address is 0x0200 (crosses page boundary)
    cpu.mem[0x0200] = 0x42; // Value to load
    
    // Execute LDA Absolute,X
    const cycles = step6502(cpu);
    
    // Check cycles (should be 5 due to page crossing)
    expect(cycles).toBe(5);
    
    // Check if A register was loaded with the value
    expect(cpu.a).toBe(0x42);
  });
  
  // Test LDA Absolute,Y with page crossing
  it("should test LDA Absolute,Y with page crossing", () => {
    const cpu = createCPU();
    
    // Setup initial memory and CPU state
    cpu.pc = 0;
    cpu.mem[0] = 0xB9; // LDA Absolute,Y
    cpu.mem[1] = 0xFF; // Low byte of address (0x01FF)
    cpu.mem[2] = 0x01; // High byte of address
    cpu.y = 0x01;      // Y register = 1, so effective address is 0x0200 (crosses page boundary)
    cpu.mem[0x0200] = 0x42; // Value to load
    
    // Execute LDA Absolute,Y
    const cycles = step6502(cpu);
    
    // Check cycles (should be 5 due to page crossing)
    expect(cycles).toBe(5);
    
    // Check if A register was loaded with the value
    expect(cpu.a).toBe(0x42);
  });
});