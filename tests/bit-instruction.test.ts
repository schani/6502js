import { describe, expect, it } from "bun:test";
import { CPU1, ZERO, OVERFLOW, NEGATIVE } from "../6502";

describe("BIT instruction extensive tests", () => {
  it("should test all flag behavior of BIT instruction in Zero Page mode", () => {
    const cpu = new CPU1();
    
    // Test with bit 7 and bit 6 set, A matches some bits
    cpu.loadByte(0x1000, 0x24); // BIT Zero Page
    cpu.loadByte(0x1001, 0x80); // Zero page address
    cpu.loadByte(0x0080, 0xC0); // Test value: 11000000 (bit 7 and 6 are set)
    
    cpu.setAccumulator(0x01); // A value: 00000001 (no match with high bits)
    cpu.clearStatusFlag(OVERFLOW | NEGATIVE | ZERO); // Clear all flags
    cpu.setProgramCounter(0x1000);
    
    let cycles = cpu.step();
    
    expect(cycles).toBe(3);
    expect(cpu.isStatusFlagSet(NEGATIVE)).toBe(true); // Bit 7 of memory is 1
    expect(cpu.isStatusFlagSet(OVERFLOW)).toBe(true); // Bit 6 of memory is 1
    expect(cpu.isStatusFlagSet(ZERO)).toBe(true); // A & M is zero (0x01 & 0xC0 = 0x00)
    
    // Test with bit 7 and bit 6 clear, A matches some bits
    cpu.loadByte(0x1002, 0x24); // BIT Zero Page
    cpu.loadByte(0x1003, 0x81); // Zero page address
    cpu.loadByte(0x0081, 0x01); // Test value: 00000001 (bit 7 and 6 are clear)
    
    cpu.setAccumulator(0x01); // A value: 00000001 (matches with bit 0)
    cpu.clearStatusFlag(OVERFLOW | NEGATIVE | ZERO); // Clear all flags
    cpu.setProgramCounter(0x1002);
    
    cycles = cpu.step();
    
    expect(cycles).toBe(3);
    expect(cpu.isStatusFlagSet(NEGATIVE)).toBe(false); // Bit 7 of memory is 0
    expect(cpu.isStatusFlagSet(OVERFLOW)).toBe(false); // Bit 6 of memory is 0
    expect(cpu.isStatusFlagSet(ZERO)).toBe(false); // A & M is non-zero (0x01 & 0x01 = 0x01)
    
    // Test with A not matching any bits (should set ZERO flag)
    cpu.loadByte(0x1004, 0x24); // BIT Zero Page
    cpu.loadByte(0x1005, 0x82); // Zero page address
    cpu.loadByte(0x0082, 0xC0); // Test value: 11000000 (bit 7 and 6 are set)
    
    cpu.setAccumulator(0x01); // A value: 00000001 (no match with memory)
    cpu.clearStatusFlag(OVERFLOW | NEGATIVE | ZERO); // Clear all flags
    cpu.setProgramCounter(0x1004);
    
    cycles = cpu.step();
    
    expect(cycles).toBe(3);
    expect(cpu.isStatusFlagSet(NEGATIVE)).toBe(true); // Bit 7 of memory is 1
    expect(cpu.isStatusFlagSet(OVERFLOW)).toBe(true); // Bit 6 of memory is 1
    expect(cpu.isStatusFlagSet(ZERO)).toBe(true); // A & M is zero (0x01 & 0xC0 = 0x00)
  });
  
  it("should test all flag behavior of BIT instruction in Absolute mode", () => {
    const cpu = new CPU1();
    
    // Test with both high bits set, A matches all bits
    cpu.loadByte(0x1000, 0x2C); // BIT Absolute
    cpu.loadByte(0x1001, 0x00); // Low byte of address
    cpu.loadByte(0x1002, 0x20); // High byte of address (0x2000)
    cpu.loadByte(0x2000, 0xFF); // Test value: 11111111 (all bits set)
    
    cpu.setAccumulator(0xFF); // A value: 11111111 (matches all bits)
    cpu.clearStatusFlag(OVERFLOW | NEGATIVE | ZERO); // Clear all flags
    cpu.setProgramCounter(0x1000);
    
    let cycles = cpu.step();
    
    expect(cycles).toBe(4);
    expect(cpu.isStatusFlagSet(NEGATIVE)).toBe(true); // Bit 7 of memory is 1
    expect(cpu.isStatusFlagSet(OVERFLOW)).toBe(true); // Bit 6 of memory is 1
    expect(cpu.isStatusFlagSet(ZERO)).toBe(false); // A & M is non-zero (0xFF & 0xFF = 0xFF)
    
    // Test with bit 7 set and bit 6 clear, A doesn't match any bits
    cpu.loadByte(0x1003, 0x2C); // BIT Absolute
    cpu.loadByte(0x1004, 0x10); // Low byte of address
    cpu.loadByte(0x1005, 0x20); // High byte of address (0x2010)
    cpu.loadByte(0x2010, 0x80); // Test value: 10000000 (only bit 7 set)
    
    cpu.setAccumulator(0x7F); // A value: 01111111 (doesn't match bit 7)
    cpu.clearStatusFlag(OVERFLOW | NEGATIVE | ZERO); // Clear all flags
    cpu.setProgramCounter(0x1003);
    
    cycles = cpu.step();
    
    expect(cycles).toBe(4);
    expect(cpu.isStatusFlagSet(NEGATIVE)).toBe(true); // Bit 7 of memory is 1
    expect(cpu.isStatusFlagSet(OVERFLOW)).toBe(false); // Bit 6 of memory is 0
    expect(cpu.isStatusFlagSet(ZERO)).toBe(true); // A & M is zero (0x7F & 0x80 = 0x00)
    
    // Test with bit 7 clear and bit 6 set, A matches perfectly
    cpu.loadByte(0x1006, 0x2C); // BIT Absolute
    cpu.loadByte(0x1007, 0x20); // Low byte of address
    cpu.loadByte(0x1008, 0x20); // High byte of address (0x2020)
    cpu.loadByte(0x2020, 0x40); // Test value: 01000000 (only bit 6 set)
    
    cpu.setAccumulator(0x40); // A value: 01000000 (matches exactly)
    cpu.clearStatusFlag(OVERFLOW | NEGATIVE | ZERO); // Clear all flags
    cpu.setProgramCounter(0x1006);
    
    cycles = cpu.step();
    
    expect(cycles).toBe(4);
    expect(cpu.isStatusFlagSet(NEGATIVE)).toBe(false); // Bit 7 of memory is 0
    expect(cpu.isStatusFlagSet(OVERFLOW)).toBe(true); // Bit 6 of memory is 1
    expect(cpu.isStatusFlagSet(ZERO)).toBe(false); // A & M is non-zero (0x40 & 0x40 = 0x40)
  });
});