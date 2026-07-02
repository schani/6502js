/**
 * basic-harness.ts – shared host glue for running Microsoft BASIC (OSI
 * build, data/osi.bin) on the 6502 cores. Used by basic-runner.ts and
 * dsl-runner.ts.
 *
 * The harness loads the ROM at $A000, resets the registers to the
 * cold-start entry, and traps the monitor vectors (MONRDKEY, MONCOUT,
 * ISCNTC, LOAD, SAVE), emulating each routine's RTS by popping the
 * return address from the 6502 stack.
 */

import { readFileSync } from "fs";
import type { CPU } from "../core/cpu-interface.ts";
import { CPU1 } from "../core/cpu1.ts";
import { CPU2 } from "../core/cpu2.ts";
import { PGCPU } from "../core/pgcpu.ts";
import { SyncCPU } from "../core/sync-cpu.ts";

export const ROM_PATH = "./data/osi.bin";
export const ROM_ADDR = 0xa000; // in .cfg: BASROM
export const COLD_START = 0xbd11; // in .lbl

// Monitor vectors trapped by the host (addresses from the OSI .lbl file).
// The ROM calls MONRDKEY and MONCOUT via JSR and tail-jumps to ISCNTC
// via JMP $FFF1; LOAD and SAVE are stubbed for completeness.
export const MONRDKEY = 0xffeb;
export const MONCOUT = 0xffee;
export const ISCNTC = 0xfff1;
export const LOAD = 0xfff4;
export const SAVE = 0xfff7;

export const TRAP_ADDRESSES: ReadonlySet<number> = new Set([
    MONRDKEY,
    MONCOUT,
    ISCNTC,
    LOAD,
    SAVE,
]);

/**
 * Pick a CPU implementation from command-line flags
 * (--cpu1 | --cpu2 | --pgcpu | --sync; --debug implies --sync)
 */
export function buildCPU(argv: readonly string[]): CPU {
    if (argv.includes("--sync") || argv.includes("--debug")) return new SyncCPU();
    if (argv.includes("--pgcpu")) return new PGCPU();
    if (argv.includes("--cpu2")) return new CPU2();
    return new CPU1();
}

/** Load the BASIC ROM into memory and reset the registers to the cold-start entry */
export async function initBasic(cpu: CPU, romPath = ROM_PATH): Promise<void> {
    const rom = readFileSync(romPath);
    if (rom.length > 0x10000 - ROM_ADDR) {
        throw new Error(
            `${romPath} too large: got ${rom.length} bytes, expected <= ${0x10000 - ROM_ADDR}`,
        );
    }
    for (let i = 0; i < rom.length; i++) {
        await cpu.loadByte(ROM_ADDR + i, rom[i]!);
    }
    await cpu.setAccumulator(0);
    await cpu.setXRegister(0);
    await cpu.setYRegister(0);
    await cpu.setStackPointer(0xfd);
    await cpu.setStatusRegister(0x24);
    await cpu.setProgramCounter(COLD_START);
}

/** Pop a 16-bit little-endian word from the 6502 stack */
export async function pop16(cpu: CPU): Promise<number> {
    const sp0 = (await cpu.getState()).sp;
    await cpu.setStackPointer((sp0 + 1) & 0xff);
    const lo = await cpu.readByte(0x0100 + ((sp0 + 1) & 0xff));
    await cpu.setStackPointer((sp0 + 2) & 0xff);
    const hi = await cpu.readByte(0x0100 + ((sp0 + 2) & 0xff));
    return (hi << 8) | lo;
}

export type TrapResult = "not-trapped" | "handled" | "need-input";

export interface TrapIO {
    /** Receives each byte BASIC writes via MONCOUT */
    putChar(c: number): void;
    /**
     * Provide the next input byte for MONRDKEY. Return undefined if no
     * input is available yet (the trap reports "need-input" and can be
     * retried later); interactive hosts may return a Promise that
     * resolves when a key arrives.
     */
    getChar(): number | undefined | Promise<number>;
}

/**
 * If the PC sits on a trapped monitor vector, emulate the routine and its
 * RTS. Returns "not-trapped" if the PC is elsewhere, and "need-input"
 * (leaving PC and stack untouched, so the trap can be retried) when
 * MONRDKEY is reached but io.getChar() has nothing to deliver.
 */
export async function handleTrap(cpu: CPU, io: TrapIO): Promise<TrapResult> {
    const pc = (await cpu.getState()).pc;
    if (!TRAP_ADDRESSES.has(pc)) return "not-trapped";

    if (pc === MONRDKEY) {
        // Check for input before touching the stack: if none is available
        // we must leave the CPU state intact for a later retry.
        const c = io.getChar();
        if (c === undefined) return "need-input";
        const ret = ((await pop16(cpu)) + 1) & 0xffff;
        await cpu.setAccumulator((typeof c === "number" ? c : await c) & 0xff);
        await cpu.setProgramCounter(ret);
        return "handled";
    }

    const ret = ((await pop16(cpu)) + 1) & 0xffff;
    if (pc === MONCOUT) {
        io.putChar((await cpu.getState()).a & 0xff);
    }
    // ISCNTC, LOAD, SAVE: nothing to do, just return
    await cpu.setProgramCounter(ret);
    return "handled";
}
