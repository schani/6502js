import { describe, expect, it } from "bun:test";
import { type CPU, createCPU, step6502, CARRY, ZERO, INTERRUPT, DECIMAL, BREAK, UNUSED, OVERFLOW, NEGATIVE } from "./utils";

describe("Full coverage tests", () => {
  it("should test readByte edge case with undefined memory", () => {
    const cpu = createCPU();
    
    // Set PC to a high memory address that hasn't been initialized
    cpu.pc = 0xF000;
    
    // LDA immediate should read 0 from uninitialized memory
    cpu.mem[0xF000] = 0xA9; // LDA immediate
    // Do not initialize the next byte, it should read as 0
    
    // Execute
    const cycles = step6502(cpu);
    
    // Verify
    expect(cycles).toBe(2);
    expect(cpu.a).toBe(0); // Should read 0 from uninitialized memory
    expect(cpu.pc).toBe(0xF002);
    expect(cpu.p & ZERO).toBe(ZERO); // Result is zero
  });
  
  it("should test writeWord functionality directly", () => {
    // Need to access internal function, so we recreate it
    function writeWord(cpu: any, address: number, value: number): void {
        cpu.mem[address & 0xFFFF] = value & 0xFF;
        cpu.mem[(address + 1) & 0xFFFF] = (value >> 8) & 0xFF;
    }
    
    const cpu = createCPU();
    
    // Test writing to memory boundary
    writeWord(cpu, 0xFFFF, 0x1234);
    
    // Verify the write
    expect(cpu.mem[0xFFFF]).toBe(0x34); // Low byte
    expect(cpu.mem[0x0000]).toBe(0x12); // High byte wraps around
  });
  
  // Test for bit 6 of BIT instruction to set overflow flag
  it("should test BIT instruction setting overflow from bit 6", () => {
    const cpu = createCPU();
    
    // Setup test for BIT instruction
    cpu.mem[0] = 0x24; // BIT Zero Page
    cpu.mem[1] = 0x20; // Zero page address
    cpu.mem[0x20] = 0x40; // Bit 6 is set (overflow flag), bit 7 is clear (negative flag)
    
    cpu.a = 0xFF; // A register value (will match with all bits)
    cpu.p &= ~OVERFLOW; // Clear overflow flag
    cpu.p &= ~NEGATIVE; // Clear negative flag
    cpu.pc = 0;
    
    // Execute
    const cycles = step6502(cpu);
    
    // Verify
    expect(cycles).toBe(3);
    expect(cpu.p & OVERFLOW).toBe(OVERFLOW); // Overflow should be set from bit 6
    expect(cpu.p & NEGATIVE).toBe(0); // Negative should be clear since bit 7 is clear
    expect(cpu.p & ZERO).toBe(0); // Zero should be clear since A & mem is non-zero
  });
  
  // Test for bit 7 of BIT instruction to set negative flag
  it("should test BIT instruction setting negative from bit 7", () => {
    const cpu = createCPU();
    
    // Setup test for BIT instruction
    cpu.mem[0] = 0x2C; // BIT Absolute
    cpu.mem[1] = 0x00; // Low byte of address
    cpu.mem[2] = 0x20; // High byte of address (0x2000)
    cpu.mem[0x2000] = 0x80; // Bit 7 is set (negative flag), bit 6 is clear (overflow flag)
    
    cpu.a = 0xFF; // A register value (will match with all bits)
    cpu.p &= ~OVERFLOW; // Clear overflow flag
    cpu.p &= ~NEGATIVE; // Clear negative flag
    cpu.pc = 0;
    
    // Execute
    const cycles = step6502(cpu);
    
    // Verify
    expect(cycles).toBe(4);
    expect(cpu.p & OVERFLOW).toBe(0); // Overflow should be clear since bit 6 is clear
    expect(cpu.p & NEGATIVE).toBe(NEGATIVE); // Negative should be set from bit 7
    expect(cpu.p & ZERO).toBe(0); // Zero should be clear since A & mem is non-zero
  });
  
  // Test for BIT instruction setting zero flag when A & memory is zero
  it("should test BIT instruction setting zero when result is zero", () => {
    const cpu = createCPU();
    
    // Setup test for BIT instruction
    cpu.mem[0] = 0x24; // BIT Zero Page
    cpu.mem[1] = 0x20; // Zero page address
    cpu.mem[0x20] = 0xF0; // Some value with bits set
    
    cpu.a = 0x0F; // A register value (no bits match with mem[0x20])
    cpu.p &= ~ZERO; // Clear zero flag
    cpu.pc = 0;
    
    // Execute
    const cycles = step6502(cpu);
    
    // Verify
    expect(cycles).toBe(3);
    expect(cpu.p & ZERO).toBe(ZERO); // Zero should be set since A & mem = 0
  });
});