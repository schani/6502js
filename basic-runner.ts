/**
 * basic-runner.ts – minimal host glue to launch Microsoft BASIC (KIM-1
 * kb9.bin build) inside the JS 6502 core.
 *
 * Usage:
 *   bun run basic-runner.ts            # interactive prompt
 *
 * Prerequisites:
 *   – Place kb9.bin (8 KiB image built with CONFIG_KIM) in repo root.
 *
 * Implementation details
 *   • Loads kb9.bin at $A000.
 *   • Writes tiny stubs (RTS or CLC; RTS) into the five monitor
 *     vectors BASIC expects.
 *   • Runs step6502() until the PC reaches a stub address, at which point
 *     the runner performs the corresponding host I/O and emulates RTS by
 *     popping the return address from the 6502 stack.
 */

import { readFileSync } from "fs";
import { exit } from "process";
import { setTimeout } from "timers/promises";
import { CPU1, type CPUState } from "./6502";
import { defined } from "@glideapps/ts-necessities";

// rudimentary CLI flag
const TRACE = process.argv.includes("--trace");

// ---------------------------------------------------------------------------
// Constants / helpers
// ---------------------------------------------------------------------------

const KB9_PATH = "./kb9.bin";

// KB9 build (KIM-1 v1.1)
// I/O vectors are *inside* the binary, not in the 6502 reset page.
const MONRDKEY = 0x1e5a;
const MONCOUT = 0x1ea0;

// We still stub these for completeness (not used by KB9 but harmless)
const ISCNTC = 0xffb7;
const LOAD = 0xffb9;
const SAVE = 0xffbc;

function pop16(cpu: CPUState): number {
    const lo = defined(cpu.mem[0x100 | ((cpu.sp + 1) & 0xff)]);
    const hi = defined(cpu.mem[0x100 | ((cpu.sp + 2) & 0xff)]);
    cpu.sp = (cpu.sp + 2) & 0xff;
    return (hi << 8) | lo;
}

function push16(cpu: CPUState, val: number) {
    cpu.mem[0x100 | cpu.sp] = (val >> 8) & 0xff;
    cpu.sp = (cpu.sp - 1) & 0xff;
    cpu.mem[0x100 | cpu.sp] = val & 0xff;
    cpu.sp = (cpu.sp - 1) & 0xff;
}

// ---------------------------------------------------------------------------
// CPU / memory initialisation
// ---------------------------------------------------------------------------

function buildCPU(): CPU1 {
    const cpu = new CPU1();
    const state = cpu.getState();
    
    // Load BASIC ROM image
    let bin: Buffer;
    try {
        bin = readFileSync(KB9_PATH);
    } catch (e) {
        console.error(
            `Cannot read ${KB9_PATH}. Build or download kb9.bin first.`,
        );
        exit(1);
    }
    if (bin.length < 0x2000) {
        console.error(
            `kb9.bin too small (got ${bin.length} bytes, expected ≥ 8192). Did the build fail?`,
        );
        exit(1);
    }
    // KIM-1 kb9.bin layout: single contiguous blob expected to be loaded at $2000
    const maxLen = Math.min(bin.length, 0x10000 - 0x2000);
    state.mem.set(bin.subarray(0, maxLen), 0x2000);

    // Write monitor stubs that are *not* inside the BASIC image (high ROM)
    state.mem[LOAD] = 0x60;
    state.mem[SAVE] = 0x60;
    // ISCNTC: CLC ; RTS
    state.mem[ISCNTC] = 0x18; // CLC
    state.mem[ISCNTC + 1] = 0x60; // RTS

    // Initial state
    state.a = 0;
    state.x = 0;
    state.y = 0;
    state.sp = 0xfd;
    state.p = 0x24;
    state.pc = 0x4065;
    
    return cpu;
}

// ---------------------------------------------------------------------------
// Async IO helpers (Bun)
// ---------------------------------------------------------------------------

// Global input buffer
const inputBuffer: number[] = [];
let inputPromiseResolve: ((value: number) => void) | null = null;

// Set up input handling
process.stdin.setRawMode(true);
process.stdin.on("data", (data: Buffer) => {
    // Add each byte to the buffer
    for (let i = 0; i < data.length; i++) {
        inputBuffer.push(defined(data[i]));
    }

    // If there's a pending promise, resolve it with the next character
    if (inputPromiseResolve && inputBuffer.length > 0) {
        const nextChar = inputBuffer.shift()!;
        const resolveFunc = inputPromiseResolve;
        inputPromiseResolve = null;
        resolveFunc(nextChar);
    }
});

async function readChar(): Promise<number> {
    // If we have buffered input, use it
    if (inputBuffer.length > 0) {
        let char = inputBuffer.shift()!;

        // Convert LF (0x0A) to CR (0x0D) as expected by MS-BASIC
        if (char === 0x0a) {
            char = 0x0d;
        }

        return char;
    }

    // Otherwise wait for input
    return new Promise<number>((resolve) => {
        inputPromiseResolve = (value: number) => {
            // Convert LF to CR
            if (value === 0x0a) {
                value = 0x0d;
            }
            resolve(value);
        };
    });
}

function writeChar(c: number) {
    Bun.stdout.write(Uint8Array.of(c));
}

// ---------------------------------------------------------------------------
// Main run loop
// ---------------------------------------------------------------------------

async function main() {
    const cpu = buildCPU();
    const state = cpu.getState();

    const trapSet = new Set([MONRDKEY, MONCOUT, ISCNTC, LOAD, SAVE]);

    while (true) {
        // Intercept before executing the opcode at PC
        if (trapSet.has(state.pc)) {
            const addr = state.pc;
            const ret = pop16(state) + 1; // emulate RTS

            switch (addr) {
                case MONRDKEY: {
                    const c = await readChar();
                    state.a = c & 0xff;
                    break;
                }
                case MONCOUT: {
                    writeChar(state.a);
                    break;
                }
                case ISCNTC: {
                    // C already clear from stub; nothing else
                    break;
                }
                case LOAD:
                case SAVE:
                    // No tape; do nothing
                    break;
            }

            state.pc = ret;
            continue;
        }

        cpu.step(TRACE);
    }
}

main();
