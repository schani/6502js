import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createCPU } from "./utils.ts";
import { ZERO, NEGATIVE, CARRY, BREAK, UNUSED } from "../core/constants.ts";

describe("Stack operations", () => {
    it("should perform PHA and PLA instructions", async () => {
        const cpu = createCPU();

        // Set up accumulator
        await cpu.setAccumulator(0x42);
        await cpu.setProgramCounter(0);

        // PHA - Push Accumulator on Stack
        await cpu.loadByte(0, 0x48); // PHA

        let cycles = await cpu.step();

        // Check that SP was decremented
        assert.strictEqual((await cpu.getState()).sp, 0xfc);
        assert.strictEqual(await cpu.readByte(0x01fd), 0x42); // Stack value at 0x01FD should be 0x42
        assert.strictEqual((await cpu.getState()).pc, 1);
        assert.strictEqual(cycles, 3);

        // Clear accumulator
        await cpu.setAccumulator(0);

        // Set up PLA instruction
        await cpu.loadByte(1, 0x68); // PLA

        cycles = await cpu.step();

        // Check that accumulator got value from stack and SP was incremented
        assert.strictEqual((await cpu.getState()).a, 0x42);
        assert.strictEqual((await cpu.getState()).sp, 0xfd);
        assert.strictEqual((await cpu.getState()).pc, 2);
        assert.strictEqual(cycles, 4);
        assert.strictEqual(((await cpu.getState()).p & ZERO) === 0, true);
        assert.strictEqual(((await cpu.getState()).p & NEGATIVE) === 0, true);
    });

    it("should perform PHP and PLP instructions", async () => {
        const cpu = createCPU();

        // Set up status register with some flags
        await cpu.setStatusFlag(ZERO | CARRY);
        await cpu.setProgramCounter(0);

        // PHP - Push Processor Status on Stack
        await cpu.loadByte(0, 0x08); // PHP

        let cycles = await cpu.step();

        // Check that SP was decremented and status was pushed with B and unused flags set
        assert.strictEqual((await cpu.getState()).sp, 0xfc);
        // Instead of checking specific value, let's verify the pushed byte has the correct flags set
        const pushedValue = await cpu.readByte(0x01fd);
        assert.strictEqual(pushedValue & ZERO, ZERO);
        assert.strictEqual(pushedValue & CARRY, CARRY);
        assert.strictEqual(pushedValue & BREAK, BREAK);
        assert.strictEqual(pushedValue & UNUSED, UNUSED);
        assert.strictEqual((await cpu.getState()).pc, 1);
        assert.strictEqual(cycles, 3);

        // Clear status register
        await cpu.clearStatusFlag(ZERO | CARRY);

        // Set up PLP instruction
        await cpu.loadByte(1, 0x28); // PLP

        cycles = await cpu.step();

        // Check that status was pulled from stack (B and unused should be ignored)
        // Note: We confirm each flag individually rather than checking entire status register
        assert.strictEqual(((await cpu.getState()).p & ZERO) !== 0, true);
        assert.strictEqual(((await cpu.getState()).p & CARRY) !== 0, true);
        assert.strictEqual(((await cpu.getState()).p & UNUSED) !== 0, true);
        assert.strictEqual(((await cpu.getState()).p & BREAK) === 0, true); // BREAK flag shouldn't be set from PLP
        assert.strictEqual((await cpu.getState()).sp, 0xfd);
        assert.strictEqual((await cpu.getState()).pc, 2);
        assert.strictEqual(cycles, 4);
    });
});
