import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { CPU1 } from "../core/cpu1.ts";
import { CPU2 } from "../core/cpu2.ts";
import { PGCPU } from "../core/pgcpu.ts";
import { SyncCPU } from "../core/sync-cpu.ts";
import {
    ROM_ADDR,
    COLD_START,
    MONRDKEY,
    MONCOUT,
    ISCNTC,
    buildCPU,
    initBasic,
    initBasicFromRom,
    pop16,
    handleTrap,
    type TrapIO,
} from "../runners/basic-harness.ts";

describe("buildCPU", () => {
    it("should default to CPU1", () => {
        assert.ok(buildCPU([]) instanceof CPU1);
        assert.ok(buildCPU(["--cpu1"]) instanceof CPU1);
    });

    it("should select CPU2 with --cpu2", () => {
        assert.ok(buildCPU(["--cpu2"]) instanceof CPU2);
    });

    it("should select PGCPU with --pgcpu", () => {
        assert.ok(buildCPU(["--pgcpu"]) instanceof PGCPU);
    });

    it("should select SyncCPU with --sync and with --debug", () => {
        assert.ok(buildCPU(["--sync"]) instanceof SyncCPU);
        assert.ok(buildCPU(["--debug"]) instanceof SyncCPU);
    });
});

describe("pop16", () => {
    it("should pop a little-endian word and advance SP", async () => {
        const cpu = new CPU1();
        await cpu.setStackPointer(0xfb);
        await cpu.loadByte(0x01fc, 0x34); // low byte
        await cpu.loadByte(0x01fd, 0x12); // high byte
        assert.equal(await pop16(cpu), 0x1234);
        assert.equal((await cpu.getState()).sp, 0xfd);
    });

    it("should wrap the stack pointer", async () => {
        const cpu = new CPU1();
        await cpu.setStackPointer(0xff);
        await cpu.loadByte(0x0100, 0x78);
        await cpu.loadByte(0x0101, 0x56);
        assert.equal(await pop16(cpu), 0x5678);
        assert.equal((await cpu.getState()).sp, 0x01);
    });
});

describe("initBasic", () => {
    it("should load the ROM at ROM_ADDR and reset to the cold start", async () => {
        const cpu = new CPU1();
        await initBasic(cpu);
        const state = await cpu.getState();
        assert.equal(state.pc, COLD_START);
        assert.equal(state.a, 0);
        assert.equal(state.x, 0);
        assert.equal(state.y, 0);
        assert.equal(state.sp, 0xfd);
        assert.equal(state.p, 0x24);
        // The ROM's ISCNTC stub tail-jumps to $FFF1: 4C F1 FF at $A629
        assert.equal(await cpu.readByte(0xa629), 0x4c);
        assert.equal(await cpu.readWord(0xa62a), ISCNTC);
    });

    it("should throw for a missing ROM file", async () => {
        const cpu = new CPU1();
        await assert.rejects(initBasic(cpu, "./no-such-rom.bin"));
    });

    it("should reject a ROM that does not fit above ROM_ADDR", async () => {
        const cpu = new CPU1();
        const oversized = new Uint8Array(0x10000 - ROM_ADDR + 1);
        await assert.rejects(initBasicFromRom(cpu, oversized), /too large/);
    });
});

function makeIO(input: number[] = []): TrapIO & { output: number[] } {
    const output: number[] = [];
    return {
        output,
        putChar: (c) => output.push(c),
        getChar: () => input.shift(),
    };
}

// Simulate a JSR to `target` from address `from`: push the return
// address (from + 2, i.e. the JSR's last byte) and set PC to target.
async function fakeJSR(cpu: CPU1, from: number, target: number): Promise<void> {
    const ret = (from + 2) & 0xffff;
    await cpu.loadByte(0x01fd, (ret >> 8) & 0xff);
    await cpu.loadByte(0x01fc, ret & 0xff);
    await cpu.setStackPointer(0xfb);
    await cpu.setProgramCounter(target);
}

describe("handleTrap", () => {
    it("should not trap ordinary addresses", async () => {
        const cpu = new CPU1();
        await cpu.setProgramCounter(0x1234);
        assert.equal(await handleTrap(cpu, makeIO()), "not-trapped");
        assert.equal((await cpu.getState()).pc, 0x1234);
    });

    it("should emit the accumulator on MONCOUT and return", async () => {
        const cpu = new CPU1();
        await fakeJSR(cpu, 0x2000, MONCOUT);
        await cpu.setAccumulator(0x41);
        const io = makeIO();
        assert.equal(await handleTrap(cpu, io), "handled");
        assert.deepEqual(io.output, [0x41]);
        const state = await cpu.getState();
        assert.equal(state.pc, 0x2003); // return address + 1
        assert.equal(state.sp, 0xfd);
    });

    it("should read a character on MONRDKEY and return", async () => {
        const cpu = new CPU1();
        await fakeJSR(cpu, 0x2000, MONRDKEY);
        assert.equal(await handleTrap(cpu, makeIO([0x58])), "handled");
        const state = await cpu.getState();
        assert.equal(state.a, 0x58);
        assert.equal(state.pc, 0x2003);
    });

    it("should support an async getChar", async () => {
        const cpu = new CPU1();
        await fakeJSR(cpu, 0x2000, MONRDKEY);
        const io: TrapIO = {
            putChar: () => {},
            getChar: () => Promise.resolve(0x59),
        };
        assert.equal(await handleTrap(cpu, io), "handled");
        assert.equal((await cpu.getState()).a, 0x59);
    });

    it("should leave CPU state untouched when input is unavailable", async () => {
        const cpu = new CPU1();
        await fakeJSR(cpu, 0x2000, MONRDKEY);
        assert.equal(await handleTrap(cpu, makeIO()), "need-input");
        const state = await cpu.getState();
        // PC and SP must be unchanged so the trap can be retried later
        assert.equal(state.pc, MONRDKEY);
        assert.equal(state.sp, 0xfb);
        // Retry with input available must pop the same return address
        assert.equal(await handleTrap(cpu, makeIO([0x30])), "handled");
        const after = await cpu.getState();
        assert.equal(after.a, 0x30);
        assert.equal(after.pc, 0x2003);
        assert.equal(after.sp, 0xfd);
    });

    it("should treat ISCNTC as a no-op stub and return", async () => {
        const cpu = new CPU1();
        await fakeJSR(cpu, 0x2000, ISCNTC);
        const io = makeIO();
        assert.equal(await handleTrap(cpu, io), "handled");
        assert.deepEqual(io.output, []);
        assert.equal((await cpu.getState()).pc, 0x2003);
    });
});
