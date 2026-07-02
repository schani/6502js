import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { getAccumulator, getXRegister, getYRegister, getProgramCounter, getStatusRegister, createCPU, CARRY, ZERO, NEGATIVE, OVERFLOW } from "./utils.ts";
describe("Arithmetic operations", async () => {
  it("should perform ADC immediate instruction", async () => {
    const cpu = createCPU();
    
    // Set up CPU state
    await cpu.setAccumulator(0x42);
    await cpu.clearStatusFlag(CARRY); // Clear carry flag
    
    // Set up memory
    await cpu.loadByte(0, 0x69); // ADC immediate
    await cpu.loadByte(1, 0x37); // Value to add
    
    await cpu.step();
    
    assert.strictEqual(await await getAccumulator(cpu), 0x79); // 0x42 + 0x37 = 0x79
    assert.strictEqual(await getStatusRegister(cpu) & CARRY, 0); // No carry out
    assert.strictEqual(await getStatusRegister(cpu) & ZERO, 0); // Result is not zero
    assert.strictEqual(await getStatusRegister(cpu) & NEGATIVE, 0); // Result is not negative
    assert.strictEqual(await getStatusRegister(cpu) & OVERFLOW, 0); // No overflow (both inputs and result have same sign bit)
    assert.strictEqual(await getProgramCounter(cpu), 2);
    
  });
  
  it("should handle ADC with carry in", async () => {
    const cpu = createCPU();
    
    // Set up CPU state
    await cpu.setAccumulator(0x42);
    await cpu.setStatusFlag(CARRY); // Set carry flag
    
    // Set up memory
    await cpu.loadByte(0, 0x69); // ADC immediate
    await cpu.loadByte(1, 0x37); // Value to add
    
    await cpu.step();
    
    assert.strictEqual(await await getAccumulator(cpu), 0x7A); // 0x42 + 0x37 + 1 = 0x7A
    assert.strictEqual(await getProgramCounter(cpu), 2);
    
  });
  
  it("should handle ADC with carry out", async () => {
    const cpu = createCPU();
    
    // Set up CPU state
    await cpu.setAccumulator(0xD0);
    await cpu.clearStatusFlag(CARRY); // Clear carry flag
    
    // Set up memory
    await cpu.loadByte(0, 0x69); // ADC immediate
    await cpu.loadByte(1, 0x90); // Value to add
    
    await cpu.step();
    
    assert.strictEqual(await await getAccumulator(cpu), 0x60); // 0xD0 + 0x90 = 0x160, truncated to 0x60
    assert.strictEqual(await getStatusRegister(cpu) & CARRY, CARRY); // Carry flag should be set
    assert.strictEqual(await getProgramCounter(cpu), 2);
    
  });
  
  it("should handle ADC with overflow", async () => {
    const cpu = createCPU();
    
    // Set up CPU state
    await cpu.setAccumulator(0x50); // +80 in signed
    await cpu.clearStatusFlag(CARRY); // Clear carry flag
    
    // Set up memory
    await cpu.loadByte(0, 0x69); // ADC immediate
    await cpu.loadByte(1, 0x50); // +80 in signed
    
    await cpu.step();
    
    // 80 + 80 = 160, which is -96 when interpreted as signed 8-bit
    // (sign bit flipped from positive to negative)
    assert.strictEqual(await await getAccumulator(cpu), 0xA0);
    assert.strictEqual(await getStatusRegister(cpu) & OVERFLOW, OVERFLOW); // Overflow flag should be set
    assert.strictEqual(await getStatusRegister(cpu) & NEGATIVE, NEGATIVE); // Result is negative
    assert.strictEqual(await getProgramCounter(cpu), 2);
    
  });

  it("should perform SBC immediate instruction", async () => {
    const cpu = createCPU();
    
    // Set up CPU state
    await cpu.setAccumulator(0x42);
    await cpu.setStatusFlag(CARRY); // Set carry flag (means no borrow)
    
    // Set up memory
    await cpu.loadByte(0, 0xE9); // SBC immediate
    await cpu.loadByte(1, 0x20); // Value to subtract
    
    await cpu.step();
    
    assert.strictEqual(await await getAccumulator(cpu), 0x22); // 0x42 - 0x20 = 0x22
    assert.strictEqual(await getStatusRegister(cpu) & CARRY, CARRY); // No borrow needed
    assert.strictEqual(await getStatusRegister(cpu) & ZERO, 0); // Result is not zero
    assert.strictEqual(await getStatusRegister(cpu) & NEGATIVE, 0); // Result is not negative
    assert.strictEqual(await getProgramCounter(cpu), 2);
    
  });
  
  it("should handle SBC with borrow", async () => {
    const cpu = createCPU();
    
    // Set up CPU state
    await cpu.setAccumulator(0x42);
    await cpu.clearStatusFlag(CARRY); // Clear carry flag (means borrow)
    
    // Set up memory
    await cpu.loadByte(0, 0xE9); // SBC immediate
    await cpu.loadByte(1, 0x20); // Value to subtract
    
    await cpu.step();
    
    assert.strictEqual(await await getAccumulator(cpu), 0x21); // 0x42 - 0x20 - 1 = 0x21
    assert.strictEqual(await getProgramCounter(cpu), 2);
    
  });
  
  it("should handle SBC with borrow out", async () => {
    const cpu = createCPU();
    
    // Set up CPU state
    await cpu.setAccumulator(0x20);
    await cpu.setStatusFlag(CARRY); // Set carry flag (no borrow)
    
    // Set up memory
    await cpu.loadByte(0, 0xE9); // SBC immediate
    await cpu.loadByte(1, 0x30); // Value to subtract
    
    await cpu.step();
    
    assert.strictEqual(await await getAccumulator(cpu), 0xF0); // 0x20 - 0x30 = 0xF0 (with borrow)
    assert.strictEqual(await getStatusRegister(cpu) & CARRY, 0); // Borrow needed
    assert.strictEqual(await getStatusRegister(cpu) & NEGATIVE, NEGATIVE); // Result is negative
    assert.strictEqual(await getProgramCounter(cpu), 2);
    
  });
  
  it("should set the overflow flag on signed SBC overflow", async () => {
    const cpu = createCPU();

    // 0x50 - 0xB0 = 80 - (-80) = 160, which overflows signed 8-bit
    await cpu.setAccumulator(0x50);
    await cpu.setStatusFlag(CARRY); // No borrow
    await cpu.loadByte(0, 0xE9); // SBC immediate
    await cpu.loadByte(1, 0xB0);

    await cpu.step();

    assert.strictEqual(await getAccumulator(cpu), 0xA0);
    assert.strictEqual(await getStatusRegister(cpu) & OVERFLOW, OVERFLOW);
    assert.strictEqual(await getStatusRegister(cpu) & CARRY, 0); // Borrow occurred

    // 0xD0 - 0x70 = -48 - 112 = -160, which also overflows
    await cpu.setAccumulator(0xD0);
    await cpu.setStatusFlag(CARRY);
    await cpu.setProgramCounter(0);
    await cpu.loadByte(1, 0x70);

    await cpu.step();

    assert.strictEqual(await getAccumulator(cpu), 0x60);
    assert.strictEqual(await getStatusRegister(cpu) & OVERFLOW, OVERFLOW);
    assert.strictEqual(await getStatusRegister(cpu) & CARRY, CARRY); // No borrow

    // 0x50 - 0x10 does not overflow and must clear the flag
    await cpu.setAccumulator(0x50);
    await cpu.setStatusFlag(CARRY);
    await cpu.setProgramCounter(0);
    await cpu.loadByte(1, 0x10);

    await cpu.step();

    assert.strictEqual(await getAccumulator(cpu), 0x40);
    assert.strictEqual(await getStatusRegister(cpu) & OVERFLOW, 0);
  });

  it("should perform CMP immediate instruction", async () => {
    const cpu = createCPU();
    
    // Set up CPU state
    await cpu.setAccumulator(0x42);
    
    // Set up memory for A == M
    await cpu.loadByte(0, 0xC9); // CMP immediate
    await cpu.loadByte(1, 0x42); // Value to compare
    
    await cpu.step();
    
    assert.strictEqual(await await getAccumulator(cpu), 0x42); // Accumulator should not change
    assert.strictEqual(await getStatusRegister(cpu) & ZERO, ZERO); // Equal, so zero flag set
    assert.strictEqual(await getStatusRegister(cpu) & CARRY, CARRY); // A >= M, so carry set
    assert.strictEqual(await getStatusRegister(cpu) & NEGATIVE, 0); // Result bit 7 is clear
    assert.strictEqual(await getProgramCounter(cpu), 2);
    
    await cpu.setProgramCounter(0);
    await cpu.loadByte(1, 0x10);
    
    await cpu.step();
    
    assert.strictEqual(await getStatusRegister(cpu) & ZERO, 0); // Not equal, so zero flag clear
    assert.strictEqual(await getStatusRegister(cpu) & CARRY, CARRY); // A >= M, so carry set
    
    // Set up memory for A < M
    await cpu.setProgramCounter(0);
    await cpu.loadByte(1, 0x50);
    
    await cpu.step();
    
    assert.strictEqual(await getStatusRegister(cpu) & ZERO, 0); // Not equal, so zero flag clear
    assert.strictEqual(await getStatusRegister(cpu) & CARRY, 0); // A < M, so carry clear
    assert.strictEqual(await getStatusRegister(cpu) & NEGATIVE, NEGATIVE); // Result bit 7 is set
  });
  
  it("should perform CMP zero page instruction", async () => {
    const cpu = createCPU();
    
    // Set up CPU state
    await cpu.setAccumulator(0x42);
    
    // Set up memory
    await cpu.loadByte(0, 0xC5); // CMP zero page
    await cpu.loadByte(1, 0x30); // Zero page address
    await cpu.loadByte(0x30, 0x42); // Value to compare
    
    await cpu.step();
    
    assert.strictEqual(await await getAccumulator(cpu), 0x42); // Accumulator should not change
    assert.strictEqual(await getStatusRegister(cpu) & ZERO, ZERO); // Equal, so zero flag set
    assert.strictEqual(await getStatusRegister(cpu) & CARRY, CARRY); // A >= M, so carry set
    assert.strictEqual(await getProgramCounter(cpu), 2);
    
  });
  
  it("should perform CPX immediate instruction", async () => {
    const cpu = createCPU();
    
    // Set up CPU state
    cpu.setXRegister(0x42);
    
    // Set up memory
    await cpu.loadByte(0, 0xE0); // CPX immediate
    await cpu.loadByte(1, 0x42); // Value to compare
    
    await cpu.step();
    
    assert.strictEqual(await getXRegister(cpu), 0x42); // X register should not change
    assert.strictEqual(await getStatusRegister(cpu) & ZERO, ZERO); // Equal, so zero flag set
    assert.strictEqual(await getStatusRegister(cpu) & CARRY, CARRY); // X >= M, so carry set
    assert.strictEqual(await getProgramCounter(cpu), 2);
    
  });
  
  it("should perform CPY immediate instruction", async () => {
    const cpu = createCPU();
    
    // Set up CPU state
    cpu.setYRegister(0x42);
    
    // Set up memory
    await cpu.loadByte(0, 0xC0); // CPY immediate
    await cpu.loadByte(1, 0x42); // Value to compare
    
    await cpu.step();
    
    assert.strictEqual(await getYRegister(cpu), 0x42); // Y register should not change
    assert.strictEqual(await getStatusRegister(cpu) & ZERO, ZERO); // Equal, so zero flag set
    assert.strictEqual(await getStatusRegister(cpu) & CARRY, CARRY); // Y >= M, so carry set
    assert.strictEqual(await getProgramCounter(cpu), 2);
    
  });
});