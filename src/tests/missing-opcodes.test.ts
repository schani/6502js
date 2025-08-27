import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { ZERO, NEGATIVE, CARRY } from "../core/constants.ts";
import { getAccumulator, createCPU } from "./utils.ts";
describe("Missing opcodes tests for 100% coverage", () => {
    it("should test LDX Absolute (0xAE)", async () => {
        const cpu = createCPU();

        // Test loading zero value
        await cpu.setProgramCounter(0);
        await cpu.loadByte(0, 0xae); // LDX Absolute
        await cpu.loadByte(1, 0x00); // Low byte of address
        await cpu.loadByte(2, 0x10); // High byte of address
        await cpu.loadByte(0x1000, 0x00); // Value to load

        let cycles = await cpu.step();
        assert.strictEqual(cycles, 4); // Always 4 cycles for LDX Absolute
        assert.strictEqual((await cpu.getState()).x, 0x00);
        assert.strictEqual(((await cpu.getState()).p & ZERO) !== 0, true); // Zero flag should be set

        // Test loading positive value
        await cpu.setProgramCounter(0);
        await cpu.loadByte(0, 0xae); // LDX Absolute
        await cpu.loadByte(1, 0x00); // Low byte of address
        await cpu.loadByte(2, 0x10); // High byte of address
        await cpu.loadByte(0x1000, 0x42); // Value to load

        cycles = await cpu.step();
        assert.strictEqual(cycles, 4);
        assert.strictEqual((await cpu.getState()).x, 0x42);
        assert.strictEqual(((await cpu.getState()).p & ZERO) === 0, true); // Zero flag should be cleared
        assert.strictEqual(((await cpu.getState()).p & NEGATIVE) === 0, true); // Negative flag should be cleared

        // Test loading negative value
        await cpu.setProgramCounter(0);
        await cpu.loadByte(0, 0xae); // LDX Absolute
        await cpu.loadByte(1, 0x00); // Low byte of address
        await cpu.loadByte(2, 0x10); // High byte of address
        await cpu.loadByte(0x1000, 0x80); // Value to load (negative because bit 7 is set)

        cycles = await cpu.step();
        assert.strictEqual(cycles, 4);
        assert.strictEqual((await cpu.getState()).x, 0x80);
        assert.strictEqual(((await cpu.getState()).p & ZERO) === 0, true); // Zero flag should be cleared
        assert.strictEqual(((await cpu.getState()).p & NEGATIVE) !== 0, true); // Negative flag should be set
    });

    it("should test CMP Absolute (0xCD)", async () => {
        const cpu = createCPU();

        // Test with equal values
        await cpu.setProgramCounter(0);
        await cpu.loadByte(0, 0xcd); // CMP Absolute
        await cpu.loadByte(1, 0x00); // Low byte of address
        await cpu.loadByte(2, 0x10); // High byte of address
        await cpu.loadByte(0x1000, 0x42); // Value to compare
        await cpu.setAccumulator(0x42); // A equals memory

        let cycles = await cpu.step();
        assert.strictEqual(cycles, 4); // Always 4 cycles for CMP Absolute
        assert.strictEqual(((await cpu.getState()).p & ZERO) !== 0, true); // Zero flag set (values are equal)
        assert.strictEqual(((await cpu.getState()).p & CARRY) !== 0, true); // Carry flag set (A >= M)
        assert.strictEqual(((await cpu.getState()).p & NEGATIVE) === 0, true); // Negative flag clear

        // Test with A > M
        await cpu.setProgramCounter(0);
        await cpu.loadByte(0, 0xcd); // CMP Absolute
        await cpu.loadByte(1, 0x00); // Low byte of address
        await cpu.loadByte(2, 0x10); // High byte of address
        await cpu.loadByte(0x1000, 0x30); // Value to compare
        await cpu.setAccumulator(0x42); // A greater than memory

        cycles = await cpu.step();
        assert.strictEqual(cycles, 4);
        assert.strictEqual(((await cpu.getState()).p & ZERO) === 0, true); // Zero flag clear (values are not equal)
        assert.strictEqual(((await cpu.getState()).p & CARRY) !== 0, true); // Carry flag set (A >= M)
        assert.strictEqual(((await cpu.getState()).p & NEGATIVE) === 0, true); // Negative flag clear

        // Test with A < M
        await cpu.setProgramCounter(0);
        await cpu.loadByte(0, 0xcd); // CMP Absolute
        await cpu.loadByte(1, 0x00); // Low byte of address
        await cpu.loadByte(2, 0x10); // High byte of address
        await cpu.loadByte(0x1000, 0x60); // Value to compare
        await cpu.setAccumulator(0x42); // A less than memory

        cycles = await cpu.step();
        assert.strictEqual(cycles, 4);
        assert.strictEqual(((await cpu.getState()).p & ZERO) === 0, true); // Zero flag clear (values are not equal)
        assert.strictEqual(((await cpu.getState()).p & CARRY) === 0, true); // Carry flag clear (A < M)
        assert.strictEqual(((await cpu.getState()).p & NEGATIVE) !== 0, true); // Negative flag may be set based on result
    });

    // Testing more of the uncovered instructions
    it("should test loadWord and readWord methods", async () => {
        const cpu = createCPU();

        // Test writing a word
        await cpu.loadWord(0x1000, 0x1234);

        // Verify the value was written correctly (little-endian)
        assert.strictEqual(await cpu.readByte(0x1000), 0x34); // Low byte
        assert.strictEqual(await cpu.readByte(0x1001), 0x12); // High byte

        // Verify we can read it back as a word
        assert.strictEqual(await cpu.readWord(0x1000), 0x1234);

        // Test writing at memory boundary
        await cpu.loadWord(0xffff, 0x4567);

        // Verify the value was written correctly, wrapping around to address 0
        assert.strictEqual(await cpu.readByte(0xffff), 0x67); // Low byte
        assert.strictEqual(await cpu.readByte(0x0000), 0x45); // High byte (wrapped)

        // Verify we can read it back as a word, even at the boundary
        assert.strictEqual(await cpu.readWord(0xffff), 0x4567);
    });

    // Test remaining shift operations that might be uncovered
    it("should test all shift and rotate operations with all flags", async () => {
        const cpu = createCPU();

        // Test LSR with zero input and zero output (no carry)
        await cpu.setProgramCounter(0);
        await cpu.loadByte(0, 0x4a); // LSR A
        await cpu.setAccumulator(0x00);

        await cpu.step();
        assert.strictEqual(await await getAccumulator(cpu), 0x00);
        assert.strictEqual(((await cpu.getState()).p & CARRY) === 0, true); // Carry should be clear
        assert.strictEqual(((await cpu.getState()).p & ZERO) !== 0, true); // Zero flag should be set

        // Test ASL with zero input and zero output (no carry)
        await cpu.setProgramCounter(0);
        await cpu.loadByte(0, 0x0a); // ASL A
        await cpu.setAccumulator(0x00);

        await cpu.step();
        assert.strictEqual(await await getAccumulator(cpu), 0x00);
        assert.strictEqual(((await cpu.getState()).p & CARRY) === 0, true); // Carry should be clear
        assert.strictEqual(((await cpu.getState()).p & ZERO) !== 0, true); // Zero flag should be set

        // Test ROL with carry set and zero input
        await cpu.setProgramCounter(0);
        await cpu.loadByte(0, 0x2a); // ROL A
        await cpu.setAccumulator(0x00);
        await cpu.setStatusRegister(CARRY); // Set carry flag

        await cpu.step();
        assert.strictEqual(await await getAccumulator(cpu), 0x01); // Result should be 0x01 (carry rotated into bit 0)
        assert.strictEqual(((await cpu.getState()).p & CARRY) === 0, true); // No carry out
        assert.strictEqual(((await cpu.getState()).p & ZERO) === 0, true); // Zero flag should be clear

        // Test ROR with carry set and zero input
        await cpu.setProgramCounter(0);
        await cpu.loadByte(0, 0x6a); // ROR A
        await cpu.setAccumulator(0x00);
        await cpu.setStatusRegister(CARRY); // Set carry flag

        await cpu.step();
        assert.strictEqual(await await getAccumulator(cpu), 0x80); // Result should be 0x80 (carry rotated into bit 7)
        assert.strictEqual(((await cpu.getState()).p & CARRY) === 0, true); // No carry out
        assert.strictEqual(((await cpu.getState()).p & NEGATIVE) !== 0, true); // Negative flag should be set
    });
});
