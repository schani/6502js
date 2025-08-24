import { describe, expect, it } from "bun:test";
import { getAccumulator, getProgramCounter, createCPU, type CPU, CARRY, ZERO, NEGATIVE, OVERFLOW, INTERRUPT, DECIMAL, BREAK, UNUSED } from "./utils";
describe("Full coverage tests", () => {
  it("should test readByte edge case with undefined memory", async () => {
    const cpu = createCPU();
    
    // Set PC to a high memory address that hasn't been initialized
    await cpu.setProgramCounter(0xF000);
    
    // LDA immediate should read 0 from uninitialized memory
    await cpu.loadByte(0xF000, 0xA9); // LDA immediate
    // Do not initialize the next byte, it should read as 0
    
    // Execute
    const cycles = await cpu.step();
    
    // Verify
    expect(cycles).toBe(2);
    expect(await await getAccumulator(cpu)).toBe(0); // Should read 0 from uninitialized memory
    expect(await await getProgramCounter(cpu)).toBe(0xF002);
    expect((((await cpu.getState()).p & ZERO) !== 0)).toBe(true); // Result is zero
  });
  
  it("should test writeWord functionality directly", async () => {
    const cpu = createCPU();
    
    // Test writing to memory boundary
    await cpu.loadWord(0xFFFF, 0x1234);
    
    // Verify the write
    expect(await cpu.readByte(0xFFFF)).toBe(0x34); // Low byte
    expect(await cpu.readByte(0x0000)).toBe(0x12); // High byte wraps around
  });
  
  // Test for bit 6 of BIT instruction to set overflow flag
  it("should test BIT instruction setting overflow from bit 6", async () => {
    const cpu = createCPU();
    
    // Setup test for BIT instruction
    await cpu.loadByte(0, 0x24); // BIT Zero Page
    await cpu.loadByte(1, 0x20); // Zero page address
    await cpu.loadByte(0x20, 0x40); // Bit 6 is set (overflow flag), bit 7 is clear (negative flag)
    
    await cpu.setAccumulator(0xFF); // A register value (will match with all bits)
    await cpu.clearStatusFlag(OVERFLOW); // Clear overflow flag
    await cpu.clearStatusFlag(NEGATIVE); // Clear negative flag
    await cpu.setProgramCounter(0);
    
    // Execute
    const cycles = await cpu.step();
    
    // Verify
    expect(cycles).toBe(3);
    expect((((await cpu.getState()).p & OVERFLOW) !== 0)).toBe(true); // Overflow should be set from bit 6
    expect((((await cpu.getState()).p & NEGATIVE) !== 0)).toBe(false); // Negative should be clear since bit 7 is clear
    expect((((await cpu.getState()).p & ZERO) !== 0)).toBe(false); // Zero should be clear since A & mem is non-zero
  });
  
  // Test for bit 7 of BIT instruction to set negative flag
  it("should test BIT instruction setting negative from bit 7", async () => {
    const cpu = createCPU();
    
    // Setup test for BIT instruction
    await cpu.loadByte(0, 0x2C); // BIT Absolute
    await cpu.loadByte(1, 0x00); // Low byte of address
    await cpu.loadByte(2, 0x20); // High byte of address (0x2000)
    await cpu.loadByte(0x2000, 0x80); // Bit 7 is set (negative flag), bit 6 is clear (overflow flag)
    
    await cpu.setAccumulator(0xFF); // A register value (will match with all bits)
    await cpu.clearStatusFlag(OVERFLOW); // Clear overflow flag
    await cpu.clearStatusFlag(NEGATIVE); // Clear negative flag
    await cpu.setProgramCounter(0);
    
    // Execute
    const cycles = await cpu.step();
    
    // Verify
    expect(cycles).toBe(4);
    expect((((await cpu.getState()).p & OVERFLOW) !== 0)).toBe(false); // Overflow should be clear since bit 6 is clear
    expect((((await cpu.getState()).p & NEGATIVE) !== 0)).toBe(true); // Negative should be set from bit 7
    expect((((await cpu.getState()).p & ZERO) !== 0)).toBe(false); // Zero should be clear since A & mem is non-zero
  });
  
  // Test for BIT instruction setting zero flag when A & memory is zero
  it("should test BIT instruction setting zero when result is zero", async () => {
    const cpu = createCPU();
    
    // Setup test for BIT instruction
    await cpu.loadByte(0, 0x24); // BIT Zero Page
    await cpu.loadByte(1, 0x20); // Zero page address
    await cpu.loadByte(0x20, 0xF0); // Some value with bits set
    
    await cpu.setAccumulator(0x0F); // A register value (no bits match with mem[0x20])
    await cpu.clearStatusFlag(ZERO); // Clear zero flag
    await cpu.setProgramCounter(0);
    
    // Execute
    const cycles = await cpu.step();
    
    // Verify
    expect(cycles).toBe(3);
    expect((((await cpu.getState()).p & ZERO) !== 0)).toBe(true); // Zero should be set since A & mem = 0
  });
});