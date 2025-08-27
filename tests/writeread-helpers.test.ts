import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { type CPU, createCPU } from "./utils.ts";

describe("More memory helper tests", () => {
  it("should test writeWord at exact memory boundary", async () => {
    const cpu = createCPU();
    
    // Test writing a word at the very edge of memory
    await cpu.loadWord(0xFFFE, 0x1234);
    
    // Verify the write was successful and the high byte wrapped around
    assert.strictEqual(await cpu.readByte(0xFFFE), 0x34);
    assert.strictEqual(await cpu.readByte(0xFFFF), 0x12);
    
    // Test writing a word that exactly crosses the memory boundary
    await cpu.loadWord(0xFFFF, 0x5678);
    
    // Verify the write was successful and the high byte wrapped around
    assert.strictEqual(await cpu.readByte(0xFFFF), 0x78);
    assert.strictEqual(await cpu.readByte(0x0000), 0x56);
  });
});