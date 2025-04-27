import { describe, expect, it } from "bun:test";
import { type CPU, createCPU, CARRY, ZERO, INTERRUPT, DECIMAL, BREAK, UNUSED, OVERFLOW, NEGATIVE } from "./utils";

describe("Full coverage tests", () => {
  it("should test readByte edge case with undefined memory", () => {
    const cpu = createCPU();
    
    // Set PC to a high memory address that hasn't been initialized
    cpu.setProgramCounter(0xF000);
    
    // LDA immediate should read 0 from uninitialized memory
    cpu.loadByte(0xF000, 0xA9); // LDA immediate
    // Do not initialize the next byte, it should read as 0
    
    // Execute
    const cycles = cpu.step();
    
    // Verify
    expect(cycles).toBe(2);
    expect(cpu.getAccumulator()).toBe(0); // Should read 0 from uninitialized memory
    expect(cpu.getProgramCounter()).toBe(0xF002);
    expect(cpu.isStatusFlagSet(ZERO)).toBe(true); // Result is zero
  });
  
  it("should test writeWord functionality directly", () => {
    const cpu = createCPU();
    
    // Test writing to memory boundary
    cpu.loadWord(0xFFFF, 0x1234);
    
    // Verify the write
    expect(cpu.readByte(0xFFFF)).toBe(0x34); // Low byte
    expect(cpu.readByte(0x0000)).toBe(0x12); // High byte wraps around
  });
  
  // Test for bit 6 of BIT instruction to set overflow flag
  it("should test BIT instruction setting overflow from bit 6", () => {
    const cpu = createCPU();
    
    // Setup test for BIT instruction
    cpu.loadByte(0, 0x24); // BIT Zero Page
    cpu.loadByte(1, 0x20); // Zero page address
    cpu.loadByte(0x20, 0x40); // Bit 6 is set (overflow flag), bit 7 is clear (negative flag)
    
    cpu.setAccumulator(0xFF); // A register value (will match with all bits)
    cpu.clearStatusFlag(OVERFLOW); // Clear overflow flag
    cpu.clearStatusFlag(NEGATIVE); // Clear negative flag
    cpu.setProgramCounter(0);
    
    // Execute
    const cycles = cpu.step();
    
    // Verify
    expect(cycles).toBe(3);
    expect(cpu.isStatusFlagSet(OVERFLOW)).toBe(true); // Overflow should be set from bit 6
    expect(cpu.isStatusFlagSet(NEGATIVE)).toBe(false); // Negative should be clear since bit 7 is clear
    expect(cpu.isStatusFlagSet(ZERO)).toBe(false); // Zero should be clear since A & mem is non-zero
  });
  
  // Test for bit 7 of BIT instruction to set negative flag
  it("should test BIT instruction setting negative from bit 7", () => {
    const cpu = createCPU();
    
    // Setup test for BIT instruction
    cpu.loadByte(0, 0x2C); // BIT Absolute
    cpu.loadByte(1, 0x00); // Low byte of address
    cpu.loadByte(2, 0x20); // High byte of address (0x2000)
    cpu.loadByte(0x2000, 0x80); // Bit 7 is set (negative flag), bit 6 is clear (overflow flag)
    
    cpu.setAccumulator(0xFF); // A register value (will match with all bits)
    cpu.clearStatusFlag(OVERFLOW); // Clear overflow flag
    cpu.clearStatusFlag(NEGATIVE); // Clear negative flag
    cpu.setProgramCounter(0);
    
    // Execute
    const cycles = cpu.step();
    
    // Verify
    expect(cycles).toBe(4);
    expect(cpu.isStatusFlagSet(OVERFLOW)).toBe(false); // Overflow should be clear since bit 6 is clear
    expect(cpu.isStatusFlagSet(NEGATIVE)).toBe(true); // Negative should be set from bit 7
    expect(cpu.isStatusFlagSet(ZERO)).toBe(false); // Zero should be clear since A & mem is non-zero
  });
  
  // Test for BIT instruction setting zero flag when A & memory is zero
  it("should test BIT instruction setting zero when result is zero", () => {
    const cpu = createCPU();
    
    // Setup test for BIT instruction
    cpu.loadByte(0, 0x24); // BIT Zero Page
    cpu.loadByte(1, 0x20); // Zero page address
    cpu.loadByte(0x20, 0xF0); // Some value with bits set
    
    cpu.setAccumulator(0x0F); // A register value (no bits match with mem[0x20])
    cpu.clearStatusFlag(ZERO); // Clear zero flag
    cpu.setProgramCounter(0);
    
    // Execute
    const cycles = cpu.step();
    
    // Verify
    expect(cycles).toBe(3);
    expect(cpu.isStatusFlagSet(ZERO)).toBe(true); // Zero should be set since A & mem = 0
  });
});