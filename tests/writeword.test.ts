import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { type CPU, createCPU } from "./utils.ts";

describe("WriteWord function", async () => {
  it("should correctly write words to memory", async () => {
    const cpu = createCPU();
    
    // Test normal case
    await cpu.loadWord(0x2000, 0x1234);
    assert.strictEqual(await cpu.readByte(0x2000), 0x34); // Low byte
    assert.strictEqual(await cpu.readByte(0x2001), 0x12); // High byte
    
    // Test boundary case (0xFFFF -> 0x0000)
    cpu.loadWord(0xFFFF, 0x5678);
    assert.strictEqual(await cpu.readByte(0xFFFF), 0x78); // Low byte
    assert.strictEqual(await cpu.readByte(0x0000), 0x56); // High byte wraps around
  });
});