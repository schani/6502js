import { describe, expect, it } from "bun:test";
import { createCPU } from "./utils";
import { CARRY, ZERO, OVERFLOW, NEGATIVE } from "../constants";
import {
    getAccumulator,
    getXRegister,
    getYRegister,
    getProgramCounter,
    getStackPointer,
    getStatusRegister,
} from "./utils";

describe("Instruction cycle counting and edge cases", () => {
    // Focus on simpler tests that don't rely on complex memory layouts
    it("should test BVS/BMI branches with negative offsets", async () => {
        const cpu = createCPU();

        // Setup BVS instruction with negative offset
        await cpu.loadByte(0x2000, 0x70); // BVS
        await cpu.loadByte(0x2001, 0xfb); // -5 in two's complement

        await cpu.setStatusFlag(OVERFLOW); // Set overflow flag (condition true)
        await cpu.setProgramCounter(0x2000);

        // Execute BVS
        let cycles = await cpu.step();
        expect(cycles).toBe(4); // 4 cycles for branch taken across page boundary
        expect(await getProgramCounter(cpu)).toBe(0x1ffd); // 0x2002 - 5 = 0x1FFD

        // Setup BMI instruction with negative offset
        await cpu.loadByte(0x3000, 0x30); // BMI
        await cpu.loadByte(0x3001, 0xfb); // -5 in two's complement

        await cpu.setStatusFlag(NEGATIVE); // Set negative flag (condition true)
        await cpu.setProgramCounter(0x3000);

        // Execute BMI
        cycles = await cpu.step();
        expect(cycles).toBe(4); // 4 cycles for branch taken across page boundary
        expect(await getProgramCounter(cpu)).toBe(0x2ffd); // 0x3002 - 5 = 0x2FFD
    });

    it("should test branches with branch taken", async () => {
        const cpu = createCPU();

        // Test BVC (Branch on Overflow Clear)
        await cpu.loadByte(0x1000, 0x50); // BVC
        await cpu.loadByte(0x1001, 0x10); // Branch offset (positive)

        await cpu.clearStatusFlag(OVERFLOW); // Clear overflow flag (branch condition true)
        await cpu.setProgramCounter(0x1000);

        let cycles = await cpu.step();
        expect(cycles).toBe(3); // 3 cycles for branch taken without page crossing
        expect(await getProgramCounter(cpu)).toBe(0x1012);

        // Test BVS (Branch on Overflow Set)
        await cpu.loadByte(0x2000, 0x70); // BVS
        await cpu.loadByte(0x2001, 0x10); // Branch offset (positive)

        await cpu.setStatusFlag(OVERFLOW); // Set overflow flag (branch condition true)
        await cpu.setProgramCounter(0x2000);

        cycles = await cpu.step();
        expect(cycles).toBe(3); // 3 cycles for branch taken without page crossing
        expect(await getProgramCounter(cpu)).toBe(0x2012);
    });

    it("should test branches with branch not taken", async () => {
        const cpu = createCPU();

        // Test BVC (Branch on Overflow Clear)
        await cpu.loadByte(0x1000, 0x50); // BVC
        cpu.loadByte(0x1001, 0x10); // Branch offset (not used)

        cpu.setStatusFlag(OVERFLOW); // Set overflow flag (branch condition false)
        await cpu.setProgramCounter(0x1000);

        let cycles = await cpu.step();
        expect(cycles).toBe(2); // 2 cycles for branch not taken
        expect(await getProgramCounter(cpu)).toBe(0x1002);

        // Test BVS (Branch on Overflow Set)
        await cpu.loadByte(0x2000, 0x70); // BVS
        cpu.loadByte(0x2001, 0x10); // Branch offset (not used)

        cpu.clearStatusFlag(OVERFLOW); // Clear overflow flag (branch condition false)
        await cpu.setProgramCounter(0x2000);

        cycles = await cpu.step();
        expect(cycles).toBe(2); // 2 cycles for branch not taken
        expect(await getProgramCounter(cpu)).toBe(0x2002);
    });
});
