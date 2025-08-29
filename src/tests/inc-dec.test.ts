import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createCPU, ZERO, NEGATIVE, getXRegister, getYRegister, getProgramCounter, getStatusRegister } from "./utils.ts";

describe("Increment and decrement operations", async () => {
  it("should perform INX instruction", async () => {
    const cpu = createCPU();
    
    // Set up CPU state
    await cpu.setXRegister(0x41);
    
    // Set up memory
    await cpu.loadByte(0, 0xE8); // INX
    
    await cpu.step();
    
    assert.strictEqual(await getXRegister(cpu), 0x42);
    assert.strictEqual(await getStatusRegister(cpu) & ZERO, 0); // Result is not zero
    assert.strictEqual(await getStatusRegister(cpu) & NEGATIVE, 0); // Result is not negative
    assert.strictEqual(await getProgramCounter(cpu), 1);
    
    await cpu.setProgramCounter(0);
    await cpu.setXRegister(0xFF);
    
    await cpu.step();
    
    assert.strictEqual(await getXRegister(cpu), 0x00);
    assert.strictEqual(await getStatusRegister(cpu) & ZERO, ZERO); // Result is zero
  });
  
  it("should perform INY instruction", async () => {
    const cpu = createCPU();
    
    // Set up CPU state
    await cpu.setYRegister(0x41);
    
    // Set up memory
    await cpu.loadByte(0, 0xC8); // INY
    
    await cpu.step();
    
    assert.strictEqual(await getYRegister(cpu), 0x42);
    assert.strictEqual(await getStatusRegister(cpu) & ZERO, 0); // Result is not zero
    assert.strictEqual(await getStatusRegister(cpu) & NEGATIVE, 0); // Result is not negative
    assert.strictEqual(await getProgramCounter(cpu), 1);
    
  });
  
  it("should perform DEX instruction", async () => {
    const cpu = createCPU();
    
    // Set up CPU state
    await cpu.setXRegister(0x43);
    
    // Set up memory
    await cpu.loadByte(0, 0xCA); // DEX
    
    await cpu.step();
    
    assert.strictEqual(await getXRegister(cpu), 0x42);
    assert.strictEqual(await getStatusRegister(cpu) & ZERO, 0); // Result is not zero
    assert.strictEqual(await getStatusRegister(cpu) & NEGATIVE, 0); // Result is not negative
    assert.strictEqual(await getProgramCounter(cpu), 1);
    
    await cpu.setProgramCounter(0);
    await cpu.setXRegister(0x00);
    
    await cpu.step();
    
    assert.strictEqual(await getXRegister(cpu), 0xFF);
    assert.strictEqual(await getStatusRegister(cpu) & NEGATIVE, NEGATIVE); // Result is negative
  });
  
  it("should perform DEY instruction", async () => {
    const cpu = createCPU();
    
    // Set up CPU state
    await cpu.setYRegister(0x43);
    
    // Set up memory
    await cpu.loadByte(0, 0x88); // DEY
    
    await cpu.step();
    
    assert.strictEqual(await getYRegister(cpu), 0x42);
    assert.strictEqual(await getStatusRegister(cpu) & ZERO, 0); // Result is not zero
    assert.strictEqual(await getStatusRegister(cpu) & NEGATIVE, 0); // Result is not negative
    assert.strictEqual(await getProgramCounter(cpu), 1);
    
  });
  
  it("should perform INC zero page instruction", async () => {
    const cpu = createCPU();
    
    // Set up memory
    await cpu.loadByte(0, 0xE6); // INC zero page
    await cpu.loadByte(1, 0x20); // Zero page address
    await cpu.loadByte(0x20, 0x41); // Value to increment
    
    await cpu.step();
    
    assert.strictEqual(await cpu.readByte(0x20), 0x42);
    assert.strictEqual(await getStatusRegister(cpu) & ZERO, 0); // Result is not zero
    assert.strictEqual(await getStatusRegister(cpu) & NEGATIVE, 0); // Result is not negative
    assert.strictEqual(await getProgramCounter(cpu), 2);
    
  });
  
  it("should perform DEC zero page instruction", async () => {
    const cpu = createCPU();
    
    // Set up memory
    await cpu.loadByte(0, 0xC6); // DEC zero page
    await cpu.loadByte(1, 0x20); // Zero page address
    await cpu.loadByte(0x20, 0x43); // Value to decrement
    
    await cpu.step();
    
    assert.strictEqual(await cpu.readByte(0x20), 0x42);
    assert.strictEqual(await getStatusRegister(cpu) & ZERO, 0); // Result is not zero
    assert.strictEqual(await getStatusRegister(cpu) & NEGATIVE, 0); // Result is not negative
    assert.strictEqual(await getProgramCounter(cpu), 2);
    
  });
});