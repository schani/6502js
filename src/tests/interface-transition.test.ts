import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
/**
 * This test file demonstrates transitioning from direct CPU state access
 * to using the CPU interface methods
 */
import { getAccumulator, getXRegister, getYRegister, getProgramCounter, getStackPointer, getStatusRegister, createCPU, type CPU, CARRY, ZERO, NEGATIVE } from "./utils.ts";
describe("CPU Interface Tests", () => {
  it("should demonstrate all interface methods", async () => {
    const cpu = createCPU();
    
    // Set registers
    await cpu.setAccumulator(0x42);
    await cpu.setXRegister(0x84);
    await cpu.setYRegister(0x28);
    await cpu.setStackPointer(0xF0);
    await cpu.setProgramCounter(0x1000);
    
    // Verify registers
    assert.strictEqual(await getAccumulator(cpu), 0x42);
    assert.strictEqual(await getXRegister(cpu), 0x84);
    assert.strictEqual(await getYRegister(cpu), 0x28);
    assert.strictEqual(await getStackPointer(cpu), 0xF0);
    assert.strictEqual(await getProgramCounter(cpu), 0x1000);
    
    // Set status flags
    await cpu.setStatusFlag(ZERO | CARRY);
    assert.strictEqual(((await cpu.getState()).p & ZERO) !== 0, true);
    assert.strictEqual(((await cpu.getState()).p & NEGATIVE) === 0, true);
    assert.strictEqual(((await cpu.getState()).p & CARRY) !== 0, true);
    
    // Clear status flags
    await cpu.clearStatusFlag(CARRY);
    assert.strictEqual(((await cpu.getState()).p & ZERO) !== 0, true);
    assert.strictEqual(((await cpu.getState()).p & CARRY) === 0, true);
    
    // Set full status register
    await cpu.setStatusRegister(NEGATIVE);
    assert.strictEqual(await getStatusRegister(cpu), NEGATIVE);
    assert.strictEqual(((await cpu.getState()).p & NEGATIVE) !== 0, true);
    assert.strictEqual(((await cpu.getState()).p & ZERO) === 0, true);
    
    // Memory access
    await cpu.loadByte(0x2000, 0xFF);
    assert.strictEqual(await cpu.readByte(0x2000), 0xFF);
    
    await cpu.loadWord(0x2100, 0xABCD);
    assert.strictEqual(await cpu.readByte(0x2100), 0xCD); // Low byte
    assert.strictEqual(await cpu.readByte(0x2101), 0xAB); // High byte
    assert.strictEqual(await cpu.readWord(0x2100), 0xABCD);
    
    // Reset and verify defaults
    await cpu.reset();
    assert.strictEqual(await getAccumulator(cpu), 0);
    assert.strictEqual(await getXRegister(cpu), 0);
    assert.strictEqual(await getYRegister(cpu), 0);
    assert.strictEqual(await getProgramCounter(cpu), 0);
    assert.strictEqual(await getStackPointer(cpu), 0xFD);
  });
  
  it("should run a simple program using the interface", async () => {
    const cpu = createCPU();
    
    // Load a simple program:
    // LDA #5
    // ADC #3
    // STA $80
    await cpu.loadByte(0x1000, 0xA9); // LDA immediate
    await cpu.loadByte(0x1001, 0x05); // #5
    await cpu.loadByte(0x1002, 0x69); // ADC immediate
    await cpu.loadByte(0x1003, 0x03); // #3
    await cpu.loadByte(0x1004, 0x85); // STA zero page
    await cpu.loadByte(0x1005, 0x80); // $80
    
    // Initialize CPU
    await cpu.setProgramCounter(0x1000);
    await cpu.setStatusFlag(CARRY); // Set carry for ADC
    
    // Run the program
    await cpu.step(); // LDA #5
    assert.strictEqual(await getAccumulator(cpu), 5);
    
    await cpu.step(); // ADC #3 (with carry set, so 5 + 3 + 1 = 9)
    assert.strictEqual(await getAccumulator(cpu), 9);
    
    await cpu.step(); // STA $80
    assert.strictEqual(await cpu.readByte(0x80), 9);
    assert.strictEqual(await getProgramCounter(cpu), 0x1006);
  });
});