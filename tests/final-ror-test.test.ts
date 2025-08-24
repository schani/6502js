import { describe, expect, it } from "bun:test";
import { CARRY, ZERO, NEGATIVE } from "../constants";
import { createCPU } from "./utils";

// This test file is dedicated to achieving 100% coverage of the ROR Absolute,X instruction
describe("ROR Absolute,X Complete Coverage", () => {
    it("should test ROR Absolute,X with carry set (line 1579)", async () => {
        // This test targets the line cpu.p |= CARRY;
        const cpu = createCPU();

        // Initialize CPU state
        await cpu.setProgramCounter(0);
        await cpu.loadByte(0, 0x7e); // ROR Absolute,X
        await cpu.loadByte(1, 0x00); // Low byte of address
        await cpu.loadByte(2, 0x30); // High byte of address
        await cpu.setXRegister(0x05); // X register offset
        await cpu.clearStatusFlag(CARRY); // Clear carry flag initially

        // Set memory value with least significant bit set to 1
        // so that newCarry will be true and line 1579 will execute
        await cpu.loadByte(0x3005, 0x01);

        // Execute the instruction
        await cpu.step();

        // Verify the results
        // 0x01 >> 1 = 0x00 (with carry flag set)
        expect(await cpu.readByte(0x3005)).toBe(0x00);
        expect(((await cpu.getState()).p & CARRY) !== 0).toBe(true); // Carry should be set
        expect(((await cpu.getState()).p & ZERO) !== 0).toBe(true); // Zero flag should be set
    });

    it("should test ROR Absolute,X with carry clear (line 1581)", async () => {
        // This test targets the line cpu.p &= ~CARRY;
        const cpu = createCPU();

        // Initialize CPU state
        await cpu.setProgramCounter(0);
        await cpu.loadByte(0, 0x7e); // ROR Absolute,X
        await cpu.loadByte(1, 0x00); // Low byte of address
        await cpu.loadByte(2, 0x30); // High byte of address
        await cpu.setXRegister(0x05); // X register offset
        await cpu.setStatusFlag(CARRY); // Set carry flag initially

        // Set memory value with least significant bit set to 0
        // so that newCarry will be false and line 1581 will execute
        await cpu.loadByte(0x3005, 0x02);

        // Execute the instruction
        await cpu.step();

        // Verify the results
        // 0x02 >> 1 = 0x01 (with carry flag clear)
        // Since carry was initially set, bit 7 will be 1
        // So result is 0x01 | 0x80 = 0x81
        expect(await cpu.readByte(0x3005)).toBe(0x81);
        expect(((await cpu.getState()).p & CARRY) !== 0).toBe(false); // Carry should be clear
        expect(((await cpu.getState()).p & NEGATIVE) !== 0).toBe(true); // Negative flag should be set
    });

    it("should test ROR Absolute,X with all coverage variations", async () => {
        // Test more combinations for complete coverage
        const cpu = createCPU();

        // Test 1: Value with bit 0 set (odd), carry initially clear
        await cpu.setProgramCounter(0);
        await cpu.loadByte(0, 0x7e); // ROR Absolute,X
        await cpu.loadByte(1, 0x00); // Low byte of address
        await cpu.loadByte(2, 0x40); // High byte of address
        await cpu.setXRegister(0x10); // X register offset
        await cpu.clearStatusFlag(CARRY); // Clear carry flag initially
        await cpu.loadByte(0x4010, 0x55); // 0101 0101

        await cpu.step();

        // 0x55 >> 1 = 0x2A (with carry flag set due to LSB being 1)
        expect(await cpu.readByte(0x4010)).toBe(0x2a);
        expect(((await cpu.getState()).p & CARRY) !== 0).toBe(true); // Carry should be set

        // Test 2: Value with bit 0 clear (even), carry initially set
        await cpu.setProgramCounter(0);
        await cpu.loadByte(0, 0x7e); // ROR Absolute,X
        await cpu.loadByte(1, 0x00); // Low byte of address
        await cpu.loadByte(2, 0x40); // High byte of address
        await cpu.setXRegister(0x10); // X register offset
        await cpu.setStatusFlag(CARRY); // Set carry flag initially
        await cpu.loadByte(0x4010, 0xaa); // 1010 1010

        await cpu.step();

        // 0xAA >> 1 = 0x55 with carry in to bit 7, so 0xD5
        expect(await cpu.readByte(0x4010)).toBe(0xd5);
        expect(((await cpu.getState()).p & CARRY) !== 0).toBe(false); // Carry should be clear
        expect(((await cpu.getState()).p & NEGATIVE) !== 0).toBe(true); // Negative flag should be set

        // Test 3: Zero result
        await cpu.setProgramCounter(0);
        await cpu.loadByte(0, 0x7e); // ROR Absolute,X
        await cpu.loadByte(1, 0x00); // Low byte of address
        await cpu.loadByte(2, 0x40); // High byte of address
        await cpu.setXRegister(0x10); // X register offset
        await cpu.clearStatusFlag(CARRY); // Clear carry flag initially
        await cpu.loadByte(0x4010, 0x00); // 0000 0000

        await cpu.step();

        // 0x00 >> 1 = 0x00 (with carry flag clear)
        expect(await cpu.readByte(0x4010)).toBe(0x00);
        expect(((await cpu.getState()).p & CARRY) !== 0).toBe(false); // Carry should be clear
        expect(((await cpu.getState()).p & ZERO) !== 0).toBe(true); // Zero flag should be set
    });
});
