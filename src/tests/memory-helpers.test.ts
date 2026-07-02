import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createCPU } from "./utils.ts";

describe("Memory helper functions", () => {
    it("should write and read words, wrapping at the memory boundary", async () => {
        const cpu = createCPU();

        // Normal case: little-endian byte order
        await cpu.loadWord(0x2000, 0x1234);
        assert.strictEqual(await cpu.readByte(0x2000), 0x34); // Low byte
        assert.strictEqual(await cpu.readByte(0x2001), 0x12); // High byte
        assert.strictEqual(await cpu.readWord(0x2000), 0x1234);

        // Word ending exactly at the top of memory
        await cpu.loadWord(0xfffe, 0x1234);
        assert.strictEqual(await cpu.readByte(0xfffe), 0x34);
        assert.strictEqual(await cpu.readByte(0xffff), 0x12);

        // Word crossing the boundary: high byte wraps to 0x0000
        await cpu.loadWord(0xffff, 0xabcd);
        assert.strictEqual(await cpu.readByte(0xffff), 0xcd);
        assert.strictEqual(await cpu.readByte(0x0000), 0xab);
        assert.strictEqual(await cpu.readWord(0xffff), 0xabcd);

        // Uninitialized memory reads as 0
        assert.strictEqual(await cpu.readWord(0x3000), 0);
    });

    it("should handle edge cases in readByte and writeByte", async () => {
        const cpu = createCPU();

        // Force a memory access at address 0xFFFF to test boundary conditions
        await cpu.loadByte(0xffff, 0x42);

        // Set up a program that reads from 0xFFFF
        await cpu.loadByte(0, 0xad); // LDA Absolute
        await cpu.loadByte(1, 0xff); // Low byte of address
        await cpu.loadByte(2, 0xff); // High byte of address (0xFFFF)
        await cpu.setProgramCounter(0);
        await cpu.step();
        assert.strictEqual((await cpu.getState()).a, 0x42);

        // Test boundary by writing to 0xFFFF
        await cpu.loadByte(3, 0x8d); // STA Absolute
        await cpu.loadByte(4, 0xff); // Low byte of address
        await cpu.loadByte(5, 0xff); // High byte of address (0xFFFF)
        await cpu.setAccumulator(0x84);
        await cpu.setProgramCounter(3);
        await cpu.step();
        assert.strictEqual(await cpu.readByte(0xffff), 0x84);
    });

    it("should correctly handle JSR/RTS across the memory boundary", async () => {
        const cpu = createCPU();

        // JSR to 0xFFFF pushes the return address (PC+2-1) onto the stack
        await cpu.loadByte(0, 0x20); // JSR Absolute
        await cpu.loadByte(1, 0xff); // Low byte of address
        await cpu.loadByte(2, 0xff); // High byte of address (0xFFFF)
        await cpu.setProgramCounter(0);
        await cpu.step();
        assert.strictEqual((await cpu.getState()).pc, 0xffff);

        // RTS pulls the address, adds 1, and returns to the instruction
        // after the JSR
        await cpu.loadByte(0xffff, 0x60); // RTS
        await cpu.step();
        assert.strictEqual((await cpu.getState()).pc, 3);
    });
});
