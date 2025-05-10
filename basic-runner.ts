/**
 * basic-runner.ts – minimal host glue to launch Microsoft BASIC (KIM-1
 * kb9.bin build) inside the JS 6502 core.
 *
 * Usage:
 *   bun run basic-runner.ts            # interactive prompt
 *   bun run basic-runner.ts --debug    # run with CPU state divergence detection
 *
 * Prerequisites:
 *   – Place kb9.bin (8 KiB image built with CONFIG_KIM) in repo root.
 *
 * Implementation details
 *   • Loads kb9.bin at $2000.
 *   • Writes tiny stubs (RTS or CLC; RTS) into the five monitor
 *     vectors BASIC expects.
 *   • Runs step() until the PC reaches a stub address, at which point
 *     the runner performs the corresponding host I/O and emulates RTS by
 *     popping the return address from the 6502 stack.
 */

import { readFileSync, appendFileSync } from "fs";
import { exit } from "process";
import { setTimeout } from "timers/promises";
import type { CPU } from "./cpu-interface";
import { CPU1 } from "./cpu1";
import { CPU2 } from "./cpu2";
import { SyncCPU } from "./sync-cpu";
import { defined } from "@glideapps/ts-necessities";

// Command line flags
const TRACE = process.argv.includes("--trace");
const DEBUG = process.argv.includes("--debug");
const USE_CPU1 = process.argv.includes("--cpu1");
const USE_CPU2 = process.argv.includes("--cpu2");
const USE_SYNC = process.argv.includes("--sync") || DEBUG; // --debug implies --sync

// ---------------------------------------------------------------------------
// Constants / helpers
// ---------------------------------------------------------------------------

const DIVERGENCE_LOG = "./cpu-divergence.log";

// KB9 build (KIM-1 v1.1)
// const ROM_PATH = "./kb9.bin";
// const ROM_ADDR = 0x2000;
// const MONRDKEY = 0x1e5a;
// const MONCOUT = 0x1ea0;
// const COLD_START = 0x4065;

const ROM_PATH = "./osi.bin";
const ROM_ADDR = 0xa000;
const MONRDKEY = 0xffeb;
const MONCOUT = 0xffee;
const COLD_START = 0xbd11;

// We still stub these for completeness (not used by KB9 but harmless)
const ISCNTC = 0xffb7;
const LOAD = 0xffb9;
const SAVE = 0xffbc;

// Fixed stack operations to use the CPU interface
function pop16(cpu: CPU): number {
    // Save current SP
    const sp = cpu.getStackPointer();

    // Increment SP and read low byte
    cpu.setStackPointer((sp + 1) & 0xff);
    const lo = cpu.readByte(0x0100 + cpu.getStackPointer());

    // Increment SP and read high byte
    cpu.setStackPointer((cpu.getStackPointer() + 1) & 0xff);
    const hi = cpu.readByte(0x0100 + cpu.getStackPointer());

    return (hi << 8) | lo;
}

function push16(cpu: CPU, val: number) {
    // Push high byte first
    const hi = (val >> 8) & 0xff;
    const lo = val & 0xff;

    // Push high byte
    cpu.loadByte(0x0100 + cpu.getStackPointer(), hi);
    cpu.setStackPointer((cpu.getStackPointer() - 1) & 0xff);

    // Push low byte
    cpu.loadByte(0x0100 + cpu.getStackPointer(), lo);
    cpu.setStackPointer((cpu.getStackPointer() - 1) & 0xff);
}

// ---------------------------------------------------------------------------
// CPU / memory initialisation
// ---------------------------------------------------------------------------

function buildCPU(): CPU {
    // Determine which CPU implementation to use based on command line flags
    let cpu: CPU;

    if (USE_SYNC) {
        cpu = new SyncCPU();
    } else if (USE_CPU2) {
        cpu = new CPU2();
    } else {
        // Default to CPU1 if no specific implementation is requested
        cpu = new CPU1();
    }

    const state = cpu.getState();

    // Load BASIC ROM image
    let bin: Buffer;
    try {
        bin = readFileSync(ROM_PATH);
    } catch (e) {
        console.error(
            `Cannot read ${ROM_PATH}. Build or download kb9.bin first.`,
        );
        exit(1);
    }
    if (bin.length > 0x10000 - ROM_ADDR) {
        console.error(
            `kb9.bin too large: got ${bin.length} bytes, expected <=${0x10000 - ROM_ADDR}`,
        );
        exit(1);
    }
    // KIM-1 kb9.bin layout: single contiguous blob expected to be loaded at $2000
    const maxLen = Math.min(bin.length, 0x10000 - ROM_ADDR);

    // Use CPU interface methods instead of directly manipulating memory
    for (let i = 0; i < maxLen; i++) {
        const byteValue = bin[i];
        // Ensure byteValue is defined before passing it to loadByte
        if (byteValue !== undefined) {
            cpu.loadByte(ROM_ADDR + i, byteValue);
        }
    }

    // Initial state using CPU interface methods
    cpu.setAccumulator(0);
    cpu.setXRegister(0);
    cpu.setYRegister(0);
    cpu.setStackPointer(0xfd);
    cpu.setStatusRegister(0x24);
    cpu.setProgramCounter(COLD_START);

    return cpu;
}

// ---------------------------------------------------------------------------
// Async IO helpers (Bun)
// ---------------------------------------------------------------------------

// Global input buffer
const inputBuffer: number[] = [];
let inputPromiseResolve: ((value: number) => void) | null = null;

