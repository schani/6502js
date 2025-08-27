import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
    CARRY,
    ZERO,
    INTERRUPT,
    DECIMAL,
    BREAK,
    UNUSED,
    OVERFLOW,
    NEGATIVE,
} from "../core/constants.ts";
import { type CPU, createCPU, getYRegister } from "./utils.ts";

describe("Edge cases and boundary conditions", () => {
    it("should test writeWord at memory boundaries", async () => {
        const cpu = createCPU();

        // Test writing at the exact memory boundary
        await cpu.loadWord(0xffff, 0xabcd);

        // Verify that the low byte is at 0xFFFF and high byte wraps to 0x0000
        assert.strictEqual(await cpu.readByte(0xffff), 0xcd);
        assert.strictEqual(await cpu.readByte(0x0000), 0xab);

        // Try reading from the same address
        const value = await cpu.readWord(0xffff);
        assert.strictEqual(value, 0xabcd);
    });

    // Test missing LDY cases
    it("should test LDY with various addressing modes", async () => {
        const cpu = createCPU();

        // Case 1: Zero Page with zero result
        await cpu.loadByte(0x1000, 0xa4); // LDY Zero Page
        await cpu.loadByte(0x1001, 0x80); // Zero page address
        await cpu.loadByte(0x0080, 0x00); // Value (zero)

        await cpu.setYRegister(0xff); // Non-zero value
        await cpu.clearStatusFlag(ZERO); // Clear zero flag
        await cpu.setStatusFlag(NEGATIVE); // Set negative flag
        await cpu.setProgramCounter(0x1000);

        let cycles = await cpu.step();

        assert.strictEqual(cycles, 3);
        assert.strictEqual(await await getYRegister(cpu), 0x00);
        assert.strictEqual(((await cpu.getState()).p & ZERO) !== 0, true); // Zero flag should be set
        assert.strictEqual(((await cpu.getState()).p & NEGATIVE) !== 0, false); // Negative flag should be clear

        // Case 2: LDY Absolute with negative result
        await cpu.loadByte(0x1002, 0xac); // LDY Absolute
        await cpu.loadByte(0x1003, 0x00); // Low byte of address
        await cpu.loadByte(0x1004, 0x20); // High byte of address (0x2000)
        await cpu.loadByte(0x2000, 0x80); // Value (negative)

        await cpu.setYRegister(0x00); // Non-negative value
        await cpu.setStatusFlag(ZERO); // Set zero flag
        await cpu.clearStatusFlag(NEGATIVE); // Clear negative flag
        await cpu.setProgramCounter(0x1002);

        cycles = await cpu.step();

        assert.strictEqual(cycles, 4);
        assert.strictEqual(await await getYRegister(cpu), 0x80);
        assert.strictEqual(((await cpu.getState()).p & ZERO) !== 0, false); // Zero flag should be clear
        assert.strictEqual(((await cpu.getState()).p & NEGATIVE) !== 0, true); // Negative flag should be set
    });
});
