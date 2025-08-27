import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { ZERO, NEGATIVE, CARRY } from "../constants.ts";
import { createCPU, getStatusRegister } from "./utils.ts";

describe("Final extreme edge cases for 100% coverage", () => {
    // Test all shift operations with different addressing modes and values
    it("should test all conditional branches in shift operations", async () => {
        // ASL Tests
        {
            // ASL Zero Page - test carry false path
            const cpu = createCPU();
            await cpu.setProgramCounter(0);
            await cpu.loadByte(0, 0x06); // ASL Zero Page
            await cpu.loadByte(1, 0x80); // Zero page address
            await cpu.loadByte(0x80, 0x01); // Won't set carry

            await cpu.step();
            assert.strictEqual(await cpu.readByte(0x80), 0x02); // 0x01 << 1 = 0x02
            assert.strictEqual(((await getStatusRegister(cpu)) & CARRY) === 0, true); // No carry set
        }

        // LSR Tests
        {
            // LSR Zero Page - test carry false path
            const cpu = createCPU();
            await cpu.setProgramCounter(0);
            await cpu.loadByte(0, 0x46); // LSR Zero Page
            await cpu.loadByte(1, 0x80); // Zero page address
            await cpu.loadByte(0x80, 0x02); // Won't set carry from bit 0

            await cpu.step();
            assert.strictEqual(await cpu.readByte(0x80), 0x01); // 0x02 >> 1 = 0x01
            assert.strictEqual(((await getStatusRegister(cpu)) & CARRY) === 0, true); // No carry set
        }

        // ROL Tests
        {
            // ROL Zero Page - test with carry in but no carry out
            const cpu = createCPU();
            await cpu.setProgramCounter(0);
            await cpu.loadByte(0, 0x26); // ROL Zero Page
            await cpu.loadByte(1, 0x80); // Zero page address
            await cpu.loadByte(0x80, 0x40); // Bit 6 set, won't set carry out
            await cpu.setStatusRegister(CARRY); // Set carry flag

            await cpu.step();
            assert.strictEqual(await cpu.readByte(0x80), 0x81); // 0x40 << 1 | 0x01 = 0x81
            assert.strictEqual(((await getStatusRegister(cpu)) & CARRY) === 0, true); // No carry out
            assert.strictEqual(((await getStatusRegister(cpu)) & NEGATIVE) !== 0, 
                true,
            ); // Negative flag set
        }

        // ROR Tests
        {
            // ROR Zero Page - test with carry in and carry out
            const cpu = createCPU();
            await cpu.setProgramCounter(0);
            await cpu.loadByte(0, 0x66); // ROR Zero Page
            await cpu.loadByte(1, 0x80); // Zero page address
            await cpu.loadByte(0x80, 0x03); // Bit 0 and 1 set, will set carry out
            await cpu.setStatusRegister(CARRY); // Set carry flag

            await cpu.step();
            assert.strictEqual(await cpu.readByte(0x80), 0x81); // (0x03 >> 1) | 0x80 = 0x81
            assert.strictEqual(((await getStatusRegister(cpu)) & CARRY) !== 0, true); // Carry set
            assert.strictEqual(((await getStatusRegister(cpu)) & NEGATIVE) !== 0, 
                true,
            ); // Negative flag set
        }
    });

    // Test specific edge cases for shift operations to cover all lines
    it("should test ASL edge cases", async () => {
        // ASL Zero Page,X with no carry
        const cpu = createCPU();
        await cpu.setProgramCounter(0);
        await cpu.loadByte(0, 0x16); // ASL Zero Page,X
        await cpu.loadByte(1, 0x80); // Zero page address
        cpu.setXRegister(0x01); // X = 1, so effective address is 0x81
        await cpu.loadByte(0x81, 0x40); // Value to shift (won't set carry)

        await cpu.step();
        assert.strictEqual(await cpu.readByte(0x81), 0x80); // 0x40 << 1 = 0x80
        assert.strictEqual(((await getStatusRegister(cpu)) & CARRY) === 0, true); // No carry out
        assert.strictEqual(((await getStatusRegister(cpu)) & NEGATIVE) !== 0, true); // Negative flag set
    });

    // Additional edge cases for ROR
    it("should test ROR edge cases", async () => {
        // ROR Zero Page,X with no carry in, carry out
        const cpu = createCPU();
        await cpu.setProgramCounter(0);
        await cpu.loadByte(0, 0x76); // ROR Zero Page,X
        await cpu.loadByte(1, 0x80); // Zero page address
        cpu.setXRegister(0x01); // X = 1, so effective address is 0x81
        await cpu.loadByte(0x81, 0x01); // Value to rotate (will set carry out)
        await cpu.setStatusRegister(0); // Clear carry flag

        await cpu.step();
        assert.strictEqual(await cpu.readByte(0x81), 0x00); // 0x01 >> 1 = 0x00 (no carry in)
        assert.strictEqual(((await getStatusRegister(cpu)) & CARRY) !== 0, true); // Carry should be set
        assert.strictEqual(((await getStatusRegister(cpu)) & ZERO) !== 0, true); // Zero flag set
    });
});
