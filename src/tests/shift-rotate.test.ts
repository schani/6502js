import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createCPU, CARRY, ZERO, NEGATIVE } from "./utils.ts";

describe("Shift and rotate instructions", () => {
  it("should perform ASL A instruction", async () => {
    const cpu = createCPU();
    
    // Set up CPU state
    await cpu.setAccumulator(0x41); // 01000001
    
    // Set up memory
    await cpu.loadByte(0, 0x0A); // ASL A
    
    await cpu.step();
    
    assert.strictEqual((await cpu.getState()).a, 0x82); // 10000010
    assert.strictEqual(((await cpu.getState()).p & CARRY) === 0, true); // Bit 7 was 0
    assert.strictEqual(((await cpu.getState()).p & NEGATIVE) !== 0, true); // Result has bit 7 set
    assert.strictEqual((await cpu.getState()).pc, 1);
    
    await cpu.setProgramCounter(0);
    await cpu.setAccumulator(0x81); // 10000001
    
    await cpu.step();
    
    assert.strictEqual((await cpu.getState()).a, 0x02); // 00000010
    assert.strictEqual(((await cpu.getState()).p & CARRY) !== 0, true); // Bit 7 was 1
    assert.strictEqual(((await cpu.getState()).p & ZERO) === 0, true); // Result is not zero
  });
  
  it("should perform ASL zero page instruction", async () => {
    const cpu = createCPU();
    
    // Set up memory
    await cpu.loadByte(0, 0x06); // ASL zero page
    await cpu.loadByte(1, 0x42); // Zero page address
    await cpu.loadByte(0x42, 0x41); // Value to shift
    
    await cpu.step();
    
    assert.strictEqual(await cpu.readByte(0x42), 0x82); // 10000010
    assert.strictEqual(((await cpu.getState()).p & CARRY) === 0, true); // Bit 7 was 0
    assert.strictEqual(((await cpu.getState()).p & NEGATIVE) !== 0, true); // Result has bit 7 set
    assert.strictEqual((await cpu.getState()).pc, 2);
    
  });
  
  it("should perform ASL absolute instruction", async () => {
    const cpu = createCPU();
    
    // Set up memory
    await cpu.loadByte(0, 0x0E); // ASL absolute
    await cpu.loadByte(1, 0x34); // Low byte of address
    await cpu.loadByte(2, 0x12); // High byte of address
    await cpu.loadByte(0x1234, 0x41); // Value to shift
    
    await cpu.step();
    
    assert.strictEqual(await cpu.readByte(0x1234), 0x82); // 10000010
    assert.strictEqual(((await cpu.getState()).p & CARRY) === 0, true); // Bit 7 was 0
    assert.strictEqual(((await cpu.getState()).p & NEGATIVE) !== 0, true); // Result has bit 7 set
    assert.strictEqual((await cpu.getState()).pc, 3);
    
  });
  
  it("should perform LSR A instruction", async () => {
    const cpu = createCPU();
    
    // Set up CPU state
    await cpu.setAccumulator(0x41); // 01000001
    
    // Set up memory
    await cpu.loadByte(0, 0x4A); // LSR A
    
    await cpu.step();
    
    assert.strictEqual((await cpu.getState()).a, 0x20); // 00100000
    assert.strictEqual(((await cpu.getState()).p & CARRY) !== 0, true); // Bit 0 was 1
    assert.strictEqual(((await cpu.getState()).p & NEGATIVE) === 0, true); // Bit 7 is always cleared
    assert.strictEqual((await cpu.getState()).pc, 1);
    
    await cpu.setProgramCounter(0);
    await cpu.setAccumulator(0x01); // 00000001
    
    await cpu.step();
    
    assert.strictEqual((await cpu.getState()).a, 0x00); // 00000000
    assert.strictEqual(((await cpu.getState()).p & CARRY) !== 0, true); // Bit 0 was 1
    assert.strictEqual(((await cpu.getState()).p & ZERO) !== 0, true); // Result is zero
  });
  
  it("should perform LSR zero page instruction", async () => {
    const cpu = createCPU();
    
    // Set up memory
    await cpu.loadByte(0, 0x46); // LSR zero page
    await cpu.loadByte(1, 0x42); // Zero page address
    await cpu.loadByte(0x42, 0x41); // Value to shift
    
    await cpu.step();
    
    assert.strictEqual(await cpu.readByte(0x42), 0x20); // 00100000
    assert.strictEqual(((await cpu.getState()).p & CARRY) !== 0, true); // Bit 0 was 1
    assert.strictEqual(((await cpu.getState()).p & NEGATIVE) === 0, true); // Bit 7 is always cleared
    assert.strictEqual((await cpu.getState()).pc, 2);
    
  });
  
  it("should perform LSR absolute instruction", async () => {
    const cpu = createCPU();
    
    // Set up memory
    await cpu.loadByte(0, 0x4E); // LSR absolute
    await cpu.loadByte(1, 0x34); // Low byte of address
    await cpu.loadByte(2, 0x12); // High byte of address
    await cpu.loadByte(0x1234, 0x41); // Value to shift
    
    await cpu.step();
    
    assert.strictEqual(await cpu.readByte(0x1234), 0x20); // 00100000
    assert.strictEqual(((await cpu.getState()).p & CARRY) !== 0, true); // Bit 0 was 1
    assert.strictEqual(((await cpu.getState()).p & NEGATIVE) === 0, true); // Bit 7 is always cleared
    assert.strictEqual((await cpu.getState()).pc, 3);
    
  });
  
  it("should perform ROL A instruction", async () => {
    const cpu = createCPU();
    
    // Set up CPU state
    await cpu.setAccumulator(0x41); // 01000001
    await cpu.clearStatusFlag(CARRY); // Clear carry flag
    
    // Set up memory
    await cpu.loadByte(0, 0x2A); // ROL A
    
    await cpu.step();
    
    assert.strictEqual((await cpu.getState()).a, 0x82); // 10000010
    assert.strictEqual(((await cpu.getState()).p & CARRY) === 0, true); // Old bit 7 was 0
    assert.strictEqual(((await cpu.getState()).p & NEGATIVE) !== 0, true); // Result has bit 7 set
    assert.strictEqual((await cpu.getState()).pc, 1);
    
    await cpu.setProgramCounter(0);
    await cpu.setAccumulator(0x81); // 10000001
    await cpu.setStatusFlag(CARRY); // Set carry flag
    
    await cpu.step();
    
    assert.strictEqual((await cpu.getState()).a, 0x03); // 00000011 (carry in becomes bit 0)
    assert.strictEqual(((await cpu.getState()).p & CARRY) !== 0, true); // Old bit 7 was 1
    assert.strictEqual(((await cpu.getState()).p & ZERO) === 0, true); // Result is not zero
  });
  
  it("should perform ROL zero page instruction", async () => {
    const cpu = createCPU();
    
    // Set up CPU state
    await cpu.clearStatusFlag(CARRY); // Clear carry flag
    
    // Set up memory
    await cpu.loadByte(0, 0x26); // ROL zero page
    await cpu.loadByte(1, 0x42); // Zero page address
    await cpu.loadByte(0x42, 0x41); // Value to rotate
    
    await cpu.step();
    
    assert.strictEqual(await cpu.readByte(0x42), 0x82); // 10000010
    assert.strictEqual(((await cpu.getState()).p & CARRY) === 0, true); // Old bit 7 was 0
    assert.strictEqual(((await cpu.getState()).p & NEGATIVE) !== 0, true); // Result has bit 7 set
    assert.strictEqual((await cpu.getState()).pc, 2);
    
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
    
    await cpu.step();
    
    assert.strictEqual(await cpu.readByte(0x1234), 0x82); // 10000010
    assert.strictEqual(((await cpu.getState()).p & CARRY) === 0, true); // Old bit 7 was 0
    assert.strictEqual(((await cpu.getState()).p & NEGATIVE) !== 0, true); // Result has bit 7 set
    assert.strictEqual((await cpu.getState()).pc, 3);
    
  });
  
  it("should perform ROR A instruction", async () => {
    const cpu = createCPU();
    
    // Set up CPU state
    await cpu.setAccumulator(0x41); // 01000001
    await cpu.clearStatusFlag(CARRY); // Clear carry flag
    
    // Set up memory
    await cpu.loadByte(0, 0x6A); // ROR A
    
    await cpu.step();
    
    assert.strictEqual((await cpu.getState()).a, 0x20); // 00100000
    assert.strictEqual(((await cpu.getState()).p & CARRY) !== 0, true); // Old bit 0 was 1
    assert.strictEqual(((await cpu.getState()).p & NEGATIVE) === 0, true); // Result has bit 7 clear
    assert.strictEqual((await cpu.getState()).pc, 1);
    
    await cpu.setProgramCounter(0);
    await cpu.setAccumulator(0x01); // 00000001
    await cpu.setStatusFlag(CARRY); // Set carry flag
    
    await cpu.step();
    
    assert.strictEqual((await cpu.getState()).a, 0x80); // 10000000 (carry in becomes bit 7)
    assert.strictEqual(((await cpu.getState()).p & CARRY) !== 0, true); // Old bit 0 was 1
    assert.strictEqual(((await cpu.getState()).p & NEGATIVE) !== 0, true); // Result has bit 7 set
  });
  
  it("should perform ROR zero page instruction", async () => {
    const cpu = createCPU();
    
    // Set up CPU state
    await cpu.clearStatusFlag(CARRY); // Clear carry flag
    
    // Set up memory
    await cpu.loadByte(0, 0x66); // ROR zero page
    await cpu.loadByte(1, 0x42); // Zero page address
    await cpu.loadByte(0x42, 0x41); // Value to rotate
    
    await cpu.step();
    
    assert.strictEqual(await cpu.readByte(0x42), 0x20); // 00100000
    assert.strictEqual(((await cpu.getState()).p & CARRY) !== 0, true); // Old bit 0 was 1
    assert.strictEqual(((await cpu.getState()).p & NEGATIVE) === 0, true); // Result has bit 7 clear
    assert.strictEqual((await cpu.getState()).pc, 2);
    
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
    
    await cpu.step();
    
    assert.strictEqual(await cpu.readByte(0x1234), 0x20); // 00100000
    assert.strictEqual(((await cpu.getState()).p & CARRY) !== 0, true); // Old bit 0 was 1
    assert.strictEqual(((await cpu.getState()).p & NEGATIVE) === 0, true); // Result has bit 7 clear
    assert.strictEqual((await cpu.getState()).pc, 3);
    
  });
  
  it("should handle ASL with zero result", async () => {
    const cpu = createCPU();
    
    // Set up CPU state
    await cpu.setAccumulator(0x80); // 10000000
    
    // Set up memory
    await cpu.loadByte(0, 0x0A); // ASL A
    
    await cpu.step();
    
    assert.strictEqual((await cpu.getState()).a, 0x00); // 00000000
    assert.strictEqual(((await cpu.getState()).p & CARRY) !== 0, true); // Bit 7 was 1
    assert.strictEqual(((await cpu.getState()).p & ZERO) !== 0, true); // Result is zero
    assert.strictEqual(((await cpu.getState()).p & NEGATIVE) === 0, true); // Result is not negative
    assert.strictEqual((await cpu.getState()).pc, 1);
    
  });
});
