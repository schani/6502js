import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { getAccumulator, getXRegister, getYRegister, getProgramCounter, getStatusRegister, createCPU, ZERO, NEGATIVE } from "./utils.ts";
describe("Load instructions", async () => {
  it("should perform LDA immediate instruction", async () => {
    const cpu = createCPU();
    
    // LDA #$42 - Load accumulator with value 0x42
    await cpu.loadByte(0, 0xA9); // LDA immediate
    await cpu.loadByte(1, 0x42); // Value to load

    await cpu.step();
    
    assert.strictEqual(await getAccumulator(cpu), 0x42);
    assert.strictEqual(await getProgramCounter(cpu), 2);  // PC should advance by 2 bytes
    
    assert.strictEqual(await getStatusRegister(cpu) & ZERO, 0); // Zero flag should be clear
    assert.strictEqual(await getStatusRegister(cpu) & NEGATIVE, 0); // Negative flag should be clear
    
    // Test zero flag
    await cpu.setProgramCounter(0);
    await cpu.loadByte(1, 0x00);
    await cpu.step();
    assert.strictEqual(await getAccumulator(cpu), 0);
    assert.strictEqual(await getStatusRegister(cpu) & ZERO, ZERO); // Zero flag should be set
    
    // Test negative flag
    await cpu.setProgramCounter(0);
    await cpu.loadByte(1, 0x80);
    await cpu.step();
    assert.strictEqual(await getAccumulator(cpu), 0x80);
    assert.strictEqual(await getStatusRegister(cpu) & NEGATIVE, NEGATIVE); // Negative flag should be set
  });

  it("should perform LDX immediate instruction", async () => {
    const cpu = createCPU();
    
    // LDX #$42 - Load X register with value 0x42
    await cpu.loadByte(0, 0xA2); // LDX immediate
    await cpu.loadByte(1, 0x42); // Value to load

    await cpu.step();
    
    assert.strictEqual(await getXRegister(cpu), 0x42);
    assert.strictEqual(await getProgramCounter(cpu), 2);
    
    assert.strictEqual(await getStatusRegister(cpu) & ZERO, 0);
    assert.strictEqual(await getStatusRegister(cpu) & NEGATIVE, 0);
  });

  it("should perform LDY immediate instruction", async () => {
    const cpu = createCPU();
    
    // LDY #$42 - Load Y register with value 0x42
    await cpu.loadByte(0, 0xA0); // LDY immediate
    await cpu.loadByte(1, 0x42); // Value to load

    await cpu.step();
    
    assert.strictEqual(await getYRegister(cpu), 0x42);
    assert.strictEqual(await getProgramCounter(cpu), 2);
    
    assert.strictEqual(await getStatusRegister(cpu) & ZERO, 0);
    assert.strictEqual(await getStatusRegister(cpu) & NEGATIVE, 0);
  });

  it("should perform LDA zero page instruction", async () => {
    const cpu = createCPU();
    
    // Set up memory
    await cpu.loadByte(0, 0xA5); // LDA zero page
    await cpu.loadByte(1, 0x42); // Zero page address
    await cpu.loadByte(0x42, 0x37); // Value at zero page address
    
    await cpu.step();
    
    assert.strictEqual(await getAccumulator(cpu), 0x37);
    assert.strictEqual(await getProgramCounter(cpu), 2);
    
  });

  it("should perform LDX zero page instruction", async () => {
    const cpu = createCPU();
    
    // Set up memory
    await cpu.loadByte(0, 0xA6); // LDX zero page
    await cpu.loadByte(1, 0x42); // Zero page address
    await cpu.loadByte(0x42, 0x37); // Value at zero page address
    
    await cpu.step();
    
    assert.strictEqual(await getXRegister(cpu), 0x37);
    assert.strictEqual(await getProgramCounter(cpu), 2);
    
  });
  
  // Add tests for zero page,X and zero page,Y addressing
  it("should perform LDA zero page,X instruction", async () => {
    const cpu = createCPU();
    
    // Set up CPU state
    await cpu.setXRegister(0x05);
    
    // Set up memory
    await cpu.loadByte(0, 0xB5); // LDA zero page,X
    await cpu.loadByte(1, 0x20); // Zero page address
    await cpu.loadByte(0x25, 0x42); // Value at (zero page address + X)
    
    await cpu.step();
    
    assert.strictEqual(await getAccumulator(cpu), 0x42);
    assert.strictEqual(await getProgramCounter(cpu), 2);
    
  });
  
  it("should handle zero page,X wrap-around", async () => {
    const cpu = createCPU();
    
    // Set up CPU state
    await cpu.setXRegister(0xFF);
    
    // Set up memory
    await cpu.loadByte(0, 0xB5); // LDA zero page,X
    await cpu.loadByte(1, 0x80); // Zero page address
    await cpu.loadByte(0x7F, 0x42); // Value at (0x80 + 0xFF) & 0xFF = 0x7F (wrap around)
    
    await cpu.step();
    
    assert.strictEqual(await getAccumulator(cpu), 0x42);
    assert.strictEqual(await getProgramCounter(cpu), 2);
    
  });
  
  it("should perform LDX zero page,Y instruction", async () => {
    const cpu = createCPU();
    
    // Set up CPU state
    await cpu.setYRegister(0x05);
    
    // Set up memory
    await cpu.loadByte(0, 0xB6); // LDX zero page,Y
    await cpu.loadByte(1, 0x20); // Zero page address
    await cpu.loadByte(0x25, 0x42); // Value at (zero page address + Y)
    
    await cpu.step();
    
    assert.strictEqual(await getXRegister(cpu), 0x42);
    assert.strictEqual(await getProgramCounter(cpu), 2);
    
  });
  
  // Tests for absolute addressing
  it("should perform LDA absolute instruction", async () => {
    const cpu = createCPU();
    
    // Set up memory
    await cpu.loadByte(0, 0xAD); // LDA absolute
    await cpu.loadByte(1, 0x34); // Low byte of address
    await cpu.loadByte(2, 0x12); // High byte of address
    await cpu.loadByte(0x1234, 0x42); // Value at absolute address
    
    await cpu.step();
    
    assert.strictEqual(await getAccumulator(cpu), 0x42);
    assert.strictEqual(await getProgramCounter(cpu), 3);
    
  });
  
  it("should perform LDA absolute,X instruction", async () => {
    const cpu = createCPU();
    
    // Set up CPU state
    await cpu.setXRegister(0x05);
    
    // Set up memory
    await cpu.loadByte(0, 0xBD); // LDA absolute,X
    await cpu.loadByte(1, 0x34); // Low byte of address
    await cpu.loadByte(2, 0x12); // High byte of address
    await cpu.loadByte(0x1239, 0x42); // Value at (absolute address + X)
    
    await cpu.step();
    
    assert.strictEqual(await getAccumulator(cpu), 0x42);
    assert.strictEqual(await getProgramCounter(cpu), 3);
    
  });
  
  it("should handle crossing page boundary with absolute,X", async () => {
    const cpu = createCPU();
    
    // Set up CPU state
    await cpu.setXRegister(0xFF);
    
    // Set up memory
    await cpu.loadByte(0, 0xBD); // LDA absolute,X
    await cpu.loadByte(1, 0x01); // Low byte of address
    await cpu.loadByte(2, 0x12); // High byte of address
    await cpu.loadByte(0x1300, 0x42); // Value at (0x1201 + 0xFF) = 0x1300 (page boundary crossed)
    
    await cpu.step();
    
    assert.strictEqual(await getAccumulator(cpu), 0x42);
    assert.strictEqual(await getProgramCounter(cpu), 3);
    
  });
  
  it("should perform LDA absolute,Y instruction", async () => {
    const cpu = createCPU();
    
    // Set up CPU state
    await cpu.setYRegister(0x05);
    
    // Set up memory
    await cpu.loadByte(0, 0xB9); // LDA absolute,Y
    await cpu.loadByte(1, 0x34); // Low byte of address
    await cpu.loadByte(2, 0x12); // High byte of address
    await cpu.loadByte(0x1239, 0x42); // Value at (absolute address + Y)
    
    await cpu.step();
    
    assert.strictEqual(await getAccumulator(cpu), 0x42);
    assert.strictEqual(await getProgramCounter(cpu), 3);
    
  });
});
