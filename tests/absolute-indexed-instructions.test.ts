import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createCPU, getAccumulator } from "./utils.ts";
import { CARRY, ZERO, NEGATIVE } from "../constants.ts";

describe("Absolute Indexed Addressing Instructions", async () => {
    // Test ASL Absolute,X
    it("should test ASL Absolute,X", async () => {
        const cpu = createCPU();

        // Setup initial memory and CPU state
        await cpu.setProgramCounter(0);
        await cpu.loadByte(0, 0x1e); // ASL Absolute,X
        await cpu.loadByte(1, 0x00); // Low byte of address (0x1000)
        await cpu.loadByte(2, 0x10); // High byte of address
        await cpu.setXRegister(0x05); // X register = 5, so effective address is 0x1005
        await cpu.loadByte(0x1005, 0x80); // Value to shift (10000000)

        // Execute ASL Absolute,X
        await cpu.step();

        // After shift: 00000000, carry flag set (bit 7 was 1)
        assert.strictEqual(await cpu.readByte(0x1005), 0x00);
        assert.strictEqual(((await cpu.getState()).p & CARRY) !== 0, true);
        assert.strictEqual(((await cpu.getState()).p & ZERO) !== 0, true);
    });

    // Test LSR Absolute,X
    it("should test LSR Absolute,X", async () => {
        const cpu = createCPU();

        // Setup initial memory and CPU state
        await cpu.setProgramCounter(0);
        await cpu.loadByte(0, 0x5e); // LSR Absolute,X
        await cpu.loadByte(1, 0x00); // Low byte of address (0x1000)
        await cpu.loadByte(2, 0x10); // High byte of address
        await cpu.setXRegister(0x05); // X register = 5, so effective address is 0x1005
        await cpu.loadByte(0x1005, 0x01); // Value to shift (00000001)

        // Execute LSR Absolute,X
        await cpu.step();

        // After shift: 00000000, carry flag set (bit 0 was 1)
        assert.strictEqual(await cpu.readByte(0x1005), 0x00);
        assert.strictEqual(((await cpu.getState()).p & CARRY) !== 0, true);
        assert.strictEqual(((await cpu.getState()).p & ZERO) !== 0, true);
    });

    // Test ROL Absolute,X
    it("should test ROL Absolute,X", async () => {
        const cpu = createCPU();

        // Setup initial memory and CPU state
        await cpu.setProgramCounter(0);
        await cpu.loadByte(0, 0x3e); // ROL Absolute,X
        await cpu.loadByte(1, 0x00); // Low byte of address (0x1000)
        await cpu.loadByte(2, 0x10); // High byte of address
        await cpu.setXRegister(0x05); // X register = 5, so effective address is 0x1005
        await cpu.loadByte(0x1005, 0x80); // Value to rotate (10000000)
        await cpu.setStatusRegister(CARRY); // Set carry flag

        // Execute ROL Absolute,X
        await cpu.step();

        // After rotate: 00000001, carry flag set (bit 7 was 1)
        assert.strictEqual(await cpu.readByte(0x1005), 0x01);
        assert.strictEqual(((await cpu.getState()).p & CARRY) !== 0, true);
        assert.strictEqual(((await cpu.getState()).p & ZERO) !== 0, false);
    });

    // Test ROR Absolute,X
    it("should test ROR Absolute,X", async () => {
        const cpu = createCPU();

        // Setup initial memory and CPU state
        await cpu.setProgramCounter(0);
        await cpu.loadByte(0, 0x7e); // ROR Absolute,X
        await cpu.loadByte(1, 0x00); // Low byte of address (0x1000)
        await cpu.loadByte(2, 0x10); // High byte of address
        await cpu.setXRegister(0x05); // X register = 5, so effective address is 0x1005
        await cpu.loadByte(0x1005, 0x01); // Value to rotate (00000001)
        await cpu.setStatusRegister(CARRY); // Set carry flag

        // Execute ROR Absolute,X
        await cpu.step();

        // After rotate: 10000000, carry flag set (bit 0 was 1)
        assert.strictEqual(await cpu.readByte(0x1005), 0x80);
        assert.strictEqual(((await cpu.getState()).p & CARRY) !== 0, true);
        assert.strictEqual(((await cpu.getState()).p & NEGATIVE) !== 0, true);
    });

    // Test INC Absolute,X
    it("should test INC Absolute,X", async () => {
        const cpu = createCPU();

        // Setup initial memory and CPU state
        await cpu.setProgramCounter(0);
        await cpu.loadByte(0, 0xfe); // INC Absolute,X
        await cpu.loadByte(1, 0x00); // Low byte of address (0x1000)
        await cpu.loadByte(2, 0x10); // High byte of address
        await cpu.setXRegister(0x05); // X register = 5, so effective address is 0x1005
        await cpu.loadByte(0x1005, 0xff); // Value to increment (will wrap to 0)

        // Execute INC Absolute,X
        await cpu.step();

        // After increment: 0x00, zero flag set
        assert.strictEqual(await cpu.readByte(0x1005), 0x00);
        assert.strictEqual(((await cpu.getState()).p & ZERO) !== 0, true);
    });

    // Test DEC Absolute,X
    it("should test DEC Absolute,X", async () => {
        const cpu = createCPU();

        // Setup initial memory and CPU state
        await cpu.setProgramCounter(0);
        await cpu.loadByte(0, 0xde); // DEC Absolute,X
        await cpu.loadByte(1, 0x00); // Low byte of address (0x1000)
        await cpu.loadByte(2, 0x10); // High byte of address
        await cpu.setXRegister(0x05); // X register = 5, so effective address is 0x1005
        await cpu.loadByte(0x1005, 0x01); // Value to decrement (will be 0)

        // Execute DEC Absolute,X
        await cpu.step();

        // After decrement: 0x00, zero flag set
        assert.strictEqual(await cpu.readByte(0x1005), 0x00);
        assert.strictEqual(((await cpu.getState()).p & ZERO) !== 0, true);
    });

    // Test LDA Absolute,X with page crossing
    it("should test LDA Absolute,X with page crossing", async () => {
        const cpu = createCPU();

        // Setup initial memory and CPU state
        await cpu.setProgramCounter(0);
        await cpu.loadByte(0, 0xbd); // LDA Absolute,X
        await cpu.loadByte(1, 0xff); // Low byte of address (0x01FF)
        await cpu.loadByte(2, 0x01); // High byte of address
        await cpu.setXRegister(0x01); // X register = 1, so effective address is 0x0200 (crosses page boundary)
        await cpu.loadByte(0x0200, 0x42); // Value to load

        // Execute LDA Absolute,X
        const cycles = await cpu.step();

        // Check cycles (should be 5 due to page crossing)
        assert.strictEqual(cycles, 5);

        // Check if A register was loaded with the value
        assert.strictEqual(await getAccumulator(cpu), 0x42);
    });

    // Test LDA Absolute,Y with page crossing
    it("should test LDA Absolute,Y with page crossing", async () => {
        const cpu = createCPU();

        // Setup initial memory and CPU state
        await cpu.setProgramCounter(0);
        await cpu.loadByte(0, 0xb9); // LDA Absolute,Y
        await cpu.loadByte(1, 0xff); // Low byte of address (0x01FF)
        await cpu.loadByte(2, 0x01); // High byte of address
        await cpu.setYRegister(0x01); // Y register = 1, so effective address is 0x0200 (crosses page boundary)
        await cpu.loadByte(0x0200, 0x42); // Value to load

        // Execute LDA Absolute,Y
        const cycles = await cpu.step();

        // Check cycles (should be 5 due to page crossing)
        assert.strictEqual(cycles, 5);

        // Check if A register was loaded with the value
        assert.strictEqual(await getAccumulator(cpu), 0x42);
    });
});
