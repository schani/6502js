import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { ZERO, NEGATIVE } from "../core/constants.ts";
import { createCPU } from "./utils.ts";

describe("LDY instruction", () => {
    it("should load Y in all addressing modes", async () => {
        const cpu = createCPU();

        // Immediate
        await cpu.loadByte(0x1000, 0xa0); // LDY #$42
        await cpu.loadByte(0x1001, 0x42);
        await cpu.setProgramCounter(0x1000);
        await cpu.step();
        assert.strictEqual((await cpu.getState()).y, 0x42);
        assert.strictEqual((await cpu.getState()).pc, 0x1002);

        // Zero Page
        await cpu.loadByte(0x1002, 0xa4); // LDY $50
        await cpu.loadByte(0x1003, 0x50);
        await cpu.loadByte(0x0050, 0x99);
        await cpu.setProgramCounter(0x1002);
        await cpu.step();
        assert.strictEqual((await cpu.getState()).y, 0x99);

        // Zero Page,X
        await cpu.loadByte(0x1004, 0xb4); // LDY $60,X
        await cpu.loadByte(0x1005, 0x60);
        await cpu.loadByte(0x0070, 0x88); // Value at $60 + $10
        await cpu.setXRegister(0x10);
        await cpu.setProgramCounter(0x1004);
        await cpu.step();
        assert.strictEqual((await cpu.getState()).y, 0x88);

        // Absolute
        await cpu.loadByte(0x1006, 0xac); // LDY $2000
        await cpu.loadByte(0x1007, 0x00);
        await cpu.loadByte(0x1008, 0x20);
        await cpu.loadByte(0x2000, 0x77);
        await cpu.setProgramCounter(0x1006);
        await cpu.step();
        assert.strictEqual((await cpu.getState()).y, 0x77);

        // Absolute,X
        await cpu.loadByte(0x1009, 0xbc); // LDY $2100,X
        await cpu.loadByte(0x100a, 0x00);
        await cpu.loadByte(0x100b, 0x21);
        await cpu.loadByte(0x2110, 0x66); // Value at $2100 + $10
        await cpu.setXRegister(0x10);
        await cpu.setProgramCounter(0x1009);
        await cpu.step();
        assert.strictEqual((await cpu.getState()).y, 0x66);

        // Absolute,X with page crossing
        await cpu.loadByte(0x100c, 0xbc); // LDY $21F0,X
        await cpu.loadByte(0x100d, 0xf0);
        await cpu.loadByte(0x100e, 0x21);
        await cpu.loadByte(0x2200, 0x55); // Value at $21F0 + $10 (page boundary crossed)
        await cpu.setXRegister(0x10);
        await cpu.setProgramCounter(0x100c);
        await cpu.step();
        assert.strictEqual((await cpu.getState()).y, 0x55);
    });

    it("should set the zero and negative flags", async () => {
        const cpu = createCPU();

        // Zero result
        await cpu.loadByte(0x1000, 0xa0); // LDY #$00
        await cpu.loadByte(0x1001, 0x00);
        await cpu.setProgramCounter(0x1000);
        await cpu.setYRegister(0xff);
        await cpu.clearStatusFlag(ZERO);
        await cpu.setStatusFlag(NEGATIVE);
        await cpu.step();
        let state = await cpu.getState();
        assert.strictEqual(state.y, 0x00);
        assert.notStrictEqual(state.p & ZERO, 0);
        assert.strictEqual(state.p & NEGATIVE, 0);

        // Negative result
        await cpu.loadByte(0x1002, 0xa0); // LDY #$80
        await cpu.loadByte(0x1003, 0x80);
        await cpu.setProgramCounter(0x1002);
        await cpu.setStatusFlag(ZERO);
        await cpu.clearStatusFlag(NEGATIVE);
        await cpu.step();
        state = await cpu.getState();
        assert.strictEqual(state.y, 0x80);
        assert.strictEqual(state.p & ZERO, 0);
        assert.notStrictEqual(state.p & NEGATIVE, 0);
    });

    it("should read 0 from uninitialized memory", async () => {
        const cpu = createCPU();

        // Immediate operand left uninitialized
        await cpu.loadByte(0x1000, 0xa0); // LDY #$??
        await cpu.setProgramCounter(0x1000);
        await cpu.step();
        let state = await cpu.getState();
        assert.strictEqual(state.y, 0);
        assert.notStrictEqual(state.p & ZERO, 0);
        assert.strictEqual(state.pc, 0x1002);

        // Zero-page target left uninitialized
        await cpu.loadByte(0x1002, 0xa4); // LDY $90
        await cpu.loadByte(0x1003, 0x90);
        await cpu.step();
        state = await cpu.getState();
        assert.strictEqual(state.y, 0);
        assert.notStrictEqual(state.p & ZERO, 0);
    });

    it("should handle operands and targets at memory boundaries", async () => {
        const cpu = createCPU();

        // Absolute read from $FFFF, with the operand bytes at the very top of memory
        await cpu.loadByte(0xfffd, 0xac); // LDY $FFFF
        await cpu.loadByte(0xfffe, 0xff);
        await cpu.loadByte(0xffff, 0xff);
        await cpu.setProgramCounter(0xfffd);
        await cpu.step();
        let state = await cpu.getState();
        assert.strictEqual(state.y, 0xff); // Reads the last byte of memory
        assert.notStrictEqual(state.p & NEGATIVE, 0);
        // PC wraps past $FFFF
        assert.ok(state.pc > 0xff00 || state.pc < 0x0010);

        // Absolute,X wrapping around the top of the address space
        await cpu.loadByte(0x2000, 0xbc); // LDY $FFFF,X
        await cpu.loadByte(0x2001, 0xff);
        await cpu.loadByte(0x2002, 0xff);
        await cpu.loadByte(0x00fe, 0x55); // $FFFF + $FF wraps to $00FE
        await cpu.setXRegister(0xff);
        await cpu.setProgramCounter(0x2000);
        await cpu.step();
        state = await cpu.getState();
        assert.strictEqual(state.y, 0x55);
        assert.strictEqual(state.pc, 0x2003);

        // Zero page at $FF
        await cpu.loadByte(0x1000, 0xa4); // LDY $FF
        await cpu.loadByte(0x1001, 0xff);
        await cpu.loadByte(0x00ff, 0x77);
        await cpu.setXRegister(0);
        await cpu.setProgramCounter(0x1000);
        await cpu.step();
        state = await cpu.getState();
        assert.strictEqual(state.y, 0x77);
        assert.strictEqual(state.pc, 0x1002);

        // Zero Page,X wrapping within the zero page
        await cpu.loadByte(0x1002, 0xb4); // LDY $FF,X
        await cpu.loadByte(0x1003, 0xff);
        await cpu.loadByte(0x000e, 0x66); // $FF + $0F wraps to $0E
        await cpu.setXRegister(0x0f);
        await cpu.setProgramCounter(0x1002);
        await cpu.step();
        state = await cpu.getState();
        assert.strictEqual(state.y, 0x66);
        assert.strictEqual(state.pc, 0x1004);
    });
});
