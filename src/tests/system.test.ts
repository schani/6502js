import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createCPU } from "./utils.ts";

describe("System functions", () => {
    it("should perform NOP instruction", async () => {
        const cpu = createCPU();

        await cpu.loadByte(0, 0xea); // NOP
        await cpu.step();

        assert.strictEqual((await cpu.getState()).pc, 1);
    });

    it("should throw an error for unknown opcodes", async () => {
        const cpu = createCPU();

        await cpu.loadByte(0, 0xff); // Invalid opcode
        await cpu.setProgramCounter(0);

        await assert.rejects(cpu.step(), /Unknown opcode/);
    });

    it("should throw an error for unknown opcodes with trace enabled", async () => {
        const cpu = createCPU();

        // Mock console.log to verify the trace line is emitted before the throw
        const originalConsoleLog = console.log;
        let traceOutput = false;
        console.log = () => {
            traceOutput = true;
        };

        try {
            await cpu.loadByte(0, 0xff); // Invalid opcode
            await cpu.setProgramCounter(0);

            await assert.rejects(cpu.step(true), /Unknown opcode/);
            assert.strictEqual(traceOutput, true);
        } finally {
            console.log = originalConsoleLog;
        }
    });

    it("should log operations when trace is enabled", async () => {
        const cpu = createCPU();

        const originalConsoleLog = console.log;
        const logCalls: string[] = [];
        console.log = (message: string) => {
            logCalls.push(message);
        };

        try {
            await cpu.loadByte(0, 0xa9); // LDA Immediate
            await cpu.loadByte(1, 0x42); // with value 0x42
            await cpu.loadByte(2, 0xaa); // TAX (Transfer A to X)
            await cpu.loadByte(3, 0xea); // NOP
            await cpu.setProgramCounter(0);

            await cpu.step(true); // LDA
            await cpu.step(true); // TAX
            await cpu.step(true); // NOP

            assert.strictEqual(logCalls.length, 3);
            assert.ok(logCalls[0]?.includes("0000:"));
            assert.ok(logCalls[0]?.includes("LDA #$42"));
            assert.ok(logCalls[1]?.includes("0002:"));
            assert.ok(logCalls[1]?.includes("TAX"));
            assert.ok(logCalls[2]?.includes("0003:"));
            assert.ok(logCalls[2]?.includes("NOP"));

            const state = await cpu.getState();
            assert.strictEqual(state.a, 0x42);
            assert.strictEqual(state.x, 0x42);
            assert.strictEqual(state.pc, 4);
        } finally {
            console.log = originalConsoleLog;
        }
    });
});
