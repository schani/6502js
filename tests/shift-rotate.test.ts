import { describe, expect, it } from "bun:test";
import { createCPU, CARRY, ZERO, NEGATIVE } from "./utils";

describe("Shift and rotate instructions", () => {
  it("should perform ASL A instruction", async () => {
    const cpu = createCPU();
    
    // Set up CPU state
    await cpu.setAccumulator(0x41); // 01000001
    
    // Set up memory
    await cpu.loadByte(0, 0x0A); // ASL A
    
    const cycles = await cpu.step();
    
    expect((await cpu.getState()).a).toBe(0x82); // 10000010
    expect(((await cpu.getState()).p & CARRY) === 0).toBe(true); // Bit 7 was 0
    expect(((await cpu.getState()).p & NEGATIVE) !== 0).toBe(true); // Result has bit 7 set
    expect((await cpu.getState()).pc).toBe(1);
    expect(cycles).toBe(2);
    
    // Test with carry out
    await cpu.setProgramCounter(0);
    await cpu.setAccumulator(0x81); // 10000001
    
    await cpu.step();
    
    expect((await cpu.getState()).a).toBe(0x02); // 00000010
    expect(((await cpu.getState()).p & CARRY) !== 0).toBe(true); // Bit 7 was 1
    expect(((await cpu.getState()).p & ZERO) === 0).toBe(true); // Result is not zero
  });
  
  it("should perform ASL zero page instruction", async () => {
    const cpu = createCPU();
    
    // Set up memory
    await cpu.loadByte(0, 0x06); // ASL zero page
    await cpu.loadByte(1, 0x42); // Zero page address
    await cpu.loadByte(0x42, 0x41); // Value to shift
    
    const cycles = await cpu.step();
    
    expect(await cpu.readByte(0x42)).toBe(0x82); // 10000010
    expect(((await cpu.getState()).p & CARRY) === 0).toBe(true); // Bit 7 was 0
    expect(((await cpu.getState()).p & NEGATIVE) !== 0).toBe(true); // Result has bit 7 set
    expect((await cpu.getState()).pc).toBe(2);
    expect(cycles).toBe(5);
  });
  
  it("should perform ASL absolute instruction", async () => {
    const cpu = createCPU();
    
    // Set up memory
    await cpu.loadByte(0, 0x0E); // ASL absolute
    await cpu.loadByte(1, 0x34); // Low byte of address
    await cpu.loadByte(2, 0x12); // High byte of address
    await cpu.loadByte(0x1234, 0x41); // Value to shift
    
    const cycles = await cpu.step();
    
    expect(await cpu.readByte(0x1234)).toBe(0x82); // 10000010
    expect(((await cpu.getState()).p & CARRY) === 0).toBe(true); // Bit 7 was 0
    expect(((await cpu.getState()).p & NEGATIVE) !== 0).toBe(true); // Result has bit 7 set
    expect((await cpu.getState()).pc).toBe(3);
    expect(cycles).toBe(6);
  });
  
  it("should perform LSR A instruction", async () => {
    const cpu = createCPU();
    
    // Set up CPU state
    await cpu.setAccumulator(0x41); // 01000001
    
    // Set up memory
    await cpu.loadByte(0, 0x4A); // LSR A
    
    const cycles = await cpu.step();
    
    expect((await cpu.getState()).a).toBe(0x20); // 00100000
    expect(((await cpu.getState()).p & CARRY) !== 0).toBe(true); // Bit 0 was 1
    expect(((await cpu.getState()).p & NEGATIVE) === 0).toBe(true); // Bit 7 is always cleared
    expect((await cpu.getState()).pc).toBe(1);
    expect(cycles).toBe(2);
    
    // Test with zero result
    await cpu.setProgramCounter(0);
    await cpu.setAccumulator(0x01); // 00000001
    
    await cpu.step();
    
    expect((await cpu.getState()).a).toBe(0x00); // 00000000
    expect(((await cpu.getState()).p & CARRY) !== 0).toBe(true); // Bit 0 was 1
    expect(((await cpu.getState()).p & ZERO) !== 0).toBe(true); // Result is zero
  });
  
  it("should perform LSR zero page instruction", async () => {
    const cpu = createCPU();
    
    // Set up memory
    await cpu.loadByte(0, 0x46); // LSR zero page
    await cpu.loadByte(1, 0x42); // Zero page address
    await cpu.loadByte(0x42, 0x41); // Value to shift
    
    const cycles = await cpu.step();
    
    expect(await cpu.readByte(0x42)).toBe(0x20); // 00100000
    expect(((await cpu.getState()).p & CARRY) !== 0).toBe(true); // Bit 0 was 1
    expect(((await cpu.getState()).p & NEGATIVE) === 0).toBe(true); // Bit 7 is always cleared
    expect((await cpu.getState()).pc).toBe(2);
    expect(cycles).toBe(5);
  });
  
  it("should perform LSR absolute instruction", async () => {
    const cpu = createCPU();
    
    // Set up memory
    await cpu.loadByte(0, 0x4E); // LSR absolute
    await cpu.loadByte(1, 0x34); // Low byte of address
    await cpu.loadByte(2, 0x12); // High byte of address
    await cpu.loadByte(0x1234, 0x41); // Value to shift
    
    const cycles = await cpu.step();
    
    expect(await cpu.readByte(0x1234)).toBe(0x20); // 00100000
    expect(((await cpu.getState()).p & CARRY) !== 0).toBe(true); // Bit 0 was 1
    expect(((await cpu.getState()).p & NEGATIVE) === 0).toBe(true); // Bit 7 is always cleared
    expect((await cpu.getState()).pc).toBe(3);
    expect(cycles).toBe(6);
  });
  
  it("should perform ROL A instruction", async () => {
    const cpu = createCPU();
    
    // Set up CPU state
    await cpu.setAccumulator(0x41); // 01000001
    await cpu.clearStatusFlag(CARRY); // Clear carry flag
    
    // Set up memory
    await cpu.loadByte(0, 0x2A); // ROL A
    
    const cycles = await cpu.step();
    
    expect((await cpu.getState()).a).toBe(0x82); // 10000010
    expect(((await cpu.getState()).p & CARRY) === 0).toBe(true); // Old bit 7 was 0
    expect(((await cpu.getState()).p & NEGATIVE) !== 0).toBe(true); // Result has bit 7 set
    expect((await cpu.getState()).pc).toBe(1);
    expect(cycles).toBe(2);
    
    // Test with carry in and out
    await cpu.setProgramCounter(0);
    await cpu.setAccumulator(0x81); // 10000001
    await cpu.setStatusFlag(CARRY); // Set carry flag
    
    await cpu.step();
    
    expect((await cpu.getState()).a).toBe(0x03); // 00000011 (carry in becomes bit 0)
    expect(((await cpu.getState()).p & CARRY) !== 0).toBe(true); // Old bit 7 was 1
    expect(((await cpu.getState()).p & ZERO) === 0).toBe(true); // Result is not zero
  });
  
  it("should perform ROL zero page instruction", async () => {
    const cpu = createCPU();
    
    // Set up CPU state
    await cpu.clearStatusFlag(CARRY); // Clear carry flag
    
    // Set up memory
    await cpu.loadByte(0, 0x26); // ROL zero page
    await cpu.loadByte(1, 0x42); // Zero page address
    await cpu.loadByte(0x42, 0x41); // Value to rotate
    
    const cycles = await cpu.step();
    
    expect(await cpu.readByte(0x42)).toBe(0x82); // 10000010
    expect(((await cpu.getState()).p & CARRY) === 0).toBe(true); // Old bit 7 was 0
    expect(((await cpu.getState()).p & NEGATIVE) !== 0).toBe(true); // Result has bit 7 set
    expect((await cpu.getState()).pc).toBe(2);
    expect(cycles).toBe(5);
  });
  
  it("should perform ROL absolute instruction", async () => {
    const cpu = createCPU();
    
    // Set up CPU state
    await cpu.clearStatusFlag(CARRY); // Clear carry flag
    
    // Set up memory
    await cpu.loadByte(0, 0x2E); // ROL absolute
    await cpu.loadByte(1, 0x34); // Low byte of address
    await cpu.loadByte(2, 0x12); // High byte of address
    await cpu.loadByte(0x1234, 0x41); // Value to rotate
    
    const cycles = await cpu.step();
    
    expect(await cpu.readByte(0x1234)).toBe(0x82); // 10000010
    expect(((await cpu.getState()).p & CARRY) === 0).toBe(true); // Old bit 7 was 0
    expect(((await cpu.getState()).p & NEGATIVE) !== 0).toBe(true); // Result has bit 7 set
    expect((await cpu.getState()).pc).toBe(3);
    expect(cycles).toBe(6);
  });
  
  it("should perform ROR A instruction", async () => {
    const cpu = createCPU();
    
    // Set up CPU state
    await cpu.setAccumulator(0x41); // 01000001
    await cpu.clearStatusFlag(CARRY); // Clear carry flag
    
    // Set up memory
    await cpu.loadByte(0, 0x6A); // ROR A
    
    const cycles = await cpu.step();
    
    expect((await cpu.getState()).a).toBe(0x20); // 00100000
    expect(((await cpu.getState()).p & CARRY) !== 0).toBe(true); // Old bit 0 was 1
    expect(((await cpu.getState()).p & NEGATIVE) === 0).toBe(true); // Result has bit 7 clear
    expect((await cpu.getState()).pc).toBe(1);
    expect(cycles).toBe(2);
    
    // Test with carry in
    await cpu.setProgramCounter(0);
    await cpu.setAccumulator(0x01); // 00000001
    await cpu.setStatusFlag(CARRY); // Set carry flag
    
    await cpu.step();
    
    expect((await cpu.getState()).a).toBe(0x80); // 10000000 (carry in becomes bit 7)
    expect(((await cpu.getState()).p & CARRY) !== 0).toBe(true); // Old bit 0 was 1
    expect(((await cpu.getState()).p & NEGATIVE) !== 0).toBe(true); // Result has bit 7 set
  });
  
  it("should perform ROR zero page instruction", async () => {
    const cpu = createCPU();
    
    // Set up CPU state
    await cpu.clearStatusFlag(CARRY); // Clear carry flag
    
    // Set up memory
    await cpu.loadByte(0, 0x66); // ROR zero page
    await cpu.loadByte(1, 0x42); // Zero page address
    await cpu.loadByte(0x42, 0x41); // Value to rotate
    
    const cycles = await cpu.step();
    
    expect(await cpu.readByte(0x42)).toBe(0x20); // 00100000
    expect(((await cpu.getState()).p & CARRY) !== 0).toBe(true); // Old bit 0 was 1
    expect(((await cpu.getState()).p & NEGATIVE) === 0).toBe(true); // Result has bit 7 clear
    expect((await cpu.getState()).pc).toBe(2);
    expect(cycles).toBe(5);
  });
  
  it("should perform ROR absolute instruction", async () => {
    const cpu = createCPU();
    
    // Set up CPU state
    await cpu.clearStatusFlag(CARRY); // Clear carry flag
    
    // Set up memory
    await cpu.loadByte(0, 0x6E); // ROR absolute
    await cpu.loadByte(1, 0x34); // Low byte of address
    await cpu.loadByte(2, 0x12); // High byte of address
    await cpu.loadByte(0x1234, 0x41); // Value to rotate
    
    const cycles = await cpu.step();
    
    expect(await cpu.readByte(0x1234)).toBe(0x20); // 00100000
    expect(((await cpu.getState()).p & CARRY) !== 0).toBe(true); // Old bit 0 was 1
    expect(((await cpu.getState()).p & NEGATIVE) === 0).toBe(true); // Result has bit 7 clear
    expect((await cpu.getState()).pc).toBe(3);
    expect(cycles).toBe(6);
  });
  
  it("should handle ASL with zero result", async () => {
    const cpu = createCPU();
    
    // Set up CPU state
    await cpu.setAccumulator(0x80); // 10000000
    
    // Set up memory
    await cpu.loadByte(0, 0x0A); // ASL A
    
    const cycles = await cpu.step();
    
    expect((await cpu.getState()).a).toBe(0x00); // 00000000
    expect(((await cpu.getState()).p & CARRY) !== 0).toBe(true); // Bit 7 was 1
    expect(((await cpu.getState()).p & ZERO) !== 0).toBe(true); // Result is zero
    expect(((await cpu.getState()).p & NEGATIVE) === 0).toBe(true); // Result is not negative
    expect((await cpu.getState()).pc).toBe(1);
    expect(cycles).toBe(2);
  });
});
