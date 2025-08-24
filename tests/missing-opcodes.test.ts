import { describe, expect, it } from "bun:test";
import { ZERO, NEGATIVE, CARRY } from "../constants";
import { getAccumulator, createCPU } from "./utils";
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
        expect(cycles).toBe(4); // Always 4 cycles for LDX Absolute
        expect((await cpu.getState()).x).toBe(0x00);
        expect(((await cpu.getState()).p & ZERO) !== 0).toBe(true); // Zero flag should be set

        // Test loading positive value
        await cpu.setProgramCounter(0);
        await cpu.loadByte(0, 0xae); // LDX Absolute
        await cpu.loadByte(1, 0x00); // Low byte of address
        await cpu.loadByte(2, 0x10); // High byte of address
        await cpu.loadByte(0x1000, 0x42); // Value to load

        cycles = await cpu.step();
        expect(cycles).toBe(4);
        expect((await cpu.getState()).x).toBe(0x42);
        expect(((await cpu.getState()).p & ZERO) === 0).toBe(true); // Zero flag should be cleared
        expect(((await cpu.getState()).p & NEGATIVE) === 0).toBe(true); // Negative flag should be cleared

        // Test loading negative value
        await cpu.setProgramCounter(0);
        await cpu.loadByte(0, 0xae); // LDX Absolute
        await cpu.loadByte(1, 0x00); // Low byte of address
        await cpu.loadByte(2, 0x10); // High byte of address
        await cpu.loadByte(0x1000, 0x80); // Value to load (negative because bit 7 is set)

        cycles = await cpu.step();
        expect(cycles).toBe(4);
        expect((await cpu.getState()).x).toBe(0x80);
        expect(((await cpu.getState()).p & ZERO) === 0).toBe(true); // Zero flag should be cleared
        expect(((await cpu.getState()).p & NEGATIVE) !== 0).toBe(true); // Negative flag should be set
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
        expect(cycles).toBe(4); // Always 4 cycles for CMP Absolute
        expect(((await cpu.getState()).p & ZERO) !== 0).toBe(true); // Zero flag set (values are equal)
        expect(((await cpu.getState()).p & CARRY) !== 0).toBe(true); // Carry flag set (A >= M)
        expect(((await cpu.getState()).p & NEGATIVE) === 0).toBe(true); // Negative flag clear

        // Test with A > M
        await cpu.setProgramCounter(0);
        await cpu.loadByte(0, 0xcd); // CMP Absolute
        await cpu.loadByte(1, 0x00); // Low byte of address
        await cpu.loadByte(2, 0x10); // High byte of address
        await cpu.loadByte(0x1000, 0x30); // Value to compare
        await cpu.setAccumulator(0x42); // A greater than memory

        cycles = await cpu.step();
        expect(cycles).toBe(4);
        expect(((await cpu.getState()).p & ZERO) === 0).toBe(true); // Zero flag clear (values are not equal)
        expect(((await cpu.getState()).p & CARRY) !== 0).toBe(true); // Carry flag set (A >= M)
        expect(((await cpu.getState()).p & NEGATIVE) === 0).toBe(true); // Negative flag clear

        // Test with A < M
        await cpu.setProgramCounter(0);
        await cpu.loadByte(0, 0xcd); // CMP Absolute
        await cpu.loadByte(1, 0x00); // Low byte of address
        await cpu.loadByte(2, 0x10); // High byte of address
        await cpu.loadByte(0x1000, 0x60); // Value to compare
        await cpu.setAccumulator(0x42); // A less than memory

        cycles = await cpu.step();
        expect(cycles).toBe(4);
        expect(((await cpu.getState()).p & ZERO) === 0).toBe(true); // Zero flag clear (values are not equal)
        expect(((await cpu.getState()).p & CARRY) === 0).toBe(true); // Carry flag clear (A < M)
        expect(((await cpu.getState()).p & NEGATIVE) !== 0).toBe(true); // Negative flag may be set based on result
    });

    // Testing more of the uncovered instructions
    it("should test loadWord and readWord methods", async () => {
        const cpu = createCPU();

        // Test writing a word
        await cpu.loadWord(0x1000, 0x1234);

        // Verify the value was written correctly (little-endian)
        expect(await cpu.readByte(0x1000)).toBe(0x34); // Low byte
        expect(await cpu.readByte(0x1001)).toBe(0x12); // High byte

        // Verify we can read it back as a word
        expect(await cpu.readWord(0x1000)).toBe(0x1234);

        // Test writing at memory boundary
        await cpu.loadWord(0xffff, 0x4567);

        // Verify the value was written correctly, wrapping around to address 0
        expect(await cpu.readByte(0xffff)).toBe(0x67); // Low byte
        expect(await cpu.readByte(0x0000)).toBe(0x45); // High byte (wrapped)

        // Verify we can read it back as a word, even at the boundary
        expect(await cpu.readWord(0xffff)).toBe(0x4567);
    });

    // Test remaining shift operations that might be uncovered
    it("should test all shift and rotate operations with all flags", async () => {
        const cpu = createCPU();

        // Test LSR with zero input and zero output (no carry)
        await cpu.setProgramCounter(0);
        await cpu.loadByte(0, 0x4a); // LSR A
        await cpu.setAccumulator(0x00);

        await cpu.step();
        expect(await await getAccumulator(cpu)).toBe(0x00);
        expect(((await cpu.getState()).p & CARRY) === 0).toBe(true); // Carry should be clear
        expect(((await cpu.getState()).p & ZERO) !== 0).toBe(true); // Zero flag should be set

        // Test ASL with zero input and zero output (no carry)
        await cpu.setProgramCounter(0);
        await cpu.loadByte(0, 0x0a); // ASL A
        await cpu.setAccumulator(0x00);

        await cpu.step();
        expect(await await getAccumulator(cpu)).toBe(0x00);
        expect(((await cpu.getState()).p & CARRY) === 0).toBe(true); // Carry should be clear
        expect(((await cpu.getState()).p & ZERO) !== 0).toBe(true); // Zero flag should be set

        // Test ROL with carry set and zero input
        await cpu.setProgramCounter(0);
        await cpu.loadByte(0, 0x2a); // ROL A
        await cpu.setAccumulator(0x00);
        await cpu.setStatusRegister(CARRY); // Set carry flag

        await cpu.step();
        expect(await await getAccumulator(cpu)).toBe(0x01); // Result should be 0x01 (carry rotated into bit 0)
        expect(((await cpu.getState()).p & CARRY) === 0).toBe(true); // No carry out
        expect(((await cpu.getState()).p & ZERO) === 0).toBe(true); // Zero flag should be clear

        // Test ROR with carry set and zero input
        await cpu.setProgramCounter(0);
        await cpu.loadByte(0, 0x6a); // ROR A
        await cpu.setAccumulator(0x00);
        await cpu.setStatusRegister(CARRY); // Set carry flag

        await cpu.step();
        expect(await await getAccumulator(cpu)).toBe(0x80); // Result should be 0x80 (carry rotated into bit 7)
        expect(((await cpu.getState()).p & CARRY) === 0).toBe(true); // No carry out
        expect(((await cpu.getState()).p & NEGATIVE) !== 0).toBe(true); // Negative flag should be set
    });
});
