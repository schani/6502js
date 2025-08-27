import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { CARRY, ZERO, OVERFLOW, NEGATIVE } from "../core/constants.ts";
import {
    getAccumulator,
    getXRegister,
    getYRegister,
    getProgramCounter,
    getStackPointer,
    getStatusRegister,
    createCPU,
} from "./utils.ts";

describe("SyncCPU", () => {
    test("correctly synchronizes CPU states for basic operations", async () => {
        const syncCpu = createCPU();

        // Load a simple program: LDA #42, ADC #13, RTS
        await syncCpu.loadByte(0x0000, 0xa9); // LDA #42
        await syncCpu.loadByte(0x0001, 0x2a); // #42
        await syncCpu.loadByte(0x0002, 0x69); // ADC #13
        await syncCpu.loadByte(0x0003, 0x0d); // #13
        await syncCpu.loadByte(0x0004, 0x60); // RTS

        // Set PC to start
        await syncCpu.setProgramCounter(0x0000);

        // Execute LDA #42
        let cycles = await syncCpu.step();
        assert.strictEqual(cycles, 2);
        assert.strictEqual(await await getAccumulator(syncCpu), 0x2a);

        // Execute ADC #13
        cycles = await syncCpu.step();
        assert.strictEqual(cycles, 2);
        assert.strictEqual(await await getAccumulator(syncCpu), 0x37); // 42 + 13 = 55 (0x37)

        // We successfully executed both steps, which means the states matched
    });

    test("correctly handles memory boundary wrapping", async () => {
        const syncCpu = createCPU();

        // Test a write across the memory boundary
        await syncCpu.loadWord(0xffff, 0x1234);

        assert.strictEqual(await syncCpu.readByte(0xffff), 0x34);
        assert.strictEqual(await syncCpu.readByte(0x0000), 0x12);
        assert.strictEqual(await syncCpu.readWord(0xffff), 0x1234);

        // This test passing means that both CPU1 and CPU2 handle wrapping correctly
    });

    // Skip this test for now as CPU1 and CPU2 have different stack implementations
    // We'll come back to fixing this after we harmonize the implementations
    test("correctly handles JSR/RTS operations", async () => {
        const syncCpu = createCPU();

        // Load a simple program with JSR and RTS
        // Main program
        await syncCpu.loadByte(0x0400, 0x20); // JSR
        await syncCpu.loadByte(0x0401, 0x00); // $0500 (low byte)
        await syncCpu.loadByte(0x0402, 0x05); // $0500 (high byte)
        await syncCpu.loadByte(0x0403, 0xe8); // INX (after return)
        await syncCpu.loadByte(0x0404, 0x00); // BRK

        // Subroutine
        await syncCpu.loadByte(0x0500, 0xa9); // LDA #$FF
        await syncCpu.loadByte(0x0501, 0xff); // #$FF
        await syncCpu.loadByte(0x0502, 0x60); // RTS

        // Set PC to start and initialize registers
        await syncCpu.setProgramCounter(0x0400);
        await syncCpu.setXRegister(0);
        await syncCpu.setAccumulator(0);

        // Execute JSR $0500
        let cycles = await syncCpu.step();
        assert.strictEqual(cycles, 6);
        assert.strictEqual(await await getProgramCounter(syncCpu), 0x0500);

        // Execute LDA #$FF
        cycles = await syncCpu.step();
        assert.strictEqual(cycles, 2);
        assert.strictEqual(await await getAccumulator(syncCpu), 0xff);

        // Execute RTS
        cycles = await syncCpu.step();
        assert.strictEqual(cycles, 6);
        assert.strictEqual(await await getProgramCounter(syncCpu), 0x0403);

        // Execute INX
        cycles = await syncCpu.step();
        assert.strictEqual(cycles, 2);
        assert.strictEqual(await await getXRegister(syncCpu), 1);

        // We successfully executed the program with JSR/RTS, which means both CPUs handle stack operations correctly
    });

    test("correctly handles status flags", async () => {
        const syncCpu = createCPU();

        // Load a program to test status flags
        await syncCpu.loadByte(0x0000, 0xa9); // LDA #$80
        await syncCpu.loadByte(0x0001, 0x80); // #$80
        await syncCpu.loadByte(0x0002, 0x69); // ADC #$80
        await syncCpu.loadByte(0x0003, 0x80); // #$80

        // Set PC to start
        await syncCpu.setProgramCounter(0x0000);
        await syncCpu.clearStatusFlag(CARRY | ZERO | OVERFLOW | NEGATIVE);

        // Execute LDA #$80
        await syncCpu.step();
        assert.strictEqual(((await syncCpu.getState()).p & NEGATIVE) !== 0, true);
        assert.strictEqual(((await syncCpu.getState()).p & ZERO) === 0, true);

        // Execute ADC #$80
        await syncCpu.step();
        // 0x80 + 0x80 = 0x00 with carry and overflow
        assert.strictEqual(await await getAccumulator(syncCpu), 0x00);
        assert.strictEqual(((await syncCpu.getState()).p & CARRY) !== 0, true);
        assert.strictEqual(((await syncCpu.getState()).p & ZERO) !== 0, true);
        assert.strictEqual(((await syncCpu.getState()).p & OVERFLOW) !== 0, true);
        assert.strictEqual(((await syncCpu.getState()).p & NEGATIVE) === 0, true);
    });
});
