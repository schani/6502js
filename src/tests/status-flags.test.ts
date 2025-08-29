import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createCPU } from "./utils.ts";
import { CARRY, INTERRUPT, DECIMAL, OVERFLOW } from "../core/constants.ts";

describe("Status flag instructions", () => {
    it("should perform CLC instruction", async () => {
        const cpu = createCPU();

        // Set up CPU state
        await cpu.setStatusFlag(CARRY); // Set carry flag

        // Set up memory
        await cpu.loadByte(0, 0x18); // CLC
        await cpu.setProgramCounter(0);

        await cpu.step();

        assert.strictEqual(((await cpu.getState()).p & CARRY) === 0, true); // Carry should be cleared
        assert.strictEqual((await cpu.getState()).pc, 1);
        
    });

    it("should perform SEC instruction", async () => {
        const cpu = createCPU();

        // Set up CPU state
        await cpu.clearStatusFlag(CARRY); // Clear carry flag

        // Set up memory
        await cpu.loadByte(0, 0x38); // SEC
        await cpu.setProgramCounter(0);

        await cpu.step();

        assert.strictEqual(((await cpu.getState()).p & CARRY) !== 0, true); // Carry should be set
        assert.strictEqual((await cpu.getState()).pc, 1);
        
    });

    it("should perform CLI instruction", async () => {
        const cpu = createCPU();

        // Set up CPU state
        await cpu.setStatusFlag(INTERRUPT); // Set interrupt disable flag

        // Set up memory
        await cpu.loadByte(0, 0x58); // CLI
        await cpu.setProgramCounter(0);

        await cpu.step();

        assert.strictEqual(((await cpu.getState()).p & INTERRUPT) === 0, true); // Interrupt disable should be cleared
        assert.strictEqual((await cpu.getState()).pc, 1);
        
    });

    it("should perform SEI instruction", async () => {
        const cpu = createCPU();

        // Set up CPU state
        await cpu.clearStatusFlag(INTERRUPT); // Clear interrupt disable flag

        // Set up memory
        await cpu.loadByte(0, 0x78); // SEI
        await cpu.setProgramCounter(0);

        await cpu.step();

        assert.strictEqual(((await cpu.getState()).p & INTERRUPT) !== 0, true); // Interrupt disable should be set
        assert.strictEqual((await cpu.getState()).pc, 1);
        
    });

    it("should perform CLD instruction", async () => {
        const cpu = createCPU();

        // Set up CPU state
        await cpu.setStatusFlag(DECIMAL); // Set decimal flag

        // Set up memory
        await cpu.loadByte(0, 0xd8); // CLD
        await cpu.setProgramCounter(0);

        await cpu.step();

        assert.strictEqual(((await cpu.getState()).p & DECIMAL) === 0, true); // Decimal flag should be cleared
        assert.strictEqual((await cpu.getState()).pc, 1);
        
    });

    it("should perform SED instruction", async () => {
        const cpu = createCPU();

        // Set up CPU state
        await cpu.clearStatusFlag(DECIMAL); // Clear decimal flag

        // Set up memory
        await cpu.loadByte(0, 0xf8); // SED
        await cpu.setProgramCounter(0);

        await cpu.step();

        assert.strictEqual(((await cpu.getState()).p & DECIMAL) !== 0, true); // Decimal flag should be set
        assert.strictEqual((await cpu.getState()).pc, 1);
        
    });

    it("should perform CLV instruction", async () => {
        const cpu = createCPU();

        // Set up CPU state
        await cpu.setStatusFlag(OVERFLOW); // Set overflow flag

        // Set up memory
        await cpu.loadByte(0, 0xb8); // CLV
        await cpu.setProgramCounter(0);

        await cpu.step();

        assert.strictEqual(((await cpu.getState()).p & OVERFLOW) === 0, true); // Overflow flag should be cleared
        assert.strictEqual((await cpu.getState()).pc, 1);
        
    });
});
