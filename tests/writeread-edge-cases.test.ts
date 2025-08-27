import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { type CPU, createCPU } from "./utils.ts";

describe("Memory helpers edge cases", () => {
  it("should test writeWord/readWord edge cases", async () => {
    const cpu = createCPU();
    
    // Test writing at memory boundary (0xFFFF -> 0x0000)
    await cpu.loadWord(0xFFFF, 0xABCD);
    
    // Verify the low byte went to 0xFFFF
    assert.strictEqual(await cpu.readByte(0xFFFF), 0xCD);
    
    // Verify the high byte wrapped around to 0x0000
    assert.strictEqual(await cpu.readByte(0x0000), 0xAB);
    
    // Test reading a word at memory boundary
    const value = await cpu.readWord(0xFFFF);
    assert.strictEqual(value, 0xABCD);
    
    // Test with undefined memory (should default to 0)
    // First clear the memory we just set
    await cpu.loadByte(0xFFFF, 0);
    await cpu.loadByte(0x0000, 0);
    
    // Now read from uninitialized memory
    const undefValue = await cpu.readWord(0x3000);
    assert.strictEqual(undefValue, 0); // Should default to 0 for uninitialized memory
    
    // Test with non-word boundary
    await cpu.loadWord(0x4000, 0x1234);
    assert.strictEqual(await cpu.readByte(0x4000), 0x34);
    assert.strictEqual(await cpu.readByte(0x4001), 0x12);
    
    // Verify reading non-word boundary
    const value2 = await cpu.readWord(0x4000);
    assert.strictEqual(value2, 0x1234);
  });
});