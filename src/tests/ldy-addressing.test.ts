import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { ZERO, NEGATIVE } from "../core/constants.ts";
import { createCPU, getYRegister } from "./utils.ts";

describe("LDY with different addressing modes", async () => {
    it("should perform LDY Zero Page,X instruction", async () => {
        const cpu = createCPU();

        // Setup
        await cpu.loadByte(0, 0xb4); // LDY Zero Page,X
        await cpu.loadByte(1, 0x80); // Zero page address
        await cpu.loadByte(0x90, 0x42); // Value at 0x80 + 0x10 (with zero page wrap-around)

        await cpu.setXRegister(0x10); // X offset
        await cpu.setProgramCounter(0);

        // Execute
        await cpu.step();

        // Verify
        
        assert.strictEqual(await await getYRegister(cpu), 0x42);
        assert.strictEqual(((await cpu.getState()).p & ZERO) === 0, true); // Result is not zero
        assert.strictEqual(((await cpu.getState()).p & NEGATIVE) === 0, true); // Result is not negative
    });

    it("should perform LDY Absolute instruction", async () => {
        const cpu = createCPU();

        // Setup
        await cpu.loadByte(0, 0xac); // LDY Absolute
        await cpu.loadByte(1, 0x00); // Low byte of address
        await cpu.loadByte(2, 0x20); // High byte of address (0x2000)
        await cpu.loadByte(0x2000, 0x80); // Value at absolute address

        await cpu.setProgramCounter(0);

        // Execute
        await cpu.step();

        // Verify
        
        assert.strictEqual(await await getYRegister(cpu), 0x80);
        assert.strictEqual(((await cpu.getState()).p & ZERO) === 0, true); // Result is not zero
        assert.strictEqual(((await cpu.getState()).p & NEGATIVE) !== 0, true); // Result is negative (bit 7 set)
    });

    it("should perform LDY Absolute,X instruction", async () => {
        const cpu = createCPU();

        // Setup
        await cpu.loadByte(0, 0xbc); // LDY Absolute,X
        await cpu.loadByte(1, 0x00); // Low byte of address
        await cpu.loadByte(2, 0x20); // High byte of address (0x2000)
        await cpu.loadByte(0x2010, 0x00); // Value at 0x2000 + 0x10 = 0x2010

        await cpu.setXRegister(0x10); // X offset
        await cpu.setProgramCounter(0);

        // Execute
        await cpu.step();

        // Verify
        
        assert.strictEqual(await await getYRegister(cpu), 0x00);
        assert.strictEqual(((await cpu.getState()).p & ZERO) !== 0, true); // Result is zero
        assert.strictEqual(((await cpu.getState()).p & NEGATIVE) === 0, true); // Result is not negative
    });

    it("should perform LDY Absolute,X instruction with page crossing", async () => {
        const cpu = createCPU();

        // Setup
        await cpu.loadByte(0, 0xbc); // LDY Absolute,X
        await cpu.loadByte(1, 0xf0); // Low byte of address
        await cpu.loadByte(2, 0x20); // High byte of address (0x20F0)
        await cpu.loadByte(0x2100, 0xff); // Value at 0x20F0 + 0x10 = 0x2100 (page boundary crossed)

        await cpu.setXRegister(0x10); // X offset
        await cpu.setProgramCounter(0);

        // Execute
        await cpu.step();

        // Verify
        
        assert.strictEqual(await await getYRegister(cpu), 0xff);
        assert.strictEqual(((await cpu.getState()).p & ZERO) === 0, true); // Result is not zero
        assert.strictEqual(((await cpu.getState()).p & NEGATIVE) !== 0, true); // Result is negative (bit 7 set)
    });
});
