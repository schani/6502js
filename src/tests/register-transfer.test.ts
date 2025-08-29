import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { getAccumulator, getXRegister, getYRegister, getProgramCounter, getStackPointer, getStatusRegister, createCPU, ZERO, NEGATIVE, INTERRUPT, UNUSED } from "./utils.ts";
describe("Register transfer instructions", () => {
  it("should perform TAX instruction", async () => {
    const cpu = createCPU();
    
    // Set up accumulator
    await cpu.setAccumulator(0x42);
    
    // TAX - Transfer accumulator to X
    await cpu.loadByte(0, 0xAA); // TAX
    
    await cpu.step();
    
    assert.strictEqual(await await getXRegister(cpu), 0x42);
    assert.strictEqual(await await getProgramCounter(cpu), 1);
    
    assert.strictEqual((await await getStatusRegister(cpu)) & ZERO, 0);
    assert.strictEqual((await await getStatusRegister(cpu)) & NEGATIVE, 0);
    
    // Test zero flag
    await cpu.setProgramCounter(0);
    await cpu.setAccumulator(0);
    await cpu.step();
    assert.strictEqual(await await getXRegister(cpu), 0);
    assert.strictEqual((await await getStatusRegister(cpu)) & ZERO, ZERO);
    
    // Test negative flag
    await cpu.setProgramCounter(0);
    await cpu.setAccumulator(0x80);
    await cpu.step();
    assert.strictEqual(await getXRegister(cpu), 0x80);
    assert.strictEqual((await await getStatusRegister(cpu)) & NEGATIVE, NEGATIVE);
  });
  
  it("should perform TAY instruction", async () => {
    const cpu = createCPU();
    
    // Set up accumulator
    await cpu.setAccumulator(0x42);
    
    // TAY - Transfer accumulator to Y
    await cpu.loadByte(0, 0xA8); // TAY
    
    await cpu.step();
    
    assert.strictEqual(await await getYRegister(cpu), 0x42);
    assert.strictEqual(await await getProgramCounter(cpu), 1);
    
  });
  
  it("should perform TXA instruction", async () => {
    const cpu = createCPU();
    
    // Set up X register
    await cpu.setXRegister(0x42);
    
    // TXA - Transfer X to accumulator
    await cpu.loadByte(0, 0x8A); // TXA
    
    await cpu.step();
    
    assert.strictEqual(await await getAccumulator(cpu), 0x42);
    assert.strictEqual(await await getProgramCounter(cpu), 1);
    
  });
  
  it("should perform TYA instruction", async () => {
    const cpu = createCPU();
    
    // Set up Y register
    await cpu.setYRegister(0x42);
    
    // TYA - Transfer Y to accumulator
    await cpu.loadByte(0, 0x98); // TYA
    
    await cpu.step();
    
    assert.strictEqual(await await getAccumulator(cpu), 0x42);
    assert.strictEqual(await await getProgramCounter(cpu), 1);
    
  });
  
  it("should perform TSX instruction", async () => {
    const cpu = createCPU();
    
    // Set up stack pointer
    await cpu.setStackPointer(0x42);
    
    // TSX - Transfer Stack Pointer to X
    await cpu.loadByte(0, 0xBA); // TSX
    
    await cpu.step();
    
    assert.strictEqual(await await getXRegister(cpu), 0x42);
    assert.strictEqual(await await getProgramCounter(cpu), 1);
    
    assert.strictEqual((await await getStatusRegister(cpu)) & ZERO, 0); // Result is not zero
    assert.strictEqual((await await getStatusRegister(cpu)) & NEGATIVE, 0); // Result is not negative
  });
  
  it("should perform TXS instruction", async () => {
    const cpu = createCPU();
    
    // Set up X register
    await cpu.setXRegister(0x42);
    
    // TXS - Transfer X to Stack Pointer
    await cpu.loadByte(0, 0x9A); // TXS
    
    await cpu.step();
    
    assert.strictEqual(await await getStackPointer(cpu), 0x42);
    assert.strictEqual(await await getProgramCounter(cpu), 1);
    
    assert.strictEqual(await await getStatusRegister(cpu), INTERRUPT | UNUSED); // Original status
  });
});
