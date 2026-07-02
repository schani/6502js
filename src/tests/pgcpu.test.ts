import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { PGCPU } from "../core/pgcpu.ts";

describe("PGCPU Implementation", () => {
  it("should read bytes and words from memory", async () => {
    const cpu = new PGCPU();

    await cpu.loadWord(0x2000, 0x1234);
    assert.strictEqual(await cpu.readByte(0x2000), 0x34);
    assert.strictEqual(await cpu.readByte(0x2001), 0x12);
    assert.strictEqual(await cpu.readWord(0x2000), 0x1234);

    // Uninitialized memory reads as 0
    assert.strictEqual(await cpu.readByte(0x3000), 0);
    assert.strictEqual(await cpu.readWord(0x3000), 0);
  });

  it("should log a trace line when stepping with trace enabled", async () => {
    const cpu = new PGCPU();

    await cpu.loadByte(0x1000, 0xa9); // LDA immediate
    await cpu.loadByte(0x1001, 0x2a);
    await cpu.setProgramCounter(0x1000);

    const originalConsoleLog = console.log;
    const logCalls: string[] = [];
    console.log = (message: string) => {
      logCalls.push(message);
    };
    try {
      await cpu.step(true);
    } finally {
      console.log = originalConsoleLog;
    }

    assert.strictEqual(logCalls.length, 1);
    assert.ok(logCalls[0]?.includes("1000:"));
    assert.ok(logCalls[0]?.includes("LDA"));
    assert.strictEqual((await cpu.getState()).a, 0x2a);
  });
});
