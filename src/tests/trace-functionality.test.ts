import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createCPU } from "./utils.ts";
import {
    getAccumulator,
    getXRegister,
    getYRegister,
    getProgramCounter,
    getStackPointer,
    getStatusRegister,
} from "./utils.ts";

describe("CPU trace functionality", () => {
    it("should log operations when trace is enabled", async () => {
        const cpu = createCPU();

        // Save the original console.log
        const originalConsoleLog = console.log;

        // Mock console.log to track calls
        const logCalls: string[] = [];
        console.log = (message: string) => {
            logCalls.push(message);
        };

        try {
            // Setup a simple program with a few instructions
            await cpu.loadByte(0, 0xa9); // LDA Immediate
            await cpu.loadByte(1, 0x42); // with value 0x42
            await cpu.loadByte(2, 0xaa); // TAX (Transfer A to X)
            await cpu.loadByte(3, 0xea); // NOP

            // Set PC to 0 to start execution
            await cpu.setProgramCounter(0);

            // Execute each instruction with trace enabled
            await cpu.step(true); // LDA
            await cpu.step(true); // TAX
            await cpu.step(true); // NOP

            // Verify that trace messages were logged
            assert.strictEqual(logCalls.length, 3);

            // First log should be for LDA at PC=0
            assert.ok(logCalls[0]?.includes("0000:"));
            assert.ok(logCalls[0]?.includes("LDA #$42"));

            // Second log should be for TAX at PC=2
            assert.ok(logCalls[1]?.includes("0002:"));
            assert.ok(logCalls[1]?.includes("TAX"));

            // Third log should be for NOP at PC=3
            assert.ok(logCalls[2]?.includes("0003:"));
            assert.ok(logCalls[2]?.includes("NOP"));

            // Verify the CPU state is correct after execution
            assert.strictEqual(await getAccumulator(cpu), 0x42);
            assert.strictEqual(await getXRegister(cpu), 0x42);
            assert.strictEqual(await getProgramCounter(cpu), 4);
        } finally {
            // Restore the original console.log
            console.log = originalConsoleLog;
        }
    });
});
