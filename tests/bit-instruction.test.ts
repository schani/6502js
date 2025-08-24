import { describe, expect, it } from "bun:test";
import { createCPU } from "./utils";
import { ZERO, OVERFLOW, NEGATIVE } from "../constants";

describe("BIT instruction extensive tests", async () => {
    it("should test all flag behavior of BIT instruction in Zero Page mode", async () => {
        const cpu = createCPU();

        // Test with bit 7 and bit 6 set, A matches some bits
        await cpu.loadByte(0x1000, 0x24); // BIT Zero Page
        await cpu.loadByte(0x1001, 0x80); // Zero page address
        await cpu.loadByte(0x0080, 0xc0); // Test value: 11000000 (bit 7 and 6 are set)

        await cpu.setAccumulator(0x01); // A value: 00000001 (no match with high bits)
        await cpu.clearStatusFlag(OVERFLOW | NEGATIVE | ZERO); // Clear all flags
        await cpu.setProgramCounter(0x1000);

        let cycles = await cpu.step();

        expect(cycles).toBe(3);
        expect(((await cpu.getState()).p & NEGATIVE) !== 0).toBe(true); // Bit 7 of memory is 1
        expect(((await cpu.getState()).p & OVERFLOW) !== 0).toBe(true); // Bit 6 of memory is 1
        expect(((await cpu.getState()).p & ZERO) !== 0).toBe(true); // A & M is zero (0x01 & 0xC0 = 0x00)

        // Test with bit 7 and bit 6 clear, A matches some bits
        await cpu.loadByte(0x1002, 0x24); // BIT Zero Page
        await cpu.loadByte(0x1003, 0x81); // Zero page address
        await cpu.loadByte(0x0081, 0x01); // Test value: 00000001 (bit 7 and 6 are clear)

        await cpu.setAccumulator(0x01); // A value: 00000001 (matches with bit 0)
        await cpu.clearStatusFlag(OVERFLOW | NEGATIVE | ZERO); // Clear all flags
        await cpu.setProgramCounter(0x1002);

        cycles = await cpu.step();

        expect(cycles).toBe(3);
        expect(((await cpu.getState()).p & NEGATIVE) !== 0).toBe(false); // Bit 7 of memory is 0
        expect(((await cpu.getState()).p & OVERFLOW) !== 0).toBe(false); // Bit 6 of memory is 0
        expect(((await cpu.getState()).p & ZERO) !== 0).toBe(false); // A & M is non-zero (0x01 & 0x01 = 0x01)

        // Test with A not matching any bits (should set ZERO flag)
        await cpu.loadByte(0x1004, 0x24); // BIT Zero Page
        await cpu.loadByte(0x1005, 0x82); // Zero page address
        await cpu.loadByte(0x0082, 0xc0); // Test value: 11000000 (bit 7 and 6 are set)

        await cpu.setAccumulator(0x01); // A value: 00000001 (no match with memory)
        await cpu.clearStatusFlag(OVERFLOW | NEGATIVE | ZERO); // Clear all flags
        await cpu.setProgramCounter(0x1004);

        cycles = await cpu.step();

        expect(cycles).toBe(3);
        expect(((await cpu.getState()).p & NEGATIVE) !== 0).toBe(true); // Bit 7 of memory is 1
        expect(((await cpu.getState()).p & OVERFLOW) !== 0).toBe(true); // Bit 6 of memory is 1
        expect(((await cpu.getState()).p & ZERO) !== 0).toBe(true); // A & M is zero (0x01 & 0xC0 = 0x00)
    });

    it("should test all flag behavior of BIT instruction in Absolute mode", async () => {
        const cpu = createCPU();

        // Test with both high bits set, A matches all bits
        await cpu.loadByte(0x1000, 0x2c); // BIT Absolute
        await cpu.loadByte(0x1001, 0x00); // Low byte of address
        await cpu.loadByte(0x1002, 0x20); // High byte of address (0x2000)
        await cpu.loadByte(0x2000, 0xff); // Test value: 11111111 (all bits set)

        await cpu.setAccumulator(0xff); // A value: 11111111 (matches all bits)
        await cpu.clearStatusFlag(OVERFLOW | NEGATIVE | ZERO); // Clear all flags
        await cpu.setProgramCounter(0x1000);

        let cycles = await cpu.step();

        expect(cycles).toBe(4);
        expect(((await cpu.getState()).p & NEGATIVE) !== 0).toBe(true); // Bit 7 of memory is 1
        expect(((await cpu.getState()).p & OVERFLOW) !== 0).toBe(true); // Bit 6 of memory is 1
        expect(((await cpu.getState()).p & ZERO) !== 0).toBe(false); // A & M is non-zero (0xFF & 0xFF = 0xFF)

        // Test with bit 7 set and bit 6 clear, A doesn't match any bits
        await cpu.loadByte(0x1003, 0x2c); // BIT Absolute
        await cpu.loadByte(0x1004, 0x10); // Low byte of address
        await cpu.loadByte(0x1005, 0x20); // High byte of address (0x2010)
        await cpu.loadByte(0x2010, 0x80); // Test value: 10000000 (only bit 7 set)

        await cpu.setAccumulator(0x7f); // A value: 01111111 (doesn't match bit 7)
        await cpu.clearStatusFlag(OVERFLOW | NEGATIVE | ZERO); // Clear all flags
        await cpu.setProgramCounter(0x1003);

        cycles = await cpu.step();

        expect(cycles).toBe(4);
        expect(((await cpu.getState()).p & NEGATIVE) !== 0).toBe(true); // Bit 7 of memory is 1
        expect(((await cpu.getState()).p & OVERFLOW) !== 0).toBe(false); // Bit 6 of memory is 0
        expect(((await cpu.getState()).p & ZERO) !== 0).toBe(true); // A & M is zero (0x7F & 0x80 = 0x00)

        // Test with bit 7 clear and bit 6 set, A matches perfectly
        await cpu.loadByte(0x1006, 0x2c); // BIT Absolute
        await cpu.loadByte(0x1007, 0x20); // Low byte of address
        await cpu.loadByte(0x1008, 0x20); // High byte of address (0x2020)
        await cpu.loadByte(0x2020, 0x40); // Test value: 01000000 (only bit 6 set)

        await cpu.setAccumulator(0x40); // A value: 01000000 (matches exactly)
        await cpu.clearStatusFlag(OVERFLOW | NEGATIVE | ZERO); // Clear all flags
        await cpu.setProgramCounter(0x1006);

        cycles = await cpu.step();

        expect(cycles).toBe(4);
        expect(((await cpu.getState()).p & NEGATIVE) !== 0).toBe(false); // Bit 7 of memory is 0
        expect(((await cpu.getState()).p & OVERFLOW) !== 0).toBe(true); // Bit 6 of memory is 1
        expect(((await cpu.getState()).p & ZERO) !== 0).toBe(false); // A & M is non-zero (0x40 & 0x40 = 0x40)
    });
});
