import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
    CARRY,
    ZERO,
    NEGATIVE,
    OVERFLOW,
    DECIMAL,
    INTERRUPT,
} from "../core/constants.ts";
import { createCPU, getProgramCounter } from "./utils.ts";

describe("Remaining branch and flag operations", async () => {
    it("should test BCS with page crossing", async () => {
        const cpu = createCPU();

        // Setup for BCS with page crossing - need PC at a location where PC+2+offset crosses a page
        await cpu.setProgramCounter(0x10f0);
        await cpu.loadByte(0x10f0, 0xb0); // BCS
        await cpu.loadByte(0x10f1, 0x10); // Offset 16 (crossing from 0x10F2 to 0x1102)
        await cpu.setStatusFlag(CARRY); // Set carry flag for branch to be taken

        // Execute BCS
        await cpu.step();

        // Branch calculation: PC (after fetching instruction) + offset
        // PC after fetching: 0x10F0 + 2 = 0x10F2
        // Effective PC: 0x10F2 + 0x10 = 0x1102 (crosses page boundary)

                
        assert.strictEqual(await await getProgramCounter(cpu), 0x1102);
    });

    it("should test BEQ with page crossing", async () => {
        const cpu = createCPU();

        // Setup for BEQ with page crossing
        await cpu.setProgramCounter(0x10f0);
        await cpu.loadByte(0x10f0, 0xf0); // BEQ
        await cpu.loadByte(0x10f1, 0x10); // Offset 16 (crossing from 0x10F2 to 0x1102)
        await cpu.setStatusFlag(ZERO); // Set zero flag for branch to be taken

        // Execute BEQ
        await cpu.step();

        // Branch calculation: PC (after fetching instruction) + offset
        // PC after fetching: 0x10F0 + 2 = 0x10F2
        // Effective PC: 0x10F2 + 0x10 = 0x1102 (crosses page boundary)

                
        assert.strictEqual(await await getProgramCounter(cpu), 0x1102);
    });

    it("should test BMI with page crossing", async () => {
        const cpu = createCPU();

        // Setup for BMI with page crossing
        await cpu.setProgramCounter(0x10f0);
        await cpu.loadByte(0x10f0, 0x30); // BMI
        await cpu.loadByte(0x10f1, 0x10); // Offset 16 (crossing from 0x10F2 to 0x1102)
        await cpu.setStatusFlag(NEGATIVE); // Set negative flag for branch to be taken

        // Execute BMI
        await cpu.step();

        // Branch calculation: PC (after fetching instruction) + offset
        // PC after fetching: 0x10F0 + 2 = 0x10F2
        // Effective PC: 0x10F2 + 0x10 = 0x1102 (crosses page boundary)

                
        assert.strictEqual(await await getProgramCounter(cpu), 0x1102);
    });

    it("should test BVS with page crossing", async () => {
        const cpu = createCPU();

        // Setup for BVS with page crossing
        await cpu.setProgramCounter(0x10f0);
        await cpu.loadByte(0x10f0, 0x70); // BVS
        await cpu.loadByte(0x10f1, 0x10); // Offset 16 (crossing from 0x10F2 to 0x1102)
        await cpu.setStatusFlag(OVERFLOW); // Set overflow flag for branch to be taken

        // Execute BVS
        await cpu.step();

        // Branch calculation: PC (after fetching instruction) + offset
        // PC after fetching: 0x10F0 + 2 = 0x10F2
        // Effective PC: 0x10F2 + 0x10 = 0x1102 (crosses page boundary)

                
        assert.strictEqual(await await getProgramCounter(cpu), 0x1102);
    });

    it("should test all flag setting and clearing instructions", async () => {
        const cpu = createCPU();

        // Test CLC (Clear Carry)
        await cpu.setProgramCounter(0);
        await cpu.loadByte(0, 0x18); // CLC
        await cpu.setStatusFlag(CARRY); // Set carry flag

        await cpu.step();
        assert.strictEqual(((await cpu.getState()).p & CARRY) === 0, true); // Carry flag should be cleared

        // Test SEC (Set Carry)
        await cpu.setProgramCounter(0);
        await cpu.loadByte(0, 0x38); // SEC
        await cpu.clearStatusFlag(CARRY); // Clear carry flag

        await cpu.step();
        assert.strictEqual(((await cpu.getState()).p & CARRY) !== 0, true); // Carry flag should be set

        // Test CLI (Clear Interrupt)
        await cpu.setProgramCounter(0);
        await cpu.loadByte(0, 0x58); // CLI
        await cpu.setStatusFlag(INTERRUPT); // Set interrupt flag

        await cpu.step();
        assert.strictEqual(((await cpu.getState()).p & INTERRUPT) === 0, true); // Interrupt flag should be cleared

        // Test SEI (Set Interrupt)
        await cpu.setProgramCounter(0);
        await cpu.loadByte(0, 0x78); // SEI
        await cpu.clearStatusFlag(INTERRUPT); // Clear interrupt flag

        await cpu.step();
        assert.strictEqual(((await cpu.getState()).p & INTERRUPT) !== 0, true); // Interrupt flag should be set

        // Test CLV (Clear Overflow)
        await cpu.setProgramCounter(0);
        await cpu.loadByte(0, 0xb8); // CLV
        await cpu.setStatusFlag(OVERFLOW); // Set overflow flag

        await cpu.step();
        assert.strictEqual(((await cpu.getState()).p & OVERFLOW) === 0, true); // Overflow flag should be cleared

        // Test CLD (Clear Decimal)
        await cpu.setProgramCounter(0);
        await cpu.loadByte(0, 0xd8); // CLD
        await cpu.setStatusFlag(DECIMAL); // Set decimal flag

        await cpu.step();
        assert.strictEqual(((await cpu.getState()).p & DECIMAL) === 0, true); // Decimal flag should be cleared

        // Test SED (Set Decimal)
        await cpu.setProgramCounter(0);
        await cpu.loadByte(0, 0xf8); // SED
        await cpu.clearStatusFlag(DECIMAL); // Clear decimal flag

        await cpu.step();
        assert.strictEqual(((await cpu.getState()).p & DECIMAL) !== 0, true); // Decimal flag should be set
    });

    it("should test compare operations with various results", async () => {
        const cpu = createCPU();

        // Test CMP with equal values (sets Z flag, sets C flag)
        await cpu.setProgramCounter(0);
        await cpu.loadByte(0, 0xc9); // CMP Immediate
        await cpu.loadByte(1, 0x42); // Compare with value 0x42
        await cpu.setAccumulator(0x42); // Accumulator value

        await cpu.step();
        assert.strictEqual(((await cpu.getState()).p & ZERO) !== 0, true); // Zero flag should be set
        assert.strictEqual(((await cpu.getState()).p & CARRY) !== 0, true); // Carry flag should be set (A >= M)

        // Test CMP with accumulator greater (clears Z flag, sets C flag)
        await cpu.setProgramCounter(0);
        await cpu.loadByte(0, 0xc9); // CMP Immediate
        await cpu.loadByte(1, 0x40); // Compare with value 0x40
        await cpu.setAccumulator(0x42); // Accumulator value

        await cpu.step();
        assert.strictEqual(((await cpu.getState()).p & ZERO) === 0, true); // Zero flag should be cleared
        assert.strictEqual(((await cpu.getState()).p & CARRY) !== 0, true); // Carry flag should be set (A >= M)

        // Test CMP with accumulator less (clears Z flag, clears C flag)
        await cpu.setProgramCounter(0);
        await cpu.loadByte(0, 0xc9); // CMP Immediate
        await cpu.loadByte(1, 0x50); // Compare with value 0x50
        await cpu.setAccumulator(0x42); // Accumulator value

        await cpu.step();
        assert.strictEqual(((await cpu.getState()).p & ZERO) === 0, true); // Zero flag should be cleared
        assert.strictEqual(((await cpu.getState()).p & CARRY) === 0, true); // Carry flag should be cleared (A < M)
    });
});
