import { describe, expect, it } from "bun:test";
import { createCPU, step6502, CARRY, ZERO, NEGATIVE } from "../cpu";

// This test file is dedicated to achieving 100% coverage of the ROR Absolute,X instruction
describe("ROR Absolute,X Complete Coverage", () => {
  it("should test ROR Absolute,X with carry set (line 1579)", () => {
    // This test targets the line cpu.p |= CARRY;
    const cpu = createCPU();
    
    // Initialize CPU state
    cpu.pc = 0;
    cpu.mem[0] = 0x7E;    // ROR Absolute,X
    cpu.mem[1] = 0x00;    // Low byte of address
    cpu.mem[2] = 0x30;    // High byte of address
    cpu.x = 0x05;         // X register offset
    cpu.p &= ~CARRY;      // Clear carry flag initially
    
    // Set memory value with least significant bit set to 1
    // so that newCarry will be true and line 1579 will execute
    cpu.mem[0x3005] = 0x01;
    
    // Execute the instruction
    step6502(cpu);
    
    // Verify the results
    // 0x01 >> 1 = 0x00 (with carry flag set)
    expect(cpu.mem[0x3005]).toBe(0x00);
    expect(cpu.p & CARRY).toBe(CARRY);  // Carry should be set
    expect(cpu.p & ZERO).toBe(ZERO);    // Zero flag should be set
  });
  
  it("should test ROR Absolute,X with carry clear (line 1581)", () => {
    // This test targets the line cpu.p &= ~CARRY;
    const cpu = createCPU();
    
    // Initialize CPU state
    cpu.pc = 0;
    cpu.mem[0] = 0x7E;    // ROR Absolute,X
    cpu.mem[1] = 0x00;    // Low byte of address
    cpu.mem[2] = 0x30;    // High byte of address
    cpu.x = 0x05;         // X register offset
    cpu.p |= CARRY;       // Set carry flag initially
    
    // Set memory value with least significant bit set to 0
    // so that newCarry will be false and line 1581 will execute
    cpu.mem[0x3005] = 0x02;
    
    // Execute the instruction
    step6502(cpu);
    
    // Verify the results
    // 0x02 >> 1 = 0x01 (with carry flag clear)
    // Since carry was initially set, bit 7 will be 1
    // So result is 0x01 | 0x80 = 0x81
    expect(cpu.mem[0x3005]).toBe(0x81);
    expect(cpu.p & CARRY).toBe(0);        // Carry should be clear
    expect(cpu.p & NEGATIVE).toBe(NEGATIVE); // Negative flag should be set
  });
  
  it("should test ROR Absolute,X with all coverage variations", () => {
    // Test more combinations for complete coverage
    const cpu = createCPU();
    
    // Test 1: Value with bit 0 set (odd), carry initially clear
    cpu.pc = 0;
    cpu.mem[0] = 0x7E;    // ROR Absolute,X
    cpu.mem[1] = 0x00;    // Low byte of address
    cpu.mem[2] = 0x40;    // High byte of address
    cpu.x = 0x10;         // X register offset
    cpu.p &= ~CARRY;      // Clear carry flag initially
    cpu.mem[0x4010] = 0x55; // 0101 0101
    
    step6502(cpu);
    
    // 0x55 >> 1 = 0x2A (with carry flag set due to LSB being 1)
    expect(cpu.mem[0x4010]).toBe(0x2A);
    expect(cpu.p & CARRY).toBe(CARRY);  // Carry should be set
    
    // Test 2: Value with bit 0 clear (even), carry initially set
    cpu.pc = 0;
    cpu.mem[0] = 0x7E;    // ROR Absolute,X
    cpu.mem[1] = 0x00;    // Low byte of address
    cpu.mem[2] = 0x40;    // High byte of address
    cpu.x = 0x10;         // X register offset
    cpu.p |= CARRY;       // Set carry flag initially
    cpu.mem[0x4010] = 0xAA; // 1010 1010
    
    step6502(cpu);
    
    // 0xAA >> 1 = 0x55 with carry in to bit 7, so 0xD5
    expect(cpu.mem[0x4010]).toBe(0xD5);
    expect(cpu.p & CARRY).toBe(0);      // Carry should be clear
    expect(cpu.p & NEGATIVE).toBe(NEGATIVE); // Negative flag should be set
    
    // Test 3: Zero result
    cpu.pc = 0;
    cpu.mem[0] = 0x7E;    // ROR Absolute,X
    cpu.mem[1] = 0x00;    // Low byte of address
    cpu.mem[2] = 0x40;    // High byte of address
    cpu.x = 0x10;         // X register offset
    cpu.p &= ~CARRY;      // Clear carry flag initially
    cpu.mem[0x4010] = 0x00; // 0000 0000
    
    step6502(cpu);
    
    // 0x00 >> 1 = 0x00 (with carry flag clear)
    expect(cpu.mem[0x4010]).toBe(0x00);
    expect(cpu.p & CARRY).toBe(0);      // Carry should be clear
    expect(cpu.p & ZERO).toBe(ZERO);    // Zero flag should be set
  });
});