import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { CPU2 } from "../core/cpu2.ts";

describe("CPU2 Implementation", () => {
  it("should perform basic operations", async () => {
    const cpu = new CPU2();

    // Initialize memory with simple program
    // LDA #42  (Load 42 into accumulator)
    // TAX      (Transfer A to X)
    // INX      (Increment X)
    await cpu.loadByte(0x1000, 0xA9); // LDA immediate
    await cpu.loadByte(0x1001, 0x2A); // #42 (decimal)
    await cpu.loadByte(0x1002, 0xAA); // TAX
    await cpu.loadByte(0x1003, 0xE8); // INX

    // Set program counter to start of program
    await cpu.setProgramCounter(0x1000);

    // Step through each instruction
    await cpu.step(); // LDA #42
    assert.strictEqual((await cpu.getState()).a, 0x2A);

    await cpu.step(); // TAX
    assert.strictEqual((await cpu.getState()).x, 0x2A);

    await cpu.step(); // INX
    assert.strictEqual((await cpu.getState()).x, 0x2B);
  });

  it("should reset the CPU state", async () => {
    const cpu = new CPU2();

    // Change some values
    await cpu.setAccumulator(0x42);
    await cpu.setXRegister(0x84);
    await cpu.setProgramCounter(0x1234);

    // Reset the CPU
    await cpu.reset();

    // Verify default values are restored
    const state = await cpu.getState();
    assert.strictEqual(state.a, 0);
    assert.strictEqual(state.x, 0);
    assert.strictEqual(state.pc, 0);
    assert.strictEqual(state.sp, 0xFD);
  });

  it("should read bytes and words from memory", async () => {
    const cpu = new CPU2();

    await cpu.loadWord(0x2000, 0x1234);
    assert.strictEqual(await cpu.readByte(0x2000), 0x34);
    assert.strictEqual(await cpu.readByte(0x2001), 0x12);
    assert.strictEqual(await cpu.readWord(0x2000), 0x1234);
  });

  it("should log a trace line when stepping with trace enabled", async () => {
    const cpu = new CPU2();

    await cpu.loadByte(0x1000, 0xA9); // LDA immediate
    await cpu.loadByte(0x1001, 0x2A);
    await cpu.setProgramCounter(0x1000);

    const originalConsoleLog = console.log;
    const logCalls: unknown[][] = [];
    console.log = (...args: unknown[]) => {
      logCalls.push(args);
    };
    try {
      await cpu.step(true);
    } finally {
      console.log = originalConsoleLog;
    }

    assert.strictEqual(logCalls.length, 1);
    assert.ok(String(logCalls[0]).includes("LDA"));
    assert.strictEqual((await cpu.getState()).a, 0x2A);
  });

  it("should throw an error for unknown opcodes", async () => {
    const cpu = new CPU2();

    await cpu.loadByte(0x1000, 0xFF); // Invalid opcode
    await cpu.setProgramCounter(0x1000);

    await assert.rejects(cpu.step(), /Unknown opcode/);
  });
});
