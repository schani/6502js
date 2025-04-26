import { describe, expect, it } from "bun:test";
import { type CPU, createCPU, step6502, CARRY, ZERO, INTERRUPT, DECIMAL, BREAK, UNUSED, OVERFLOW, NEGATIVE } from "./utils";

describe("BIT instruction extensive tests", () => {
  it("should test all flag behavior of BIT instruction in Zero Page mode", () => {
    const cpu = createCPU();
    
    // Test with bit 7 and bit 6 set, A matches some bits
    cpu.mem[0x1000] = 0x24; // BIT Zero Page
    cpu.mem[0x1001] = 0x80; // Zero page address
    cpu.mem[0x0080] = 0xC0; // Test value: 11000000 (bit 7 and 6 are set)
    
    cpu.a = 0x01; // A value: 00000001 (no match with high bits)
    cpu.p &= ~(OVERFLOW | NEGATIVE | ZERO); // Clear all flags
    cpu.pc = 0x1000;
    
    let cycles = step6502(cpu);
    
    expect(cycles).toBe(3);
    expect(cpu.p & NEGATIVE).toBe(NEGATIVE); // Bit 7 of memory is 1
    expect(cpu.p & OVERFLOW).toBe(OVERFLOW); // Bit 6 of memory is 1
    expect(cpu.p & ZERO).toBe(ZERO); // A & M is zero (0x01 & 0xC0 = 0x00)
    
    // Test with bit 7 and bit 6 clear, A matches some bits
    cpu.mem[0x1002] = 0x24; // BIT Zero Page
    cpu.mem[0x1003] = 0x81; // Zero page address
    cpu.mem[0x0081] = 0x01; // Test value: 00000001 (bit 7 and 6 are clear)
    
    cpu.a = 0x01; // A value: 00000001 (matches with bit 0)
    cpu.p &= ~(OVERFLOW | NEGATIVE | ZERO); // Clear all flags
    cpu.pc = 0x1002;
    
    cycles = step6502(cpu);
    
    expect(cycles).toBe(3);
    expect(cpu.p & NEGATIVE).toBe(0); // Bit 7 of memory is 0
    expect(cpu.p & OVERFLOW).toBe(0); // Bit 6 of memory is 0
    expect(cpu.p & ZERO).toBe(0); // A & M is non-zero (0x01 & 0x01 = 0x01)
    
    // Test with A not matching any bits (should set ZERO flag)
    cpu.mem[0x1004] = 0x24; // BIT Zero Page
    cpu.mem[0x1005] = 0x82; // Zero page address
    cpu.mem[0x0082] = 0xC0; // Test value: 11000000 (bit 7 and 6 are set)
    
    cpu.a = 0x01; // A value: 00000001 (no match with memory)
    cpu.p &= ~(OVERFLOW | NEGATIVE | ZERO); // Clear all flags
    cpu.pc = 0x1004;
    
    cycles = step6502(cpu);
    
    expect(cycles).toBe(3);
    expect(cpu.p & NEGATIVE).toBe(NEGATIVE); // Bit 7 of memory is 1
    expect(cpu.p & OVERFLOW).toBe(OVERFLOW); // Bit 6 of memory is 1
    expect(cpu.p & ZERO).toBe(ZERO); // A & M is zero (0x01 & 0xC0 = 0x00)
  });
  
  it("should test all flag behavior of BIT instruction in Absolute mode", () => {
    const cpu = createCPU();
    
    // Test with both high bits set, A matches all bits
    cpu.mem[0x1000] = 0x2C; // BIT Absolute
    cpu.mem[0x1001] = 0x00; // Low byte of address
    cpu.mem[0x1002] = 0x20; // High byte of address (0x2000)
    cpu.mem[0x2000] = 0xFF; // Test value: 11111111 (all bits set)
    
    cpu.a = 0xFF; // A value: 11111111 (matches all bits)
    cpu.p &= ~(OVERFLOW | NEGATIVE | ZERO); // Clear all flags
    cpu.pc = 0x1000;
    
    let cycles = step6502(cpu);
    
    expect(cycles).toBe(4);
    expect(cpu.p & NEGATIVE).toBe(NEGATIVE); // Bit 7 of memory is 1
    expect(cpu.p & OVERFLOW).toBe(OVERFLOW); // Bit 6 of memory is 1
    expect(cpu.p & ZERO).toBe(0); // A & M is non-zero (0xFF & 0xFF = 0xFF)
    
    // Test with bit 7 set and bit 6 clear, A doesn't match any bits
    cpu.mem[0x1003] = 0x2C; // BIT Absolute
    cpu.mem[0x1004] = 0x10; // Low byte of address
    cpu.mem[0x1005] = 0x20; // High byte of address (0x2010)
    cpu.mem[0x2010] = 0x80; // Test value: 10000000 (only bit 7 set)
    
    cpu.a = 0x7F; // A value: 01111111 (doesn't match bit 7)
    cpu.p &= ~(OVERFLOW | NEGATIVE | ZERO); // Clear all flags
    cpu.pc = 0x1003;
    
    cycles = step6502(cpu);
    
    expect(cycles).toBe(4);
    expect(cpu.p & NEGATIVE).toBe(NEGATIVE); // Bit 7 of memory is 1
    expect(cpu.p & OVERFLOW).toBe(0); // Bit 6 of memory is 0
    expect(cpu.p & ZERO).toBe(ZERO); // A & M is zero (0x7F & 0x80 = 0x00)
    
    // Test with bit 7 clear and bit 6 set, A matches perfectly
    cpu.mem[0x1006] = 0x2C; // BIT Absolute
    cpu.mem[0x1007] = 0x20; // Low byte of address
    cpu.mem[0x1008] = 0x20; // High byte of address (0x2020)
    cpu.mem[0x2020] = 0x40; // Test value: 01000000 (only bit 6 set)
    
    cpu.a = 0x40; // A value: 01000000 (matches exactly)
    cpu.p &= ~(OVERFLOW | NEGATIVE | ZERO); // Clear all flags
    cpu.pc = 0x1006;
    
    cycles = step6502(cpu);
    
    expect(cycles).toBe(4);
    expect(cpu.p & NEGATIVE).toBe(0); // Bit 7 of memory is 0
    expect(cpu.p & OVERFLOW).toBe(OVERFLOW); // Bit 6 of memory is 1
    expect(cpu.p & ZERO).toBe(0); // A & M is non-zero (0x40 & 0x40 = 0x40)
  });
});