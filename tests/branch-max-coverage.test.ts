import { describe, expect, it } from "bun:test";
import { CARRY, ZERO, OVERFLOW, NEGATIVE } from "../constants";
import { createCPU, getProgramCounter } from "./utils";

describe("Branch instruction complete coverage", () => {
    // Test all branch instructions systematically to ensure 100% coverage
    it("should test all branch instructions with positive offsets and page crosses", async () => {
        const cpu = createCPU();

        // BCC - Branch on Carry Clear
        await cpu.loadByte(0x10f0, 0x90); // BCC
        await cpu.loadByte(0x10f1, 0x20); // Offset (positive)
        await cpu.clearStatusFlag(CARRY); // Clear carry (condition true)
        await cpu.setProgramCounter(0x10f0);
        let cycles = await cpu.step();
        expect(cycles).toBe(4); // 3 + 1 for page cross
        expect(await await getProgramCounter(cpu)).toBe(0x1112); // 0x10F2 + 0x20 = 0x1112

        // Reset PC for next test
        await cpu.setProgramCounter(0x10f0);
        await cpu.setStatusFlag(CARRY); // Set carry (condition false)
        cycles = await cpu.step();
        expect(cycles).toBe(2); // No branch taken
        expect(await await getProgramCounter(cpu)).toBe(0x10f2);

        // BCS - Branch on Carry Set
        await cpu.loadByte(0x20f0, 0xb0); // BCS
        await cpu.loadByte(0x20f1, 0x20); // Offset (positive)
        await cpu.setStatusFlag(CARRY); // Set carry (condition true)
        await cpu.setProgramCounter(0x20f0);
        cycles = await cpu.step();
        expect(cycles).toBe(4); // 3 + 1 for page cross
        expect(await await getProgramCounter(cpu)).toBe(0x2112); // 0x20F2 + 0x20 = 0x2112

        // Reset PC for next test
        await cpu.setProgramCounter(0x20f0);
        await cpu.clearStatusFlag(CARRY); // Clear carry (condition false)
        cycles = await cpu.step();
        expect(cycles).toBe(2); // No branch taken
        expect(await await getProgramCounter(cpu)).toBe(0x20f2);

        // BEQ - Branch on Equal (Zero Set)
        await cpu.loadByte(0x30f0, 0xf0); // BEQ
        await cpu.loadByte(0x30f1, 0x20); // Offset (positive)
        await cpu.setStatusFlag(ZERO); // Set zero (condition true)
        await cpu.setProgramCounter(0x30f0);
        cycles = await cpu.step();
        expect(cycles).toBe(4); // 3 + 1 for page cross
        expect(await await getProgramCounter(cpu)).toBe(0x3112); // 0x30F2 + 0x20 = 0x3112

        // Reset PC for next test
        await cpu.setProgramCounter(0x30f0);
        await cpu.clearStatusFlag(ZERO); // Clear zero (condition false)
        cycles = await cpu.step();
        expect(cycles).toBe(2); // No branch taken
        expect(await await getProgramCounter(cpu)).toBe(0x30f2);

        // BMI - Branch on Minus (Negative Set)
        await cpu.loadByte(0x40f0, 0x30); // BMI
        await cpu.loadByte(0x40f1, 0x20); // Offset (positive)
        await cpu.setStatusFlag(NEGATIVE); // Set negative (condition true)
        await cpu.setProgramCounter(0x40f0);
        cycles = await cpu.step();
        expect(cycles).toBe(4); // 3 + 1 for page cross
        expect(await await getProgramCounter(cpu)).toBe(0x4112); // 0x40F2 + 0x20 = 0x4112

        // Reset PC for next test
        await cpu.setProgramCounter(0x40f0);
        await cpu.clearStatusFlag(NEGATIVE); // Clear negative (condition false)
        cycles = await cpu.step();
        expect(cycles).toBe(2); // No branch taken
        expect(await await getProgramCounter(cpu)).toBe(0x40f2);
    });

    it("should test all branch instructions with negative offsets and page crosses", async () => {
        const cpu = createCPU();

        // BNE - Branch on Not Equal (Zero Clear)
        await cpu.loadByte(0x1010, 0xd0); // BNE
        await cpu.loadByte(0x1011, 0x80); // Offset (negative, -128 in 2's complement)
        await cpu.clearStatusFlag(ZERO); // Clear zero (condition true)
        await cpu.setProgramCounter(0x1010);
        let cycles = await cpu.step();
        expect(cycles).toBe(4); // 3 + 1 for page cross
        expect(await await getProgramCounter(cpu)).toBe(0x0f92); // 0x1012 - 128 = 0x0F92

        // Reset PC for next test
        await cpu.setProgramCounter(0x1010);
        await cpu.setStatusFlag(ZERO); // Set zero (condition false)
        cycles = await cpu.step();
        expect(cycles).toBe(2); // No branch taken
        expect(await await getProgramCounter(cpu)).toBe(0x1012);

        // BPL - Branch on Plus (Negative Clear)
        await cpu.loadByte(0x2010, 0x10); // BPL
        await cpu.loadByte(0x2011, 0x80); // Offset (negative, -128 in 2's complement)
        await cpu.clearStatusFlag(NEGATIVE); // Clear negative (condition true)
        await cpu.setProgramCounter(0x2010);
        cycles = await cpu.step();
        expect(cycles).toBe(4); // 3 + 1 for page cross
        expect(await await getProgramCounter(cpu)).toBe(0x1f92); // 0x2012 - 128 = 0x1F92

        // Reset PC for next test
        await cpu.setProgramCounter(0x2010);
        await cpu.setStatusFlag(NEGATIVE); // Set negative (condition false)
        cycles = await cpu.step();
        expect(cycles).toBe(2); // No branch taken
        expect(await await getProgramCounter(cpu)).toBe(0x2012);

        // BVC - Branch on Overflow Clear
        await cpu.loadByte(0x3010, 0x50); // BVC
        await cpu.loadByte(0x3011, 0x80); // Offset (negative, -128 in 2's complement)
        await cpu.clearStatusFlag(OVERFLOW); // Clear overflow (condition true)
        await cpu.setProgramCounter(0x3010);
        cycles = await cpu.step();
        expect(cycles).toBe(4); // 3 + 1 for page cross
        expect(await await getProgramCounter(cpu)).toBe(0x2f92); // 0x3012 - 128 = 0x2F92

        // Reset PC for next test
        await cpu.setProgramCounter(0x3010);
        await cpu.setStatusFlag(OVERFLOW); // Set overflow (condition false)
        cycles = await cpu.step();
        expect(cycles).toBe(2); // No branch taken
        expect(await await getProgramCounter(cpu)).toBe(0x3012);

        // BVS - Branch on Overflow Set
        await cpu.loadByte(0x4010, 0x70); // BVS
        await cpu.loadByte(0x4011, 0x80); // Offset (negative, -128 in 2's complement)
        await cpu.setStatusFlag(OVERFLOW); // Set overflow (condition true)
        await cpu.setProgramCounter(0x4010);
        cycles = await cpu.step();
        expect(cycles).toBe(4); // 3 + 1 for page cross
        expect(await await getProgramCounter(cpu)).toBe(0x3f92); // 0x4012 - 128 = 0x3F92

        // Reset PC for next test
        await cpu.setProgramCounter(0x4010);
        await cpu.clearStatusFlag(OVERFLOW); // Clear overflow (condition false)
        cycles = await cpu.step();
        expect(cycles).toBe(2); // No branch taken
        expect(await await getProgramCounter(cpu)).toBe(0x4012);
    });
});
