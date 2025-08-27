import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
    createCPU,
    getXRegister,
    getAccumulator,
    getStackPointer,
    getProgramCounter,
} from "./utils.ts";
import {
    CARRY,
    ZERO,
    NEGATIVE,
    OVERFLOW,
    BREAK,
    UNUSED,
    INTERRUPT,
} from "../constants.ts";

describe("Comprehensive coverage tests", () => {
    // Test writeWord function
    it("should test writeWord with various addresses", async () => {
        const cpu = createCPU();

        // Setup test data
        await cpu.loadByte(0x100, 0xff);
        await cpu.loadByte(0x101, 0xff);

        // Test writing a word at address 0x100
        await cpu.loadByte(0x100, 0);
        await cpu.loadByte(0x101, 0);

        // Write word using the CPU's memory writing mechanism
        await cpu.setProgramCounter(0);
        await cpu.loadByte(0, 0x8d); // STA Absolute
        await cpu.loadByte(1, 0x00);
        await cpu.loadByte(2, 0x01);
        await cpu.setAccumulator(0x34);

        // Execute STA to trigger write
        let cycles = await cpu.step();
        assert.strictEqual(cycles, 4);
        assert.strictEqual(await cpu.readByte(0x100), 0x34);

        // Now write to the second byte
        await cpu.setProgramCounter(0);
        await cpu.loadByte(0, 0x8d); // STA Absolute
        await cpu.loadByte(1, 0x01);
        await cpu.loadByte(2, 0x01);
        await cpu.setAccumulator(0x12);

        // Execute STA again
        cycles = await cpu.step();
        assert.strictEqual(cycles, 4);
        assert.strictEqual(await cpu.readByte(0x101), 0x12);

        // Verify word was written correctly (0x1234)
        assert.strictEqual(
            ((await cpu.readByte(0x101)) << 8) | (await cpu.readByte(0x100)),
            0x1234);
    });

    // Test LDX Absolute,Y addressing mode with page crossing
    it("should test LDX Absolute,Y with page crossing", async () => {
        const cpu = createCPU();

        // Setup memory for LDX Absolute,Y
        await cpu.loadByte(0, 0xbe); // LDX Absolute,Y
        await cpu.loadByte(1, 0xff); // Low byte of address (0x01FF)
        await cpu.loadByte(2, 0x01); // High byte of address
        await cpu.setYRegister(0x01); // Y = 1, so effective address is 0x0200
        await cpu.loadByte(0x0200, 0x42); // Value to load

        // Execute LDX Absolute,Y
        const cycles = await cpu.step();

        // Check if crossing page boundary costs an extra cycle
        assert.strictEqual(cycles, 5); // 4 + 1 for page cross
        assert.strictEqual(await await getXRegister(cpu), 0x42);
    });

    // Test ROL, ROR, ASL, LSR instructions with specific conditions
    it("should test shift and rotate edge cases", async () => {
        const cpu = createCPU();

        // Test ROL with carry set and result being zero
        await cpu.setProgramCounter(0);
        await cpu.loadByte(0, 0x2a); // ROL A
        await cpu.setAccumulator(0x00); // Accumulator = 0
        await cpu.setStatusFlag(CARRY); // Carry flag set

        await cpu.step();
        assert.strictEqual(await await getAccumulator(cpu), 0x01); // Result should be 0x01 (carry rotated in)
        assert.strictEqual(((await cpu.getState()).p & CARRY) !== 0, false); // Carry flag should be cleared
        assert.strictEqual(((await cpu.getState()).p & ZERO) !== 0, false); // Zero flag should be cleared
        assert.strictEqual(((await cpu.getState()).p & NEGATIVE) !== 0, false); // Negative flag should be cleared

        // Test ROR with carry set and result having negative bit set
        await cpu.setProgramCounter(0);
        await cpu.loadByte(0, 0x6a); // ROR A
        await cpu.setAccumulator(0x00); // Accumulator = 0
        await cpu.setStatusFlag(CARRY); // Carry flag set

        await cpu.step();
        assert.strictEqual(await await getAccumulator(cpu), 0x80); // Result should be 0x80 (carry rotated to bit 7)
        assert.strictEqual(((await cpu.getState()).p & CARRY) !== 0, false); // Carry flag should be cleared
        assert.strictEqual(((await cpu.getState()).p & ZERO) !== 0, false); // Zero flag should be cleared
        assert.strictEqual(((await cpu.getState()).p & NEGATIVE) !== 0, true); // Negative flag should be set

        // Test ASL with a value that will set both zero and clear carry
        await cpu.setProgramCounter(0);
        await cpu.loadByte(0, 0x0a); // ASL A
        await cpu.setAccumulator(0x00); // Accumulator = 0

        await cpu.step();
        assert.strictEqual(await await getAccumulator(cpu), 0x00); // Result should be 0
        assert.strictEqual(((await cpu.getState()).p & CARRY) !== 0, false); // Carry flag should be cleared
        assert.strictEqual(((await cpu.getState()).p & ZERO) !== 0, true); // Zero flag should be set

        // Test LSR with value that sets carry and zero
        await cpu.setProgramCounter(0);
        await cpu.loadByte(0, 0x4a); // LSR A
        await cpu.setAccumulator(0x01); // Accumulator = 1

        await cpu.step();
        assert.strictEqual(await await getAccumulator(cpu), 0x00); // Result should be 0
        assert.strictEqual(((await cpu.getState()).p & CARRY) !== 0, true); // Carry flag should be set
        assert.strictEqual(((await cpu.getState()).p & ZERO) !== 0, true); // Zero flag should be set
    });

    // Test memory operations at page boundaries
    it("should test memory operations at page boundaries", async () => {
        const cpu = createCPU();

        // Test ASL Absolute,X at page boundary
        await cpu.setProgramCounter(0);
        await cpu.loadByte(0, 0x1e); // ASL Absolute,X
        await cpu.loadByte(1, 0xff); // Address 0x01FF
        await cpu.loadByte(2, 0x01);
        await cpu.setXRegister(0x01); // X = 1, so effective address is 0x0200
        await cpu.loadByte(0x0200, 0x80); // Value to shift

        await cpu.step();
        assert.strictEqual(await cpu.readByte(0x0200), 0x00); // Result after shift
        assert.strictEqual(((await cpu.getState()).p & CARRY) !== 0, true); // Carry flag should be set
        assert.strictEqual(((await cpu.getState()).p & ZERO) !== 0, true); // Zero flag should be set

        // Test LSR Absolute,X at page boundary
        await cpu.setProgramCounter(0);
        await cpu.loadByte(0, 0x5e); // LSR Absolute,X
        await cpu.loadByte(1, 0xff); // Address 0x01FF
        await cpu.loadByte(2, 0x01);
        await cpu.setXRegister(0x01); // X = 1, so effective address is 0x0200
        await cpu.loadByte(0x0200, 0x01); // Value to shift

        await cpu.step();
        assert.strictEqual(await cpu.readByte(0x0200), 0x00); // Result after shift
        assert.strictEqual(((await cpu.getState()).p & CARRY) !== 0, true); // Carry flag should be set
        assert.strictEqual(((await cpu.getState()).p & ZERO) !== 0, true); // Zero flag should be set

        // Test ROL Absolute,X at page boundary
        await cpu.setProgramCounter(0);
        await cpu.loadByte(0, 0x3e); // ROL Absolute,X
        await cpu.loadByte(1, 0xff); // Address 0x01FF
        await cpu.loadByte(2, 0x01);
        await cpu.setXRegister(0x01); // X = 1, so effective address is 0x0200
        await cpu.loadByte(0x0200, 0x80); // Value to rotate
        await cpu.setStatusFlag(CARRY); // Set carry flag

        await cpu.step();
        assert.strictEqual(await cpu.readByte(0x0200), 0x01); // Result after rotate
        assert.strictEqual(((await cpu.getState()).p & CARRY) !== 0, true); // Carry flag should be set
        assert.strictEqual(((await cpu.getState()).p & ZERO) !== 0, false); // Zero flag should be cleared

        // Test ROR Absolute,X at page boundary
        await cpu.setProgramCounter(0);
        await cpu.loadByte(0, 0x7e); // ROR Absolute,X
        await cpu.loadByte(1, 0xff); // Address 0x01FF
        await cpu.loadByte(2, 0x01);
        await cpu.setXRegister(0x01); // X = 1, so effective address is 0x0200
        await cpu.loadByte(0x0200, 0x01); // Value to rotate
        await cpu.setStatusFlag(CARRY); // Set carry flag

        await cpu.step();
        assert.strictEqual(await cpu.readByte(0x0200), 0x80); // Result after rotate
        assert.strictEqual(((await cpu.getState()).p & CARRY) !== 0, true); // Carry flag should be set
        assert.strictEqual(((await cpu.getState()).p & NEGATIVE) !== 0, true); // Negative flag should be set
    });

    // Test DEC/INC at page boundaries
    it("should test INC and DEC at page boundaries", async () => {
        const cpu = createCPU();

        // Test INC Absolute,X
        await cpu.setProgramCounter(0);
        await cpu.loadByte(0, 0xfe); // INC Absolute,X
        await cpu.loadByte(1, 0xff); // Address 0x01FF
        await cpu.loadByte(2, 0x01);
        await cpu.setXRegister(0x01); // X = 1, so effective address is 0x0200
        await cpu.loadByte(0x0200, 0xff); // Value to increment

        await cpu.step();
        assert.strictEqual(await cpu.readByte(0x0200), 0x00); // Result after increment
        assert.strictEqual(((await cpu.getState()).p & ZERO) !== 0, true); // Zero flag should be set

        // Test DEC Absolute,X
        await cpu.setProgramCounter(0);
        await cpu.loadByte(0, 0xde); // DEC Absolute,X
        await cpu.loadByte(1, 0xff); // Address 0x01FF
        await cpu.loadByte(2, 0x01);
        await cpu.setXRegister(0x01); // X = 1, so effective address is 0x0200
        await cpu.loadByte(0x0200, 0x01); // Value to decrement

        await cpu.step();
        assert.strictEqual(await cpu.readByte(0x0200), 0x00); // Result after decrement
        assert.strictEqual(((await cpu.getState()).p & ZERO) !== 0, true); // Zero flag should be set
    });

    // Test BRK, RTI with specific conditions
    it("should test BRK and RTI with different status flags", async () => {
        const cpu = createCPU();

        // Setup for BRK
        await cpu.setProgramCounter(0x1000);
        // Clear and set the flags individually
        await cpu.clearStatusFlag(CARRY);
        await cpu.clearStatusFlag(ZERO);
        await cpu.clearStatusFlag(INTERRUPT);
        await cpu.clearStatusFlag(NEGATIVE);
        await cpu.clearStatusFlag(OVERFLOW);
        await cpu.clearStatusFlag(BREAK);
        // Now set the ones we want
        await cpu.setStatusFlag(ZERO);
        await cpu.setStatusFlag(OVERFLOW);
        await cpu.setStatusFlag(CARRY);

        // Setup IRQ vector
        await cpu.loadByte(0xfffe, 0x00);
        await cpu.loadByte(0xffff, 0x20);

        // Place BRK instruction
        await cpu.loadByte(0x1000, 0x00); // BRK

        // Execute BRK instruction
        await cpu.step();

        // Remember current stack pointer after BRK
        const stackPointerAfterBRK = await await getStackPointer(cpu);

        // Check if processor is at the interrupt handler
        assert.strictEqual(await await getProgramCounter(cpu), 0x2000);

        // After BRK, stack should have:
        // SP+1: status flags with B set
        // SP+2: low byte of return address (PC+2)
        // SP+3: high byte of return address

        // Check status on stack (using readByte directly)
        assert.strictEqual(await cpu.readByte(0x0100 + stackPointerAfterBRK + 1), 
            ZERO | OVERFLOW | CARRY | UNUSED | BREAK,
        );
        assert.strictEqual(await cpu.readByte(0x0100 + stackPointerAfterBRK + 2), 
            0x02,
        ); // Low byte of PC+2
        assert.strictEqual(await cpu.readByte(0x0100 + stackPointerAfterBRK + 3), 
            0x10,
        ); // High byte of PC+2

        // Interrupt flag should be set
        assert.strictEqual(((await cpu.getState()).p & INTERRUPT) !== 0, true);

        // Place RTI instruction at interrupt handler
        await cpu.loadByte(0x2000, 0x40); // RTI

        // Execute RTI instruction
        await cpu.step();

        // Check if PC was restored correctly
        assert.strictEqual(await getProgramCounter(cpu), 0x1002);

        // Check if status flags were restored (with B flag cleared)
        assert.strictEqual(((await cpu.getState()).p & ZERO) !== 0, true);
        assert.strictEqual(((await cpu.getState()).p & OVERFLOW) !== 0, true);
        assert.strictEqual(((await cpu.getState()).p & CARRY) !== 0, true);
        assert.strictEqual(((await cpu.getState()).p & UNUSED) !== 0, true);
        assert.strictEqual(((await cpu.getState()).p & BREAK) !== 0, false);
    });

    // Test ADC, SBC with various overflow conditions
    it("should test arithmetic operations with different flag combinations", async () => {
        const cpu = createCPU();

        // Setup ADC with overflow from positive + positive = negative
        await cpu.setProgramCounter(0);
        await cpu.loadByte(0, 0x69); // ADC Immediate
        await cpu.loadByte(1, 0x70); // Value to add
        await cpu.setAccumulator(0x70); // A = 0x70 (positive, bit 7 clear)
        await cpu.setStatusFlag(CARRY); // Carry flag set

        await cpu.step();
        assert.strictEqual(await await getAccumulator(cpu), 0xe1); // 0x70 + 0x70 + 1 = 0xE1
        assert.strictEqual(((await cpu.getState()).p & OVERFLOW) !== 0, true); // Overflow flag should be set
        assert.strictEqual(((await cpu.getState()).p & NEGATIVE) !== 0, true); // Negative flag should be set

        // Setup SBC with overflow from negative - positive = positive
        await cpu.setProgramCounter(0);
        await cpu.loadByte(0, 0xe9); // SBC Immediate
        await cpu.loadByte(1, 0x70); // Value to subtract
        await cpu.setAccumulator(0x90); // A = 0x90 (negative, bit 7 set)
        await cpu.setStatusFlag(CARRY); // Carry flag set (no borrow)

        await cpu.step();
        assert.strictEqual(await await getAccumulator(cpu), 0x20); // 0x90 - 0x70 = 0x20
        assert.strictEqual(((await cpu.getState()).p & OVERFLOW) !== 0, true); // Overflow flag should be set
        assert.strictEqual(((await cpu.getState()).p & NEGATIVE) !== 0, false); // Negative flag should be cleared
    });

    // Test for LDX Absolute,Y edge cases
    it("should test LDX Absolute,Y with various conditions", async () => {
        const cpu = createCPU();

        // Test LDX Absolute,Y without page crossing
        await cpu.setProgramCounter(0);
        await cpu.loadByte(0, 0xbe); // LDX Absolute,Y
        await cpu.loadByte(1, 0x80); // Address 0x0080
        await cpu.loadByte(2, 0x00);
        await cpu.setYRegister(0x05); // Y = 5, so effective address is 0x0085
        await cpu.loadByte(0x0085, 0xff); // Value to load

        const cycles = await cpu.step();
        assert.strictEqual(cycles, 4); // No page crossing
        assert.strictEqual(await await getXRegister(cpu), 0xff);
        assert.strictEqual(((await cpu.getState()).p & NEGATIVE) !== 0, true); // Negative flag should be set

        // Test LDX Absolute,Y with zero result
        await cpu.setProgramCounter(0);
        await cpu.loadByte(0, 0xbe); // LDX Absolute,Y
        await cpu.loadByte(1, 0x80); // Address 0x0080
        await cpu.loadByte(2, 0x00);
        await cpu.setYRegister(0x05); // Y = 5, so effective address is 0x0085
        await cpu.loadByte(0x0085, 0x00); // Value to load (zero)

        await cpu.step();
        assert.strictEqual(await await getXRegister(cpu), 0x00);
        assert.strictEqual(((await cpu.getState()).p & ZERO) !== 0, true); // Zero flag should be set
    });

    // Test various bit manipulation operations
    it("should test bit manipulation operations at specific addresses", async () => {
        const cpu = createCPU();

        // Test BIT Zero Page
        await cpu.setProgramCounter(0);
        await cpu.loadByte(0, 0x24); // BIT Zero Page
        await cpu.loadByte(1, 0x80); // Zero page address 0x80
        await cpu.loadByte(0x80, 0xc0); // Test bits (bit 7 and 6 set)
        await cpu.setAccumulator(0x00); // A = 0

        await cpu.step();
        assert.strictEqual(((await cpu.getState()).p & NEGATIVE) !== 0, true); // Bit 7 should set N flag
        assert.strictEqual(((await cpu.getState()).p & OVERFLOW) !== 0, true); // Bit 6 should set V flag
        assert.strictEqual(((await cpu.getState()).p & ZERO) !== 0, true); // A & M = 0 should set Z flag

        // Test BIT Absolute
        await cpu.setProgramCounter(0);
        await cpu.loadByte(0, 0x2c); // BIT Absolute
        await cpu.loadByte(1, 0x00); // Address 0x0200
        await cpu.loadByte(2, 0x02);
        await cpu.loadByte(0x0200, 0x80); // Test bits (bit 7 set, bit 6 clear)
        await cpu.setAccumulator(0x01); // A = 1

        await cpu.step();
        assert.strictEqual(((await cpu.getState()).p & NEGATIVE) !== 0, true); // Bit 7 should set N flag
        assert.strictEqual(((await cpu.getState()).p & OVERFLOW) !== 0, false); // Bit 6 should clear V flag
        assert.strictEqual(((await cpu.getState()).p & ZERO) !== 0, true); // A & M = 0 should set Z flag
    });

    // Add more tests as needed to cover the remaining edge cases
});
