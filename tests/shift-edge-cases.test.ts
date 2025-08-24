import { describe, expect, it } from "bun:test";
import { ZERO, NEGATIVE, CARRY } from "../constants";
import { createCPU } from "./utils";

// This test targets specific edge cases for shift and rotate operations
describe("Shift and rotate edge cases for 100% coverage", () => {
    // Test ASL with edge cases
    it("should test ASL Zero Page with edge cases", async () => {
        const cpu = createCPU();

        // Test ASL Zero Page with zero value (no carry, result zero)
        await cpu.setProgramCounter(0);
        await cpu.loadByte(0, 0x06); // ASL Zero Page
        await cpu.loadByte(1, 0x80); // Zero page address
        await cpu.loadByte(0x80, 0x00); // Value to shift

        await cpu.step();
        expect(await cpu.readByte(0x80)).toBe(0x00);
        expect(((await cpu.getState()).p & CARRY) === 0).toBe(true); // Carry should be clear
        expect(((await cpu.getState()).p & ZERO) !== 0).toBe(true); // Zero flag should be set

        // Test ASL Zero Page with 0x80 value (sets carry, result zero)
        await cpu.setProgramCounter(0);
        await cpu.loadByte(0, 0x06); // ASL Zero Page
        await cpu.loadByte(1, 0x80); // Zero page address
        await cpu.loadByte(0x80, 0x80); // Value to shift

        await cpu.step();
        expect(await cpu.readByte(0x80)).toBe(0x00);
        expect(((await cpu.getState()).p & CARRY) !== 0).toBe(true); // Carry should be set
        expect(((await cpu.getState()).p & ZERO) !== 0).toBe(true); // Zero flag should be set
    });

    // Test ASL with edge cases - Absolute
    it("should test ASL Absolute with edge cases", async () => {
        const cpu = createCPU();

        // Test ASL Absolute with 0x80 value (sets carry, result zero)
        await cpu.setProgramCounter(0);
        await cpu.loadByte(0, 0x0e); // ASL Absolute
        await cpu.loadByte(1, 0x00); // Low byte of address
        await cpu.loadByte(2, 0x10); // High byte of address
        await cpu.loadByte(0x1000, 0x80); // Value to shift

        await cpu.step();
        expect(await cpu.readByte(0x1000)).toBe(0x00);
        expect(((await cpu.getState()).p & CARRY) !== 0).toBe(true); // Carry should be set
        expect(((await cpu.getState()).p & ZERO) !== 0).toBe(true); // Zero flag should be set
    });

    // Test ASL with edge cases - Absolute,X
    it("should test ASL Absolute,X with edge cases", async () => {
        const cpu = createCPU();

        // Test ASL Absolute,X with 0x80 value (sets carry, result zero)
        await cpu.setProgramCounter(0);
        await cpu.loadByte(0, 0x1e); // ASL Absolute,X
        await cpu.loadByte(1, 0x00); // Low byte of address
        await cpu.loadByte(2, 0x10); // High byte of address
        await cpu.setXRegister(0x05); // X register = 5
        await cpu.loadByte(0x1005, 0x80); // Value to shift

        await cpu.step();
        expect(await cpu.readByte(0x1005)).toBe(0x00);
        expect(((await cpu.getState()).p & CARRY) !== 0).toBe(true); // Carry should be set
        expect(((await cpu.getState()).p & ZERO) !== 0).toBe(true); // Zero flag should be set
    });

    // Test LSR with edge cases - Zero Page
    it("should test LSR Zero Page with edge cases", async () => {
        const cpu = createCPU();

        // Test LSR Zero Page with 0x01 value (sets carry, result zero)
        await cpu.setProgramCounter(0);
        await cpu.loadByte(0, 0x46); // LSR Zero Page
        await cpu.loadByte(1, 0x80); // Zero page address
        await cpu.loadByte(0x80, 0x01); // Value to shift

        await cpu.step();
        expect(await cpu.readByte(0x80)).toBe(0x00);
        expect(((await cpu.getState()).p & CARRY) !== 0).toBe(true); // Carry should be set
        expect(((await cpu.getState()).p & ZERO) !== 0).toBe(true); // Zero flag should be set
    });

    // Test LSR with edge cases - Absolute
    it("should test LSR Absolute with edge cases", async () => {
        const cpu = createCPU();

        // Test LSR Absolute with 0x01 value (sets carry, result zero)
        await cpu.setProgramCounter(0);
        await cpu.loadByte(0, 0x4e); // LSR Absolute
        await cpu.loadByte(1, 0x00); // Low byte of address
        await cpu.loadByte(2, 0x10); // High byte of address
        await cpu.loadByte(0x1000, 0x01); // Value to shift

        await cpu.step();
        expect(await cpu.readByte(0x1000)).toBe(0x00);
        expect(((await cpu.getState()).p & CARRY) !== 0).toBe(true); // Carry should be set
        expect(((await cpu.getState()).p & ZERO) !== 0).toBe(true); // Zero flag should be set
    });

    // Test ROL with edge cases - Zero Page
    it("should test ROL Zero Page with edge cases", async () => {
        const cpu = createCPU();

        // Test ROL Zero Page with zero value and carry set
        await cpu.setProgramCounter(0);
        await cpu.loadByte(0, 0x26); // ROL Zero Page
        await cpu.loadByte(1, 0x80); // Zero page address
        await cpu.loadByte(0x80, 0x00); // Value to rotate
        await cpu.setStatusFlag(CARRY); // Set carry flag

        await cpu.step();
        expect(await cpu.readByte(0x80)).toBe(0x01); // Rotated carry in
        expect(((await cpu.getState()).p & CARRY) === 0).toBe(true); // No carry out
        expect(((await cpu.getState()).p & ZERO) === 0).toBe(true); // Not zero

        // Test ROL Zero Page with 0x80 value and carry set
        await cpu.setProgramCounter(0);
        await cpu.loadByte(0, 0x26); // ROL Zero Page
        await cpu.loadByte(1, 0x80); // Zero page address
        await cpu.loadByte(0x80, 0x80); // Value to rotate
        await cpu.setStatusFlag(CARRY); // Set carry flag

        await cpu.step();
        expect(await cpu.readByte(0x80)).toBe(0x01); // Rotated with carry set
        expect(((await cpu.getState()).p & CARRY) !== 0).toBe(true); // Carry should be set from bit 7
        expect(((await cpu.getState()).p & ZERO) === 0).toBe(true); // Not zero
    });

    // Test ROR with edge cases - Zero Page
    it("should test ROR Zero Page with edge cases", async () => {
        const cpu = createCPU();

        // Test ROR Zero Page with zero value and carry set
        await cpu.setProgramCounter(0);
        await cpu.loadByte(0, 0x66); // ROR Zero Page
        await cpu.loadByte(1, 0x80); // Zero page address
        await cpu.loadByte(0x80, 0x00); // Value to rotate
        await cpu.setStatusFlag(CARRY); // Set carry flag

        await cpu.step();
        expect(await cpu.readByte(0x80)).toBe(0x80); // Rotated carry to bit 7
        expect(((await cpu.getState()).p & CARRY) === 0).toBe(true); // No carry out
        expect(((await cpu.getState()).p & NEGATIVE) !== 0).toBe(true); // Negative flag set

        // Test ROR Zero Page with 0x01 value and carry set
        await cpu.setProgramCounter(0);
        await cpu.loadByte(0, 0x66); // ROR Zero Page
        await cpu.loadByte(1, 0x80); // Zero page address
        await cpu.loadByte(0x80, 0x01); // Value to rotate
        await cpu.setStatusFlag(CARRY); // Set carry flag

        await cpu.step();
        expect(await cpu.readByte(0x80)).toBe(0x80); // Rotated with carry in
        expect(((await cpu.getState()).p & CARRY) !== 0).toBe(true); // Carry should be set from bit 0
        expect(((await cpu.getState()).p & NEGATIVE) !== 0).toBe(true); // Negative flag set
    });
});
