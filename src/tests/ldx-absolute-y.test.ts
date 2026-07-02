import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createCPU, getXRegister, getProgramCounter } from "./utils.ts";
import { ZERO, NEGATIVE } from "../core/constants.ts";

describe("LDX Absolute,Y addressing mode", () => {
    it("should test LDX Absolute,Y with page crossing", async () => {
        const cpu = createCPU();

        // Setup for LDX Absolute,Y with page crossing
        await cpu.setProgramCounter(0x1000);
        await cpu.loadByte(0x1000, 0xbe); // LDX Absolute,Y
        await cpu.loadByte(0x1001, 0xff); // Low byte of address (0x01FF)
        await cpu.loadByte(0x1002, 0x01); // High byte of address
        await cpu.setYRegister(0x01); // Y register = 1, effective address = 0x0200

        // Value to load at the effective address
        await cpu.loadByte(0x0200, 0x42);

        // Execute the instruction
        await cpu.step();

                
        assert.strictEqual(await getXRegister(cpu), 0x42);

        // Check PC was incremented correctly
        assert.strictEqual(await getProgramCounter(cpu), 0x1003);

        // Now test without page crossing
        await cpu.setProgramCounter(0x1000);
        await cpu.loadByte(0x1000, 0xbe); // LDX Absolute,Y
        await cpu.loadByte(0x1001, 0x50); // Low byte of address (0x0150)
        await cpu.loadByte(0x1002, 0x01); // High byte of address
        await cpu.setYRegister(0x01); // Y register = 1, effective address = 0x0151

        // Value to load at the effective address
        await cpu.loadByte(0x0151, 0x84); // Negative value

        // Execute the instruction
        await cpu.step();

                
        // Check if X register was loaded with the value
        assert.strictEqual(await getXRegister(cpu), 0x84);

        // Check if negative flag was set
        assert.strictEqual(((await cpu.getState()).p & NEGATIVE) !== 0, true);

        // One more test with zero result
        await cpu.setProgramCounter(0x1000);
        await cpu.loadByte(0x1000, 0xbe); // LDX Absolute,Y
        await cpu.loadByte(0x1001, 0x50); // Low byte of address (0x0150)
        await cpu.loadByte(0x1002, 0x01); // High byte of address
        await cpu.setYRegister(0x01); // Y register = 1, effective address = 0x0151

        // Value to load at the effective address
        await cpu.loadByte(0x0151, 0x00); // Zero value

        // Execute the instruction
        await cpu.step();

        // Check if X register was loaded with the value
        assert.strictEqual(await getXRegister(cpu), 0x00);

        // Check if zero flag was set
        assert.strictEqual(((await cpu.getState()).p & ZERO) !== 0, true);
    });
});
