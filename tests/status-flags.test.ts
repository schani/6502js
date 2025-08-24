import { describe, expect, it } from "bun:test";
import { createCPU } from "./utils";
import { CARRY, INTERRUPT, DECIMAL, OVERFLOW } from "../constants";

describe("Status flag instructions", () => {
    it("should perform CLC instruction", async () => {
        const cpu = createCPU();

        // Set up CPU state
        await cpu.setStatusFlag(CARRY); // Set carry flag

        // Set up memory
        await cpu.loadByte(0, 0x18); // CLC
        await cpu.setProgramCounter(0);

        const cycles = await cpu.step();

        expect(((await cpu.getState()).p & CARRY) === 0).toBe(true); // Carry should be cleared
        expect((await cpu.getState()).pc).toBe(1);
        expect(cycles).toBe(2);
    });

    it("should perform SEC instruction", async () => {
        const cpu = createCPU();

        // Set up CPU state
        await cpu.clearStatusFlag(CARRY); // Clear carry flag

        // Set up memory
        await cpu.loadByte(0, 0x38); // SEC
        await cpu.setProgramCounter(0);

        const cycles = await cpu.step();

        expect(((await cpu.getState()).p & CARRY) !== 0).toBe(true); // Carry should be set
        expect((await cpu.getState()).pc).toBe(1);
        expect(cycles).toBe(2);
    });

    it("should perform CLI instruction", async () => {
        const cpu = createCPU();

        // Set up CPU state
        await cpu.setStatusFlag(INTERRUPT); // Set interrupt disable flag

        // Set up memory
        await cpu.loadByte(0, 0x58); // CLI
        await cpu.setProgramCounter(0);

        const cycles = await cpu.step();

        expect(((await cpu.getState()).p & INTERRUPT) === 0).toBe(true); // Interrupt disable should be cleared
        expect((await cpu.getState()).pc).toBe(1);
        expect(cycles).toBe(2);
    });

    it("should perform SEI instruction", async () => {
        const cpu = createCPU();

        // Set up CPU state
        await cpu.clearStatusFlag(INTERRUPT); // Clear interrupt disable flag

        // Set up memory
        await cpu.loadByte(0, 0x78); // SEI
        await cpu.setProgramCounter(0);

        const cycles = await cpu.step();

        expect(((await cpu.getState()).p & INTERRUPT) !== 0).toBe(true); // Interrupt disable should be set
        expect((await cpu.getState()).pc).toBe(1);
        expect(cycles).toBe(2);
    });

    it("should perform CLD instruction", async () => {
        const cpu = createCPU();

        // Set up CPU state
        await cpu.setStatusFlag(DECIMAL); // Set decimal flag

        // Set up memory
        await cpu.loadByte(0, 0xd8); // CLD
        await cpu.setProgramCounter(0);

        const cycles = await cpu.step();

        expect(((await cpu.getState()).p & DECIMAL) === 0).toBe(true); // Decimal flag should be cleared
        expect((await cpu.getState()).pc).toBe(1);
        expect(cycles).toBe(2);
    });

    it("should perform SED instruction", async () => {
        const cpu = createCPU();

        // Set up CPU state
        await cpu.clearStatusFlag(DECIMAL); // Clear decimal flag

        // Set up memory
        await cpu.loadByte(0, 0xf8); // SED
        await cpu.setProgramCounter(0);

        const cycles = await cpu.step();

        expect(((await cpu.getState()).p & DECIMAL) !== 0).toBe(true); // Decimal flag should be set
        expect((await cpu.getState()).pc).toBe(1);
        expect(cycles).toBe(2);
    });

    it("should perform CLV instruction", async () => {
        const cpu = createCPU();

        // Set up CPU state
        await cpu.setStatusFlag(OVERFLOW); // Set overflow flag

        // Set up memory
        await cpu.loadByte(0, 0xb8); // CLV
        await cpu.setProgramCounter(0);

        const cycles = await cpu.step();

        expect(((await cpu.getState()).p & OVERFLOW) === 0).toBe(true); // Overflow flag should be cleared
        expect((await cpu.getState()).pc).toBe(1);
        expect(cycles).toBe(2);
    });
});
