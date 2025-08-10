import { describe, expect, it } from "bun:test";
import { CARRY, ZERO, INTERRUPT, DECIMAL, BREAK, UNUSED, OVERFLOW, NEGATIVE } from "../6502";
import { createCPU } from "./utils";

describe("ADC and SBC with different addressing modes", async () => {
  // Test ADC with all addressing modes
  it("should perform ADC with zero page addressing", async () => {
    const cpu = createCPU();
    
    // Setup
    await cpu.loadByte(0, 0x65); // ADC Zero Page
    await cpu.loadByte(1, 0x80); // Zero page address
    await cpu.loadByte(0x80, 0x42); // Value at zero page address
    
    await cpu.setAccumulator(0x10); // Initial value in A
    await cpu.clearStatusFlag(CARRY); // Clear carry flag
    await cpu.setProgramCounter(0);
    
    // Execute
    const cycles = await cpu.step();
    
    // Verify
    expect(cycles).toBe(3);
    expect(await cpu.getAccumulator()).toBe(0x52); // 0x10 + 0x42 = 0x52
    expect((((await cpu.getState()).p & CARRY) !== 0)).toBe(false); // No carry out
    expect((((await cpu.getState()).p & ZERO) !== 0)).toBe(false); // Result is not zero
    expect((((await cpu.getState()).p & OVERFLOW) !== 0)).toBe(false); // No signed overflow
    expect((((await cpu.getState()).p & NEGATIVE) !== 0)).toBe(false); // Result is positive
  });
  
  it("should perform ADC with zero page,X addressing", async () => {
    const cpu = createCPU();
    
    // Setup
    await cpu.loadByte(0, 0x75); // ADC Zero Page,X
    await cpu.loadByte(1, 0x80); // Zero page address
    await cpu.loadByte(0x90, 0x42); // Value at 0x80 + 0x10 (with zero page wrap-around)
    
    await cpu.setAccumulator(0x10); // Initial value in A
    await cpu.setXRegister(0x10); // X offset
    cpu.setStatusFlag(CARRY); // Set carry flag
    await cpu.setProgramCounter(0);
    
    // Execute
    const cycles = await cpu.step();
    
    // Verify
    expect(cycles).toBe(4);
    expect(await cpu.getAccumulator()).toBe(0x53); // 0x10 + 0x42 + 0x01 (carry) = 0x53
    expect((((await cpu.getState()).p & CARRY) !== 0)).toBe(false); // No carry out
    expect((((await cpu.getState()).p & ZERO) !== 0)).toBe(false); // Result is not zero
    expect((((await cpu.getState()).p & OVERFLOW) !== 0)).toBe(false); // No signed overflow
    expect((((await cpu.getState()).p & NEGATIVE) !== 0)).toBe(false); // Result is positive
  });
  
  it("should perform ADC with absolute addressing", async () => {
    const cpu = createCPU();
    
    // Setup
    await cpu.loadByte(0, 0x6D); // ADC Absolute
    await cpu.loadByte(1, 0x00); // Low byte of address
    await cpu.loadByte(2, 0x20); // High byte of address (0x2000)
    await cpu.loadByte(0x2000, 0xD0); // Value at absolute address
    
    await cpu.setAccumulator(0x10); // Initial value in A
    await cpu.clearStatusFlag(CARRY); // Clear carry flag
    await cpu.setProgramCounter(0);
    
    // Execute
    const cycles = await cpu.step();
    
    // Verify
    expect(cycles).toBe(4);
    expect(await cpu.getAccumulator()).toBe(0xE0); // 0x10 + 0xD0 = 0xE0
    expect((((await cpu.getState()).p & CARRY) !== 0)).toBe(false); // No carry out
    expect((((await cpu.getState()).p & ZERO) !== 0)).toBe(false); // Result is not zero
    expect((((await cpu.getState()).p & OVERFLOW) !== 0)).toBe(false); // No signed overflow
    expect((((await cpu.getState()).p & NEGATIVE) !== 0)).toBe(true); // Result is negative (bit 7 set)
  });
  
  it("should perform ADC with absolute,X addressing", async () => {
    const cpu = createCPU();
    
    // Setup
    await cpu.loadByte(0, 0x7D); // ADC Absolute,X
    await cpu.loadByte(1, 0x00); // Low byte of address
    await cpu.loadByte(2, 0x20); // High byte of address (0x2000)
    await cpu.loadByte(0x2010, 0x40); // Value at 0x2000 + 0x10 = 0x2010
    
    await cpu.setAccumulator(0x10); // Initial value in A
    await cpu.setXRegister(0x10); // X offset
    await cpu.clearStatusFlag(CARRY); // Clear carry flag
    await cpu.setProgramCounter(0);
    
    // Execute
    const cycles = await cpu.step();
    
    // Verify
    expect(cycles).toBe(4); // No page boundary crossed
    expect(await cpu.getAccumulator()).toBe(0x50); // 0x10 + 0x40 = 0x50
    expect((((await cpu.getState()).p & CARRY) !== 0)).toBe(false); // No carry out
  });
  
  it("should perform ADC with absolute,X addressing and page crossing", async () => {
    const cpu = createCPU();
    
    // Setup
    await cpu.loadByte(0, 0x7D); // ADC Absolute,X
    await cpu.loadByte(1, 0xF0); // Low byte of address
    await cpu.loadByte(2, 0x20); // High byte of address (0x20F0)
    await cpu.loadByte(0x2100, 0x40); // Value at 0x20F0 + 0x10 = 0x2100 (page boundary crossed)
    
    await cpu.setAccumulator(0x10); // Initial value in A
    await cpu.setXRegister(0x10); // X offset
    await cpu.clearStatusFlag(CARRY); // Clear carry flag
    await cpu.setProgramCounter(0);
    
    // Execute
    const cycles = await cpu.step();
    
    // Verify
    expect(cycles).toBe(5); // +1 cycle for page boundary crossing
    expect(await cpu.getAccumulator()).toBe(0x50); // 0x10 + 0x40 = 0x50
  });
  
  it("should perform ADC with absolute,Y addressing", async () => {
    const cpu = createCPU();
    
    // Setup
    await cpu.loadByte(0, 0x79); // ADC Absolute,Y
    await cpu.loadByte(1, 0x00); // Low byte of address
    await cpu.loadByte(2, 0x20); // High byte of address (0x2000)
    await cpu.loadByte(0x2010, 0x70); // Value at 0x2000 + 0x10 = 0x2010
    
    await cpu.setAccumulator(0x10); // Initial value in A
    await cpu.setYRegister(0x10); // Y offset
    await cpu.clearStatusFlag(CARRY); // Clear carry flag
    await cpu.setProgramCounter(0);
    
    // Execute
    const cycles = await cpu.step();
    
    // Verify
    expect(cycles).toBe(4); // No page boundary crossed
    expect(await cpu.getAccumulator()).toBe(0x80); // 0x10 + 0x70 = 0x80
    expect((((await cpu.getState()).p & NEGATIVE) !== 0)).toBe(true); // Result is negative (bit 7 set)
  });
  
  it("should perform ADC with (Indirect,X) addressing", async () => {
    const cpu = createCPU();
    
    // Setup
    await cpu.loadByte(0, 0x61); // ADC (Indirect,X)
    await cpu.loadByte(1, 0x80); // Zero page address
    await cpu.loadByte(0x90, 0x00); // Low byte of effective address (0x80 + 0x10 = 0x90)
    await cpu.loadByte(0x91, 0x20); // High byte of effective address (0x2000)
    await cpu.loadByte(0x2000, 0x35); // Value at effective address
    
    await cpu.setAccumulator(0x10); // Initial value in A
    await cpu.setXRegister(0x10); // X offset
    await cpu.clearStatusFlag(CARRY); // Clear carry flag
    await cpu.setProgramCounter(0);
    
    // Execute
    const cycles = await cpu.step();
    
    // Verify
    expect(cycles).toBe(6);
    expect(await cpu.getAccumulator()).toBe(0x45); // 0x10 + 0x35 = 0x45
  });
  
  it("should perform ADC with (Indirect),Y addressing", async () => {
    const cpu = createCPU();
    
    // Setup
    await cpu.loadByte(0, 0x71); // ADC (Indirect),Y
    await cpu.loadByte(1, 0x80); // Zero page address
    await cpu.loadByte(0x80, 0x00); // Low byte of indirect address
    await cpu.loadByte(0x81, 0x20); // High byte of indirect address (0x2000)
    await cpu.loadByte(0x2010, 0x25); // Value at 0x2000 + 0x10 = 0x2010
    
    await cpu.setAccumulator(0x10); // Initial value in A
    await cpu.setYRegister(0x10); // Y offset
    await cpu.clearStatusFlag(CARRY); // Clear carry flag
    await cpu.setProgramCounter(0);
    
    // Execute
    const cycles = await cpu.step();
    
    // Verify
    expect(cycles).toBe(5); // No page boundary crossed
    expect(await cpu.getAccumulator()).toBe(0x35); // 0x10 + 0x25 = 0x35
  });
  
  it("should perform ADC with (Indirect),Y addressing and page crossing", async () => {
    const cpu = createCPU();
    
    // Setup
    await cpu.loadByte(0, 0x71); // ADC (Indirect),Y
    await cpu.loadByte(1, 0x80); // Zero page address
    await cpu.loadByte(0x80, 0xF0); // Low byte of indirect address
    await cpu.loadByte(0x81, 0x20); // High byte of indirect address (0x20F0)
    await cpu.loadByte(0x2100, 0x25); // Value at 0x20F0 + 0x10 = 0x2100 (page boundary crossed)
    
    await cpu.setAccumulator(0x10); // Initial value in A
    await cpu.setYRegister(0x10); // Y offset
    await cpu.clearStatusFlag(CARRY); // Clear carry flag
    await cpu.setProgramCounter(0);
    
    // Execute
    const cycles = await cpu.step();
    
    // Verify
    expect(cycles).toBe(6); // +1 cycle for page boundary crossing
    expect(await cpu.getAccumulator()).toBe(0x35); // 0x10 + 0x25 = 0x35
  });
  
  // Test SBC with all addressing modes
  it("should perform SBC with zero page addressing", async () => {
    const cpu = createCPU();
    
    // Setup
    await cpu.loadByte(0, 0xE5); // SBC Zero Page
    await cpu.loadByte(1, 0x80); // Zero page address
    await cpu.loadByte(0x80, 0x20); // Value at zero page address
    
    await cpu.setAccumulator(0x50); // Initial value in A
    cpu.setStatusFlag(CARRY); // Set carry flag (no borrow)
    await cpu.setProgramCounter(0);
    
    // Execute
    const cycles = await cpu.step();
    
    // Verify
    expect(cycles).toBe(3);
    expect(await cpu.getAccumulator()).toBe(0x30); // 0x50 - 0x20 = 0x30
    expect((((await cpu.getState()).p & CARRY) !== 0)).toBe(true); // No borrow (carry set)
    expect((((await cpu.getState()).p & ZERO) !== 0)).toBe(false); // Result is not zero
    expect((((await cpu.getState()).p & OVERFLOW) !== 0)).toBe(false); // No signed overflow
    expect((((await cpu.getState()).p & NEGATIVE) !== 0)).toBe(false); // Result is positive
  });
  
  it("should perform SBC with zero page,X addressing", async () => {
    const cpu = createCPU();
    
    // Setup
    await cpu.loadByte(0, 0xF5); // SBC Zero Page,X
    await cpu.loadByte(1, 0x80); // Zero page address
    await cpu.loadByte(0x90, 0x20); // Value at 0x80 + 0x10 (with zero page wrap-around)
    
    await cpu.setAccumulator(0x50); // Initial value in A
    await cpu.setXRegister(0x10); // X offset
    await cpu.clearStatusFlag(CARRY); // Clear carry flag (borrow)
    await cpu.setProgramCounter(0);
    
    // Execute
    const cycles = await cpu.step();
    
    // Verify
    expect(cycles).toBe(4);
    expect(await cpu.getAccumulator()).toBe(0x2F); // 0x50 - 0x20 - 0x01 (borrow) = 0x2F
    expect((((await cpu.getState()).p & CARRY) !== 0)).toBe(true); // No borrow out (carry set after operation)
  });
  
  it("should perform SBC with absolute addressing", async () => {
    const cpu = createCPU();
    
    // Setup
    await cpu.loadByte(0, 0xED); // SBC Absolute
    await cpu.loadByte(1, 0x00); // Low byte of address
    await cpu.loadByte(2, 0x20); // High byte of address (0x2000)
    await cpu.loadByte(0x2000, 0x60); // Value at absolute address
    
    await cpu.setAccumulator(0x40); // Initial value in A
    cpu.setStatusFlag(CARRY); // Set carry flag (no borrow)
    await cpu.setProgramCounter(0);
    
    // Execute
    const cycles = await cpu.step();
    
    // Verify
    expect(cycles).toBe(4);
    expect(await cpu.getAccumulator()).toBe(0xE0); // 0x40 - 0x60 = 0xE0
    expect((((await cpu.getState()).p & CARRY) !== 0)).toBe(false); // Borrow out (carry clear)
    expect((((await cpu.getState()).p & NEGATIVE) !== 0)).toBe(true); // Result is negative
  });
  
  it("should perform SBC with absolute,X addressing", async () => {
    const cpu = createCPU();
    
    // Setup
    await cpu.loadByte(0, 0xFD); // SBC Absolute,X
    await cpu.loadByte(1, 0x00); // Low byte of address
    await cpu.loadByte(2, 0x20); // High byte of address (0x2000)
    await cpu.loadByte(0x2010, 0x20); // Value at 0x2000 + 0x10 = 0x2010
    
    await cpu.setAccumulator(0x50); // Initial value in A
    await cpu.setXRegister(0x10); // X offset
    cpu.setStatusFlag(CARRY); // Set carry flag (no borrow)
    await cpu.setProgramCounter(0);
    
    // Execute
    const cycles = await cpu.step();
    
    // Verify
    expect(cycles).toBe(4); // No page boundary crossed
    expect(await cpu.getAccumulator()).toBe(0x30); // 0x50 - 0x20 = 0x30
    expect((((await cpu.getState()).p & CARRY) !== 0)).toBe(true); // No borrow out (carry set)
  });
  
  it("should perform SBC with absolute,X addressing and page crossing", async () => {
    const cpu = createCPU();
    
    // Setup
    await cpu.loadByte(0, 0xFD); // SBC Absolute,X
    await cpu.loadByte(1, 0xF0); // Low byte of address
    await cpu.loadByte(2, 0x20); // High byte of address (0x20F0)
    await cpu.loadByte(0x2100, 0x20); // Value at 0x20F0 + 0x10 = 0x2100 (page boundary crossed)
    
    await cpu.setAccumulator(0x50); // Initial value in A
    await cpu.setXRegister(0x10); // X offset
    cpu.setStatusFlag(CARRY); // Set carry flag (no borrow)
    await cpu.setProgramCounter(0);
    
    // Execute
    const cycles = await cpu.step();
    
    // Verify
    expect(cycles).toBe(5); // +1 cycle for page boundary crossing
    expect(await cpu.getAccumulator()).toBe(0x30); // 0x50 - 0x20 = 0x30
  });
  
  it("should perform SBC with absolute,Y addressing", async () => {
    const cpu = createCPU();
    
    // Setup
    await cpu.loadByte(0, 0xF9); // SBC Absolute,Y
    await cpu.loadByte(1, 0x00); // Low byte of address
    await cpu.loadByte(2, 0x20); // High byte of address (0x2000)
    await cpu.loadByte(0x2010, 0x20); // Value at 0x2000 + 0x10 = 0x2010
    
    await cpu.setAccumulator(0x50); // Initial value in A
    await cpu.setYRegister(0x10); // Y offset
    cpu.setStatusFlag(CARRY); // Set carry flag (no borrow)
    await cpu.setProgramCounter(0);
    
    // Execute
    const cycles = await cpu.step();
    
    // Verify
    expect(cycles).toBe(4); // No page boundary crossed
    expect(await cpu.getAccumulator()).toBe(0x30); // 0x50 - 0x20 = 0x30
  });
  
  it("should perform SBC with (Indirect,X) addressing", async () => {
    const cpu = createCPU();
    
    // Setup
    await cpu.loadByte(0, 0xE1); // SBC (Indirect,X)
    await cpu.loadByte(1, 0x80); // Zero page address
    await cpu.loadByte(0x90, 0x00); // Low byte of effective address (0x80 + 0x10 = 0x90)
    await cpu.loadByte(0x91, 0x20); // High byte of effective address (0x2000)
    await cpu.loadByte(0x2000, 0x25); // Value at effective address
    
    await cpu.setAccumulator(0x50); // Initial value in A
    await cpu.setXRegister(0x10); // X offset
    cpu.setStatusFlag(CARRY); // Set carry flag (no borrow)
    await cpu.setProgramCounter(0);
    
    // Execute
    const cycles = await cpu.step();
    
    // Verify
    expect(cycles).toBe(6);
    expect(await cpu.getAccumulator()).toBe(0x2B); // 0x50 - 0x25 = 0x2B
    expect((((await cpu.getState()).p & CARRY) !== 0)).toBe(true); // No borrow out (carry set)
  });
  
  it("should perform SBC with (Indirect),Y addressing", async () => {
    const cpu = createCPU();
    
    // Setup
    await cpu.loadByte(0, 0xF1); // SBC (Indirect),Y
    await cpu.loadByte(1, 0x80); // Zero page address
    await cpu.loadByte(0x80, 0x00); // Low byte of indirect address
    await cpu.loadByte(0x81, 0x20); // High byte of indirect address (0x2000)
    await cpu.loadByte(0x2010, 0x10); // Value at 0x2000 + 0x10 = 0x2010
    
    await cpu.setAccumulator(0x50); // Initial value in A
    await cpu.setYRegister(0x10); // Y offset
    cpu.setStatusFlag(CARRY); // Set carry flag (no borrow)
    await cpu.setProgramCounter(0);
    
    // Execute
    const cycles = await cpu.step();
    
    // Verify
    expect(cycles).toBe(5); // No page boundary crossed
    expect(await cpu.getAccumulator()).toBe(0x40); // 0x50 - 0x10 = 0x40
  });
  
  it("should perform SBC with (Indirect),Y addressing and page crossing", async () => {
    const cpu = createCPU();
    
    // Setup
    await cpu.loadByte(0, 0xF1); // SBC (Indirect),Y
    await cpu.loadByte(1, 0x80); // Zero page address
    await cpu.loadByte(0x80, 0xF0); // Low byte of indirect address
    await cpu.loadByte(0x81, 0x20); // High byte of indirect address (0x20F0)
    await cpu.loadByte(0x2100, 0x10); // Value at 0x20F0 + 0x10 = 0x2100 (page boundary crossed)
    
    await cpu.setAccumulator(0x50); // Initial value in A
    await cpu.setYRegister(0x10); // Y offset
    cpu.setStatusFlag(CARRY); // Set carry flag (no borrow)
    await cpu.setProgramCounter(0);
    
    // Execute
    const cycles = await cpu.step();
    
    // Verify
    expect(cycles).toBe(6); // +1 cycle for page boundary crossing
    expect(await cpu.getAccumulator()).toBe(0x40); // 0x50 - 0x10 = 0x40
  });
});