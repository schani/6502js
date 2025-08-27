import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { type CPU, createCPU, ZERO, NEGATIVE, getStatusRegister } from "./utils.ts";

describe("INC and DEC with all addressing modes", async () => {
  it("should perform INC with Zero Page,X addressing", async () => {
    const cpu = createCPU();
    
    // Setup
    await cpu.loadByte(0, 0xF6); // INC Zero Page,X
    await cpu.loadByte(1, 0x80); // Zero page address
    await cpu.loadByte(0x90, 0x41); // Value at 0x80 + 0x10 (with zero page wrap-around)
    
    await cpu.setXRegister(0x10); // X offset
    await cpu.setProgramCounter(0);
    
    // Execute
    const cycles = await cpu.step();
    
    // Verify
    assert.strictEqual(cycles, 6);
    assert.strictEqual(await cpu.readByte(0x90), 0x42); // 0x41 + 1 = 0x42
    assert.strictEqual(await getStatusRegister(cpu) & ZERO, 0); // Result is not zero
    assert.strictEqual(await getStatusRegister(cpu) & NEGATIVE, 0); // Result is not negative
  });
  
  it("should perform INC with Absolute addressing", async () => {
    const cpu = createCPU();
    
    // Setup
    cpu.loadByte(0, 0xEE); // INC Absolute
    cpu.loadByte(1, 0x00); // Low byte of address
    cpu.loadByte(2, 0x20); // High byte of address (0x2000)
    await cpu.loadByte(0x2000, 0xFF); // Value at absolute address
    
    await cpu.setProgramCounter(0);
    
    // Execute
    const cycles = await cpu.step();
    
    // Verify
    assert.strictEqual(cycles, 6);
    assert.strictEqual(await cpu.readByte(0x2000), 0x00); // 0xFF + 1 = 0x00 (wraps around)
    assert.strictEqual(await getStatusRegister(cpu) & ZERO, ZERO); // Result is zero
    assert.strictEqual(await getStatusRegister(cpu) & NEGATIVE, 0); // Result is not negative
  });
  
  it("should perform INC with Absolute,X addressing", async () => {
    const cpu = createCPU();
    
    // Setup
    cpu.loadByte(0, 0xFE); // INC Absolute,X
    cpu.loadByte(1, 0x00); // Low byte of address
    cpu.loadByte(2, 0x20); // High byte of address (0x2000)
    await cpu.loadByte(0x2010, 0x7F); // Value at 0x2000 + 0x10 = 0x2010
    
    await cpu.setXRegister(0x10); // X offset
    await cpu.setProgramCounter(0);
    
    // Execute
    const cycles = await cpu.step();
    
    // Verify
    assert.strictEqual(cycles, 7);
    assert.strictEqual(await cpu.readByte(0x2010), 0x80); // 0x7F + 1 = 0x80
    assert.strictEqual(await getStatusRegister(cpu) & ZERO, 0); // Result is not zero
    assert.strictEqual(await getStatusRegister(cpu) & NEGATIVE, NEGATIVE); // Result is negative (bit 7 set)
  });
  
  it("should perform DEC with Zero Page,X addressing", async () => {
    const cpu = createCPU();
    
    // Setup
    cpu.loadByte(0, 0xD6); // DEC Zero Page,X
    await cpu.loadByte(1, 0x80); // Zero page address
    await cpu.loadByte(0x90, 0x42); // Value at 0x80 + 0x10 (with zero page wrap-around)
    
    await cpu.setXRegister(0x10); // X offset
    await cpu.setProgramCounter(0);
    
    // Execute
    const cycles = await cpu.step();
    
    // Verify
    assert.strictEqual(cycles, 6);
    assert.strictEqual(await cpu.readByte(0x90), 0x41); // 0x42 - 1 = 0x41
    assert.strictEqual(await getStatusRegister(cpu) & ZERO, 0); // Result is not zero
    assert.strictEqual(await getStatusRegister(cpu) & NEGATIVE, 0); // Result is not negative
  });
  
  it("should perform DEC with Absolute addressing", async () => {
    const cpu = createCPU();
    
    // Setup
    cpu.loadByte(0, 0xCE); // DEC Absolute
    cpu.loadByte(1, 0x00); // Low byte of address
    cpu.loadByte(2, 0x20); // High byte of address (0x2000)
    cpu.loadByte(0x2000, 0x01); // Value at absolute address
    
    await cpu.setProgramCounter(0);
    
    // Execute
    const cycles = await cpu.step();
    
    // Verify
    assert.strictEqual(cycles, 6);
    assert.strictEqual(await cpu.readByte(0x2000), 0x00); // 0x01 - 1 = 0x00
    assert.strictEqual(await getStatusRegister(cpu) & ZERO, ZERO); // Result is zero
    assert.strictEqual(await getStatusRegister(cpu) & NEGATIVE, 0); // Result is not negative
  });
  
  it("should perform DEC with Absolute,X addressing", async () => {
    const cpu = createCPU();
    
    // Setup
    cpu.loadByte(0, 0xDE); // DEC Absolute,X
    cpu.loadByte(1, 0x00); // Low byte of address
    cpu.loadByte(2, 0x20); // High byte of address (0x2000)
    await cpu.loadByte(0x2010, 0x00); // Value at 0x2000 + 0x10 = 0x2010
    
    await cpu.setXRegister(0x10); // X offset
    await cpu.setProgramCounter(0);
    
    // Execute
    const cycles = await cpu.step();
    
    // Verify
    assert.strictEqual(cycles, 7);
    assert.strictEqual(await cpu.readByte(0x2010), 0xFF); // 0x00 - 1 = 0xFF (wraps around)
    assert.strictEqual(await getStatusRegister(cpu) & ZERO, 0); // Result is not zero
    assert.strictEqual(await getStatusRegister(cpu) & NEGATIVE, NEGATIVE); // Result is negative (bit 7 set)
  });
});