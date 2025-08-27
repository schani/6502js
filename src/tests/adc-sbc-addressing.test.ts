import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
    CARRY,
    ZERO,
    INTERRUPT,
    DECIMAL,
    BREAK,
    UNUSED,
    OVERFLOW,
    NEGATIVE,
} from "../core/constants.ts";
import { getAccumulator, createCPU } from "./utils.ts";

describe("ADC and SBC with different addressing modes", async () => {
    // Test ADC with all addressing modes
    it("should perform ADC with zero page addressing", async () => {
        const cpu = createCPU();

        // Setup
        await cpu.loadByte(0, 0x65); // ADC Zero Page
        await cpu.loadByte(1, 0x80); // Zero page address
        await cpu.loadByte(0x80, 0x42); // Value at zero page address

        await cpu.setAccumulator(0x10); // Initial value in A
        await cpu.clearStatusFlag(CARRY); // Clear carry flag
        await cpu.setProgramCounter(0);

        // Execute
        const cycles = await cpu.step();

        // Verify
        assert.strictEqual(cycles, 3);
        assert.strictEqual(await await getAccumulator(cpu), 0x52); // 0x10 + 0x42 = 0x52
        assert.strictEqual(((await cpu.getState()).p & CARRY) !== 0, false); // No carry out
        assert.strictEqual(((await cpu.getState()).p & ZERO) !== 0, false); // Result is not zero
        assert.strictEqual(((await cpu.getState()).p & OVERFLOW) !== 0, false); // No signed overflow
        assert.strictEqual(((await cpu.getState()).p & NEGATIVE) !== 0, false); // Result is positive
    });

    it("should perform ADC with zero page,X addressing", async () => {
        const cpu = createCPU();

        // Setup
        await cpu.loadByte(0, 0x75); // ADC Zero Page,X
        await cpu.loadByte(1, 0x80); // Zero page address
        await cpu.loadByte(0x90, 0x42); // Value at 0x80 + 0x10 (with zero page wrap-around)

        await cpu.setAccumulator(0x10); // Initial value in A
        await cpu.setXRegister(0x10); // X offset
        cpu.setStatusFlag(CARRY); // Set carry flag
        await cpu.setProgramCounter(0);

        // Execute
        const cycles = await cpu.step();

        // Verify
        assert.strictEqual(cycles, 4);
        assert.strictEqual(await await getAccumulator(cpu), 0x53); // 0x10 + 0x42 + 0x01 (carry) = 0x53
        assert.strictEqual(((await cpu.getState()).p & CARRY) !== 0, false); // No carry out
        assert.strictEqual(((await cpu.getState()).p & ZERO) !== 0, false); // Result is not zero
        assert.strictEqual(((await cpu.getState()).p & OVERFLOW) !== 0, false); // No signed overflow
        assert.strictEqual(((await cpu.getState()).p & NEGATIVE) !== 0, false); // Result is positive
    });

    it("should perform ADC with absolute addressing", async () => {
        const cpu = createCPU();

        // Setup
        await cpu.loadByte(0, 0x6d); // ADC Absolute
        await cpu.loadByte(1, 0x00); // Low byte of address
        await cpu.loadByte(2, 0x20); // High byte of address (0x2000)
        await cpu.loadByte(0x2000, 0xd0); // Value at absolute address

        await cpu.setAccumulator(0x10); // Initial value in A
        await cpu.clearStatusFlag(CARRY); // Clear carry flag
        await cpu.setProgramCounter(0);

        // Execute
        const cycles = await cpu.step();

        // Verify
        assert.strictEqual(cycles, 4);
        assert.strictEqual(await await getAccumulator(cpu), 0xe0); // 0x10 + 0xD0 = 0xE0
        assert.strictEqual(((await cpu.getState()).p & CARRY) !== 0, false); // No carry out
        assert.strictEqual(((await cpu.getState()).p & ZERO) !== 0, false); // Result is not zero
        assert.strictEqual(((await cpu.getState()).p & OVERFLOW) !== 0, false); // No signed overflow
        assert.strictEqual(((await cpu.getState()).p & NEGATIVE) !== 0, true); // Result is negative (bit 7 set)
    });

    it("should perform ADC with absolute,X addressing", async () => {
        const cpu = createCPU();

        // Setup
        await cpu.loadByte(0, 0x7d); // ADC Absolute,X
        await cpu.loadByte(1, 0x00); // Low byte of address
        await cpu.loadByte(2, 0x20); // High byte of address (0x2000)
        await cpu.loadByte(0x2010, 0x40); // Value at 0x2000 + 0x10 = 0x2010

        await cpu.setAccumulator(0x10); // Initial value in A
        await cpu.setXRegister(0x10); // X offset
        await cpu.clearStatusFlag(CARRY); // Clear carry flag
        await cpu.setProgramCounter(0);

        // Execute
        const cycles = await cpu.step();

        // Verify
        assert.strictEqual(cycles, 4); // No page boundary crossed
        assert.strictEqual(await await getAccumulator(cpu), 0x50); // 0x10 + 0x40 = 0x50
        assert.strictEqual(((await cpu.getState()).p & CARRY) !== 0, false); // No carry out
    });

    it("should perform ADC with absolute,X addressing and page crossing", async () => {
        const cpu = createCPU();

        // Setup
        await cpu.loadByte(0, 0x7d); // ADC Absolute,X
        await cpu.loadByte(1, 0xf0); // Low byte of address
        await cpu.loadByte(2, 0x20); // High byte of address (0x20F0)
        await cpu.loadByte(0x2100, 0x40); // Value at 0x20F0 + 0x10 = 0x2100 (page boundary crossed)

        await cpu.setAccumulator(0x10); // Initial value in A
        await cpu.setXRegister(0x10); // X offset
        await cpu.clearStatusFlag(CARRY); // Clear carry flag
        await cpu.setProgramCounter(0);

        // Execute
        const cycles = await cpu.step();

        // Verify
        assert.strictEqual(cycles, 5); // +1 cycle for page boundary crossing
        assert.strictEqual(await await getAccumulator(cpu), 0x50); // 0x10 + 0x40 = 0x50
    });

    it("should perform ADC with absolute,Y addressing", async () => {
        const cpu = createCPU();

        // Setup
        await cpu.loadByte(0, 0x79); // ADC Absolute,Y
        await cpu.loadByte(1, 0x00); // Low byte of address
        await cpu.loadByte(2, 0x20); // High byte of address (0x2000)
        await cpu.loadByte(0x2010, 0x70); // Value at 0x2000 + 0x10 = 0x2010

        await cpu.setAccumulator(0x10); // Initial value in A
        await cpu.setYRegister(0x10); // Y offset
        await cpu.clearStatusFlag(CARRY); // Clear carry flag
        await cpu.setProgramCounter(0);

        // Execute
        const cycles = await cpu.step();

        // Verify
        assert.strictEqual(cycles, 4); // No page boundary crossed
        assert.strictEqual(await await getAccumulator(cpu), 0x80); // 0x10 + 0x70 = 0x80
        assert.strictEqual(((await cpu.getState()).p & NEGATIVE) !== 0, true); // Result is negative (bit 7 set)
    });

    it("should perform ADC with (Indirect,X) addressing", async () => {
        const cpu = createCPU();

        // Setup
        await cpu.loadByte(0, 0x61); // ADC (Indirect,X)
        await cpu.loadByte(1, 0x80); // Zero page address
        await cpu.loadByte(0x90, 0x00); // Low byte of effective address (0x80 + 0x10 = 0x90)
        await cpu.loadByte(0x91, 0x20); // High byte of effective address (0x2000)
        await cpu.loadByte(0x2000, 0x35); // Value at effective address

        await cpu.setAccumulator(0x10); // Initial value in A
        await cpu.setXRegister(0x10); // X offset
        await cpu.clearStatusFlag(CARRY); // Clear carry flag
        await cpu.setProgramCounter(0);

        // Execute
        const cycles = await cpu.step();

        // Verify
        assert.strictEqual(cycles, 6);
        assert.strictEqual(await await getAccumulator(cpu), 0x45); // 0x10 + 0x35 = 0x45
    });

    it("should perform ADC with (Indirect),Y addressing", async () => {
        const cpu = createCPU();

        // Setup
        await cpu.loadByte(0, 0x71); // ADC (Indirect),Y
        await cpu.loadByte(1, 0x80); // Zero page address
        await cpu.loadByte(0x80, 0x00); // Low byte of indirect address
        await cpu.loadByte(0x81, 0x20); // High byte of indirect address (0x2000)
        await cpu.loadByte(0x2010, 0x25); // Value at 0x2000 + 0x10 = 0x2010

        await cpu.setAccumulator(0x10); // Initial value in A
        await cpu.setYRegister(0x10); // Y offset
        await cpu.clearStatusFlag(CARRY); // Clear carry flag
        await cpu.setProgramCounter(0);

        // Execute
        const cycles = await cpu.step();

        // Verify
        assert.strictEqual(cycles, 5); // No page boundary crossed
        assert.strictEqual(await await getAccumulator(cpu), 0x35); // 0x10 + 0x25 = 0x35
    });

    it("should perform ADC with (Indirect),Y addressing and page crossing", async () => {
        const cpu = createCPU();

        // Setup
        await cpu.loadByte(0, 0x71); // ADC (Indirect),Y
        await cpu.loadByte(1, 0x80); // Zero page address
        await cpu.loadByte(0x80, 0xf0); // Low byte of indirect address
        await cpu.loadByte(0x81, 0x20); // High byte of indirect address (0x20F0)
        await cpu.loadByte(0x2100, 0x25); // Value at 0x20F0 + 0x10 = 0x2100 (page boundary crossed)

        await cpu.setAccumulator(0x10); // Initial value in A
        await cpu.setYRegister(0x10); // Y offset
        await cpu.clearStatusFlag(CARRY); // Clear carry flag
        await cpu.setProgramCounter(0);

        // Execute
        const cycles = await cpu.step();

        // Verify
        assert.strictEqual(cycles, 6); // +1 cycle for page boundary crossing
        assert.strictEqual(await await getAccumulator(cpu), 0x35); // 0x10 + 0x25 = 0x35
    });

    // Test SBC with all addressing modes
    it("should perform SBC with zero page addressing", async () => {
        const cpu = createCPU();

        // Setup
        await cpu.loadByte(0, 0xe5); // SBC Zero Page
        await cpu.loadByte(1, 0x80); // Zero page address
        await cpu.loadByte(0x80, 0x20); // Value at zero page address

        await cpu.setAccumulator(0x50); // Initial value in A
        cpu.setStatusFlag(CARRY); // Set carry flag (no borrow)
        await cpu.setProgramCounter(0);

        // Execute
        const cycles = await cpu.step();

        // Verify
        assert.strictEqual(cycles, 3);
        assert.strictEqual(await await getAccumulator(cpu), 0x30); // 0x50 - 0x20 = 0x30
        assert.strictEqual(((await cpu.getState()).p & CARRY) !== 0, true); // No borrow (carry set)
        assert.strictEqual(((await cpu.getState()).p & ZERO) !== 0, false); // Result is not zero
        assert.strictEqual(((await cpu.getState()).p & OVERFLOW) !== 0, false); // No signed overflow
        assert.strictEqual(((await cpu.getState()).p & NEGATIVE) !== 0, false); // Result is positive
    });

    it("should perform SBC with zero page,X addressing", async () => {
        const cpu = createCPU();

        // Setup
        await cpu.loadByte(0, 0xf5); // SBC Zero Page,X
        await cpu.loadByte(1, 0x80); // Zero page address
        await cpu.loadByte(0x90, 0x20); // Value at 0x80 + 0x10 (with zero page wrap-around)

        await cpu.setAccumulator(0x50); // Initial value in A
        await cpu.setXRegister(0x10); // X offset
        await cpu.clearStatusFlag(CARRY); // Clear carry flag (borrow)
        await cpu.setProgramCounter(0);

        // Execute
        const cycles = await cpu.step();

        // Verify
        assert.strictEqual(cycles, 4);
        assert.strictEqual(await await getAccumulator(cpu), 0x2f); // 0x50 - 0x20 - 0x01 (borrow) = 0x2F
        assert.strictEqual(((await cpu.getState()).p & CARRY) !== 0, true); // No borrow out (carry set after operation)
    });

    it("should perform SBC with absolute addressing", async () => {
        const cpu = createCPU();

        // Setup
        await cpu.loadByte(0, 0xed); // SBC Absolute
        await cpu.loadByte(1, 0x00); // Low byte of address
        await cpu.loadByte(2, 0x20); // High byte of address (0x2000)
        await cpu.loadByte(0x2000, 0x60); // Value at absolute address

        await cpu.setAccumulator(0x40); // Initial value in A
        cpu.setStatusFlag(CARRY); // Set carry flag (no borrow)
        await cpu.setProgramCounter(0);

        // Execute
        const cycles = await cpu.step();

        // Verify
        assert.strictEqual(cycles, 4);
        assert.strictEqual(await await getAccumulator(cpu), 0xe0); // 0x40 - 0x60 = 0xE0
        assert.strictEqual(((await cpu.getState()).p & CARRY) !== 0, false); // Borrow out (carry clear)
        assert.strictEqual(((await cpu.getState()).p & NEGATIVE) !== 0, true); // Result is negative
    });

    it("should perform SBC with absolute,X addressing", async () => {
        const cpu = createCPU();

        // Setup
        await cpu.loadByte(0, 0xfd); // SBC Absolute,X
        await cpu.loadByte(1, 0x00); // Low byte of address
        await cpu.loadByte(2, 0x20); // High byte of address (0x2000)
        await cpu.loadByte(0x2010, 0x20); // Value at 0x2000 + 0x10 = 0x2010

        await cpu.setAccumulator(0x50); // Initial value in A
        await cpu.setXRegister(0x10); // X offset
        cpu.setStatusFlag(CARRY); // Set carry flag (no borrow)
        await cpu.setProgramCounter(0);

        // Execute
        const cycles = await cpu.step();

        // Verify
        assert.strictEqual(cycles, 4); // No page boundary crossed
        assert.strictEqual(await await getAccumulator(cpu), 0x30); // 0x50 - 0x20 = 0x30
        assert.strictEqual(((await cpu.getState()).p & CARRY) !== 0, true); // No borrow out (carry set)
    });

    it("should perform SBC with absolute,X addressing and page crossing", async () => {
        const cpu = createCPU();

        // Setup
        await cpu.loadByte(0, 0xfd); // SBC Absolute,X
        await cpu.loadByte(1, 0xf0); // Low byte of address
        await cpu.loadByte(2, 0x20); // High byte of address (0x20F0)
        await cpu.loadByte(0x2100, 0x20); // Value at 0x20F0 + 0x10 = 0x2100 (page boundary crossed)

        await cpu.setAccumulator(0x50); // Initial value in A
        await cpu.setXRegister(0x10); // X offset
        cpu.setStatusFlag(CARRY); // Set carry flag (no borrow)
        await cpu.setProgramCounter(0);

        // Execute
        const cycles = await cpu.step();

        // Verify
        assert.strictEqual(cycles, 5); // +1 cycle for page boundary crossing
        assert.strictEqual(await await getAccumulator(cpu), 0x30); // 0x50 - 0x20 = 0x30
    });

    it("should perform SBC with absolute,Y addressing", async () => {
        const cpu = createCPU();

        // Setup
        await cpu.loadByte(0, 0xf9); // SBC Absolute,Y
        await cpu.loadByte(1, 0x00); // Low byte of address
        await cpu.loadByte(2, 0x20); // High byte of address (0x2000)
        await cpu.loadByte(0x2010, 0x20); // Value at 0x2000 + 0x10 = 0x2010

        await cpu.setAccumulator(0x50); // Initial value in A
        await cpu.setYRegister(0x10); // Y offset
        cpu.setStatusFlag(CARRY); // Set carry flag (no borrow)
        await cpu.setProgramCounter(0);

        // Execute
        const cycles = await cpu.step();

        // Verify
        assert.strictEqual(cycles, 4); // No page boundary crossed
        assert.strictEqual(await await getAccumulator(cpu), 0x30); // 0x50 - 0x20 = 0x30
    });

    it("should perform SBC with (Indirect,X) addressing", async () => {
        const cpu = createCPU();

        // Setup
        await cpu.loadByte(0, 0xe1); // SBC (Indirect,X)
        await cpu.loadByte(1, 0x80); // Zero page address
        await cpu.loadByte(0x90, 0x00); // Low byte of effective address (0x80 + 0x10 = 0x90)
        await cpu.loadByte(0x91, 0x20); // High byte of effective address (0x2000)
        await cpu.loadByte(0x2000, 0x25); // Value at effective address

        await cpu.setAccumulator(0x50); // Initial value in A
        await cpu.setXRegister(0x10); // X offset
        cpu.setStatusFlag(CARRY); // Set carry flag (no borrow)
        await cpu.setProgramCounter(0);

        // Execute
        const cycles = await cpu.step();

        // Verify
        assert.strictEqual(cycles, 6);
        assert.strictEqual(await await getAccumulator(cpu), 0x2b); // 0x50 - 0x25 = 0x2B
        assert.strictEqual(((await cpu.getState()).p & CARRY) !== 0, true); // No borrow out (carry set)
    });

    it("should perform SBC with (Indirect),Y addressing", async () => {
        const cpu = createCPU();

        // Setup
        await cpu.loadByte(0, 0xf1); // SBC (Indirect),Y
        await cpu.loadByte(1, 0x80); // Zero page address
        await cpu.loadByte(0x80, 0x00); // Low byte of indirect address
        await cpu.loadByte(0x81, 0x20); // High byte of indirect address (0x2000)
        await cpu.loadByte(0x2010, 0x10); // Value at 0x2000 + 0x10 = 0x2010

        await cpu.setAccumulator(0x50); // Initial value in A
        await cpu.setYRegister(0x10); // Y offset
        cpu.setStatusFlag(CARRY); // Set carry flag (no borrow)
        await cpu.setProgramCounter(0);

        // Execute
        const cycles = await cpu.step();

        // Verify
        assert.strictEqual(cycles, 5); // No page boundary crossed
        assert.strictEqual(await await getAccumulator(cpu), 0x40); // 0x50 - 0x10 = 0x40
    });

    it("should perform SBC with (Indirect),Y addressing and page crossing", async () => {
        const cpu = createCPU();

        // Setup
        await cpu.loadByte(0, 0xf1); // SBC (Indirect),Y
        await cpu.loadByte(1, 0x80); // Zero page address
        await cpu.loadByte(0x80, 0xf0); // Low byte of indirect address
        await cpu.loadByte(0x81, 0x20); // High byte of indirect address (0x20F0)
        await cpu.loadByte(0x2100, 0x10); // Value at 0x20F0 + 0x10 = 0x2100 (page boundary crossed)

        await cpu.setAccumulator(0x50); // Initial value in A
        await cpu.setYRegister(0x10); // Y offset
        cpu.setStatusFlag(CARRY); // Set carry flag (no borrow)
        await cpu.setProgramCounter(0);

        // Execute
        const cycles = await cpu.step();

        // Verify
        assert.strictEqual(cycles, 6); // +1 cycle for page boundary crossing
        assert.strictEqual(await await getAccumulator(cpu), 0x40); // 0x50 - 0x10 = 0x40
    });
});
