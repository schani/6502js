import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { getAccumulator, getProgramCounter, createCPU, ZERO } from "./utils.ts";
describe("Indirect addressing modes", () => {
  it("should perform LDA indirect,X instruction", async () => {
    const cpu = createCPU();
    
    // Set up CPU state
    await cpu.setXRegister(0x04);
    
    // Set up memory
    await cpu.loadByte(0, 0xA1); // LDA (indirect,X)
    await cpu.loadByte(1, 0x20); // Zero page address
    
    // Effective address stored at (zero page + X) in little endian
    await cpu.loadByte(0x24, 0x74); // Low byte of effective address
    await cpu.loadByte(0x25, 0x20); // High byte of effective address
    
    // Value at effective address
    await cpu.loadByte(0x2074, 0x42);
    
    await cpu.step();
    
    assert.strictEqual(await getAccumulator(cpu), 0x42);
    assert.strictEqual(await getProgramCounter(cpu), 2);
    
  });
  
  it("should perform LDA indirect,Y instruction", async () => {
    const cpu = createCPU();
    
    // Set up CPU state
    await cpu.setYRegister(0x10);
    
    // Set up memory
    await cpu.loadByte(0, 0xB1); // LDA (indirect),Y
    await cpu.loadByte(1, 0x20); // Zero page address
    
    // Effective base address stored at zero page in little endian
    await cpu.loadByte(0x20, 0x74); // Low byte of base address
    await cpu.loadByte(0x21, 0x20); // High byte of base address
    
    // Value at (base address + Y)
    await cpu.loadByte(0x2084, 0x42); // 0x2074 + 0x10 = 0x2084
    
    await cpu.step();
    
    assert.strictEqual(await getAccumulator(cpu), 0x42);
    assert.strictEqual(await getProgramCounter(cpu), 2);
    
  });
  
  it("should handle crossing page boundary with indirect,Y", async () => {
    const cpu = createCPU();
    
    // Set up CPU state
    await cpu.setYRegister(0xFF);
    
    // Set up memory
    await cpu.loadByte(0, 0xB1); // LDA (indirect),Y
    await cpu.loadByte(1, 0x20); // Zero page address
    
    // Effective base address stored at zero page in little endian
    await cpu.loadByte(0x20, 0x01); // Low byte of base address
    await cpu.loadByte(0x21, 0x20); // High byte of base address
    
    // Value at (base address + Y) crossing page boundary
    await cpu.loadByte(0x2100, 0x42); // 0x2001 + 0xFF = 0x2100
    
    await cpu.step();
    
    assert.strictEqual(await getAccumulator(cpu), 0x42);
    assert.strictEqual(await getProgramCounter(cpu), 2);
    
  });
  
  it("should perform JMP indirect instruction", async () => {
    const cpu = createCPU();
    
    // Set up memory
    await cpu.loadByte(0, 0x6C); // JMP indirect
    await cpu.loadByte(1, 0x20); // Low byte of pointer address
    await cpu.loadByte(2, 0x30); // High byte of pointer address
    
    // Target address stored at pointer in little endian
    await cpu.loadByte(0x3020, 0x40); // Low byte of target
    await cpu.loadByte(0x3021, 0x50); // High byte of target
    
    await cpu.step();
    
    assert.strictEqual(await getProgramCounter(cpu), 0x5040); // PC should be set to target address
    
  });
  
  // Test the 6502's indirect JMP bug when vector falls on page boundary
  it("should correctly handle JMP indirect page boundary bug", async () => {
    const cpu = createCPU();
    
    // Set up memory
    await cpu.loadByte(0, 0x6C); // JMP indirect
    await cpu.loadByte(1, 0xFF); // Low byte of pointer address (page boundary)
    await cpu.loadByte(2, 0x30); // High byte of pointer address
    
    // Target address stored at pointer with wrap-around bug
    await cpu.loadByte(0x30FF, 0x40); // Low byte of target
    await cpu.loadByte(0x3000, 0x50); // High byte at wrap-around address (not 0x3100)
    
    await cpu.step();
    
    assert.strictEqual(await getProgramCounter(cpu), 0x5040); // PC should be set to target address with bug behavior
    
  });
});