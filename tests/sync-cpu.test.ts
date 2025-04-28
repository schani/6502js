import { expect, test, describe } from "bun:test";
import { SyncCPU } from "../sync-cpu";
import { CPU1 } from "../cpu1";
import { CPU2 } from "../cpu2";
import { CARRY, ZERO, OVERFLOW, NEGATIVE } from "../6502";

describe("SyncCPU", () => {
    test("correctly synchronizes CPU states for basic operations", () => {
        const syncCpu = new SyncCPU();

        // Load a simple program: LDA #42, ADC #13, RTS
        syncCpu.loadByte(0x0000, 0xa9); // LDA #42
        syncCpu.loadByte(0x0001, 0x2a); // #42
        syncCpu.loadByte(0x0002, 0x69); // ADC #13
        syncCpu.loadByte(0x0003, 0x0d); // #13
        syncCpu.loadByte(0x0004, 0x60); // RTS

        // Set PC to start
        syncCpu.setProgramCounter(0x0000);

        // Execute LDA #42
        let cycles = syncCpu.step();
        expect(cycles).toBe(2);
        expect(syncCpu.getAccumulator()).toBe(0x2a);

        // Execute ADC #13
        cycles = syncCpu.step();
        expect(cycles).toBe(2);
        expect(syncCpu.getAccumulator()).toBe(0x37); // 42 + 13 = 55 (0x37)

        // We successfully executed both steps, which means the states matched
    });

    test("correctly handles memory boundary wrapping", () => {
        const syncCpu = new SyncCPU();

        // Test a write across the memory boundary
        syncCpu.loadWord(0xffff, 0x1234);

        expect(syncCpu.readByte(0xffff)).toBe(0x34);
        expect(syncCpu.readByte(0x0000)).toBe(0x12);
        expect(syncCpu.readWord(0xffff)).toBe(0x1234);

        // This test passing means that both CPU1 and CPU2 handle wrapping correctly
    });

    // Skip this test for now as CPU1 and CPU2 have different stack implementations
    // We'll come back to fixing this after we harmonize the implementations
    test("correctly handles JSR/RTS operations", () => {
        const syncCpu = new SyncCPU();

        // Load a simple program with JSR and RTS
        // Main program
        syncCpu.loadByte(0x0400, 0x20); // JSR
        syncCpu.loadByte(0x0401, 0x00); // $0500 (low byte)
        syncCpu.loadByte(0x0402, 0x05); // $0500 (high byte)
        syncCpu.loadByte(0x0403, 0xe8); // INX (after return)
        syncCpu.loadByte(0x0404, 0x00); // BRK

        // Subroutine
        syncCpu.loadByte(0x0500, 0xa9); // LDA #$FF
        syncCpu.loadByte(0x0501, 0xff); // #$FF
        syncCpu.loadByte(0x0502, 0x60); // RTS

        // Set PC to start and initialize registers
        syncCpu.setProgramCounter(0x0400);
        syncCpu.setXRegister(0);
        syncCpu.setAccumulator(0);

        // Execute JSR $0500
        let cycles = syncCpu.step();
        expect(cycles).toBe(6);
        expect(syncCpu.getProgramCounter()).toBe(0x0500);

        // Execute LDA #$FF
        cycles = syncCpu.step();
        expect(cycles).toBe(2);
        expect(syncCpu.getAccumulator()).toBe(0xff);

        // Execute RTS
        cycles = syncCpu.step();
        expect(cycles).toBe(6);
        expect(syncCpu.getProgramCounter()).toBe(0x0403);

        // Execute INX
        cycles = syncCpu.step();
        expect(cycles).toBe(2);
        expect(syncCpu.getXRegister()).toBe(1);

        // We successfully executed the program with JSR/RTS, which means both CPUs handle stack operations correctly
    });

    test("correctly handles status flags", () => {
        const syncCpu = new SyncCPU();

        // Load a program to test status flags
        syncCpu.loadByte(0x0000, 0xa9); // LDA #$80
        syncCpu.loadByte(0x0001, 0x80); // #$80
        syncCpu.loadByte(0x0002, 0x69); // ADC #$80
        syncCpu.loadByte(0x0003, 0x80); // #$80

        // Set PC to start
        syncCpu.setProgramCounter(0x0000);
        syncCpu.clearStatusFlag(CARRY | ZERO | OVERFLOW | NEGATIVE);

        // Execute LDA #$80
        syncCpu.step();
        expect(syncCpu.isStatusFlagSet(NEGATIVE)).toBe(true);
        expect(syncCpu.isStatusFlagSet(ZERO)).toBe(false);

        // Execute ADC #$80
        syncCpu.step();
        // 0x80 + 0x80 = 0x00 with carry and overflow
        expect(syncCpu.getAccumulator()).toBe(0x00);
        expect(syncCpu.isStatusFlagSet(CARRY)).toBe(true);
        expect(syncCpu.isStatusFlagSet(ZERO)).toBe(true);
        expect(syncCpu.isStatusFlagSet(OVERFLOW)).toBe(true);
        expect(syncCpu.isStatusFlagSet(NEGATIVE)).toBe(false);
    });
});
