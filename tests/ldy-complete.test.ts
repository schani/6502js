import { describe, expect, it } from "bun:test";
import {
    CARRY,
    ZERO,
    INTERRUPT,
    DECIMAL,
    BREAK,
    UNUSED,
    OVERFLOW,
    NEGATIVE,
} from "../constants";
import { createCPU, getYRegister } from "./utils";

describe("LDY instruction complete coverage", () => {
    it("should cover LDY instruction with all addressing modes", async () => {
        // Create an uninitialized CPU
        const cpu = createCPU();

        // Test LDY Immediate
        await cpu.loadByte(0x1000, 0xa0); // LDY #$42
        await cpu.loadByte(0x1001, 0x42);
        await cpu.setProgramCounter(0x1000);
        let cycles = await cpu.step();
        expect(cycles).toBe(2);
        expect(await await getYRegister(cpu)).toBe(0x42);

        // Test LDY Zero Page
        await cpu.loadByte(0x1002, 0xa4); // LDY $50
        await cpu.loadByte(0x1003, 0x50);
        await cpu.loadByte(0x0050, 0x99);
        await cpu.setProgramCounter(0x1002);
        cycles = await cpu.step();
        expect(cycles).toBe(3);
        expect(await await getYRegister(cpu)).toBe(0x99);

        // Test LDY Zero Page,X
        await cpu.loadByte(0x1004, 0xb4); // LDY $60,X
        await cpu.loadByte(0x1005, 0x60);
        await cpu.loadByte(0x0070, 0x88); // Value at $60 + $10
        await cpu.setXRegister(0x10);
        await cpu.setProgramCounter(0x1004);
        cycles = await cpu.step();
        expect(cycles).toBe(4);
        expect(await await getYRegister(cpu)).toBe(0x88);

        // Test LDY Absolute
        await cpu.loadByte(0x1006, 0xac); // LDY $2000
        await cpu.loadByte(0x1007, 0x00);
        await cpu.loadByte(0x1008, 0x20);
        await cpu.loadByte(0x2000, 0x77);
        await cpu.setProgramCounter(0x1006);
        cycles = await cpu.step();
        expect(cycles).toBe(4);
        expect(await await getYRegister(cpu)).toBe(0x77);

        // Test LDY Absolute,X
        await cpu.loadByte(0x1009, 0xbc); // LDY $2100,X
        await cpu.loadByte(0x100a, 0x00);
        await cpu.loadByte(0x100b, 0x21);
        await cpu.loadByte(0x2110, 0x66); // Value at $2100 + $10
        await cpu.setXRegister(0x10);
        await cpu.setProgramCounter(0x1009);
        cycles = await cpu.step();
        expect(cycles).toBe(4);
        expect(await await getYRegister(cpu)).toBe(0x66);

        // Test LDY Absolute,X with page crossing
        await cpu.loadByte(0x100c, 0xbc); // LDY $21F0,X
        await cpu.loadByte(0x100d, 0xf0);
        await cpu.loadByte(0x100e, 0x21);
        await cpu.loadByte(0x2200, 0x55); // Value at $21F0 + $10 (page boundary crossed)
        await cpu.setXRegister(0x10);
        await cpu.setProgramCounter(0x100c);
        cycles = await cpu.step();
        expect(cycles).toBe(5); // +1 cycle for page boundary crossing
        expect(await await getYRegister(cpu)).toBe(0x55);
    });

    it("should test negative/zero flag setting with LDY", async () => {
        const cpu = createCPU();

        // Test LDY with zero result
        await cpu.loadByte(0x1000, 0xa0); // LDY #$00
        await cpu.loadByte(0x1001, 0x00);
        await cpu.setProgramCounter(0x1000);
        await cpu.clearStatusFlag(ZERO); // Clear zero flag
        await cpu.clearStatusFlag(NEGATIVE); // Clear negative flag
        let cycles = await cpu.step();
        expect(cycles).toBe(2);
        expect(await await getYRegister(cpu)).toBe(0x00);
        expect(((await cpu.getState()).p & ZERO) !== 0).toBe(true); // Zero flag should be set
        expect(((await cpu.getState()).p & NEGATIVE) === 0).toBe(true); // Negative flag should be clear

        // Test LDY with negative result
        await cpu.loadByte(0x1002, 0xa0); // LDY #$80
        await cpu.loadByte(0x1003, 0x80);
        await cpu.setProgramCounter(0x1002);
        await cpu.clearStatusFlag(ZERO); // Clear zero flag
        await cpu.clearStatusFlag(NEGATIVE); // Clear negative flag
        cycles = await cpu.step();
        expect(cycles).toBe(2);
        expect(await await getYRegister(cpu)).toBe(0x80);
        expect(((await cpu.getState()).p & ZERO) === 0).toBe(true); // Zero flag should be clear
        expect(((await cpu.getState()).p & NEGATIVE) !== 0).toBe(true); // Negative flag should be set
    });
});