// Set up input handling
try {
    if (process.stdin.isTTY) {
        process.stdin.setRawMode(true);
    }

    process.stdin.on("data", (data: Buffer) => {
        // Check for Ctrl-C (ASCII value 3)
        for (let i = 0; i < data.length; i++) {
            const byte = defined(data[i]);

            // If Ctrl-C is pressed
            if (byte === 3) {
                console.log("\nExiting MS-BASIC emulator...");
                exit(0);
            }

            inputBuffer.push(byte);
        }

        // If there's a pending promise, resolve it with the next character
        if (inputPromiseResolve && inputBuffer.length > 0) {
            const nextChar = inputBuffer.shift()!;
            const resolveFunc = inputPromiseResolve;
            inputPromiseResolve = null;
            resolveFunc(nextChar);
        }
    });
} catch (e) {
    console.warn(
        "Terminal input setup failed. Using fallback input method.",
        e,
    );
}

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
// Divergence tracking
// ---------------------------------------------------------------------------

// Map to track which opcodes have divergences
const divergenceMap = new Map<number, { count: number; lastError: string }>();

// Function to log divergence information
function logDivergence(opcode: number, error: string) {
    const opcodeKey = opcode;

    if (!divergenceMap.has(opcodeKey)) {
        divergenceMap.set(opcodeKey, { count: 1, lastError: error });
    } else {
        const info = divergenceMap.get(opcodeKey)!;
        info.count++;
        info.lastError = error;
        divergenceMap.set(opcodeKey, info);
    }

    // Log to file if in debug mode
    if (DEBUG) {
        const timestamp = new Date().toISOString();
        const errorMessage = `[${timestamp}] Opcode 0x${opcode.toString(16).padStart(2, "0")}: ${error}\n`;
        try {
            appendFileSync(DIVERGENCE_LOG, errorMessage);
        } catch (e) {
            console.error("Failed to write to divergence log:", e);
        }
    }
}

// ---------------------------------------------------------------------------
// Main run loop
// ---------------------------------------------------------------------------

async function main() {
    const cpu = buildCPU();
    const state = cpu.getState();

    const trapSet = new Set([MONRDKEY, MONCOUT, ISCNTC, LOAD, SAVE]);

    // Console message explaining CPU usage
    if (USE_SYNC) {
        console.log("Running MS-BASIC with SyncCPU");
        if (DEBUG) {
            console.log("Debug mode enabled");
            console.log("CPU divergences will be logged to:", DIVERGENCE_LOG);
            console.log(
                "Check this log to identify issues that need to be fixed in the CPU implementations.",
            );
        }
        console.log(
            "Will exit immediately on any CPU implementation divergence",
        );
        console.log("");
    } else if (USE_CPU2) {
        console.log("Running MS-BASIC with CPU2");
        console.log(
            "Use --sync flag to run with SyncCPU and detect implementation divergences.",
        );
        console.log("");
    } else {
        console.log("Running MS-BASIC with CPU1");
        console.log("");
        console.log("Available options:");
        console.log("  --cpu1            Use CPU1 implementation (default)");
        console.log("  --cpu2            Use CPU2 implementation");
        console.log(
            "  --sync            Use SyncCPU (runs both CPU1 and CPU2 in parallel)",
        );
        console.log(
            "  --debug           Enable debug mode with detailed logging",
        );
        console.log("  --trace           Enable instruction tracing");
        console.log("");
    }

    // Track instruction count for periodic status reporting
    let instructionCount = 0;
    const REPORT_INTERVAL = 10000; // Report every 10,000 instructions

    // Process to dump divergence summary every N instructions
    const dumpDivergenceSummary = () => {
        if (DEBUG && divergenceMap.size > 0) {
            console.log("\n--- CPU Divergence Summary ---");
            console.log(
                `Total unique opcodes with divergences: ${divergenceMap.size}`,
            );

            // Sort by frequency
            const sortedDivergences = [...divergenceMap.entries()]
                .sort((a, b) => b[1].count - a[1].count)
                .slice(0, 10); // Show top 10

            console.log("Top divergent opcodes:");
            sortedDivergences.forEach(([opcode, info]) => {
                console.log(
                    `  0x${opcode.toString(16).padStart(2, "0")}: ${info.count} occurrences`,
                );
                console.log(`    Last error: ${info.lastError}`);
            });

            console.log("----------------------------\n");
        }
    };

    while (true) {
        // Intercept before executing the opcode at PC
        if (trapSet.has(state.pc)) {
            const addr = state.pc;
            const ret = pop16(cpu) + 1; // emulate RTS using CPU interface

            switch (addr) {
                case MONRDKEY: {
                    const c = await readChar();
                    cpu.setAccumulator(c & 0xff);
                    break;
                }
                case MONCOUT: {
                    writeChar(cpu.getAccumulator());
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

            cpu.setProgramCounter(ret);
            continue;
        }

        // Execute CPU step and catch any divergences
        const pc = cpu.getProgramCounter();
        const opcode = cpu.readByte(pc);
        try {
            cpu.step(TRACE);

            // Count instructions for reporting
            instructionCount++;
            if (instructionCount % REPORT_INTERVAL === 0) {
                dumpDivergenceSummary();
            }
        } catch (error) {
            if (USE_SYNC) {
                const errorMessage = String(error);

                // Log the divergence
                if (DEBUG) {
                    logDivergence(opcode, errorMessage);
                }

                console.error(
                    `CPU divergence detected at 0x${pc.toString(16).padStart(4, "0")} with opcode 0x${opcode.toString(16).padStart(2, "0")}`,
                );
                console.error("Full error details:");
                console.error(errorMessage);
                console.error("\nExiting due to CPU implementation divergence");
                exit(1);
            } else {
                throw error; // In non-SyncCPU mode, let errors crash the program
            }
        }
    }
}

main();
