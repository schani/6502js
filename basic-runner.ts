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
import type { CPU, CPUState } from "./cpu-interface";
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

const KB9_PATH = "./kb9.bin";
const DIVERGENCE_LOG = "./cpu-divergence.log";

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

    // Use CPU interface methods instead of directly manipulating memory
    for (let i = 0; i < maxLen; i++) {
        const byteValue = bin[i];
        // Ensure byteValue is defined before passing it to loadByte
        if (byteValue !== undefined) {
            cpu.loadByte(0x2000 + i, byteValue);
        }
    }

    // Write monitor stubs that are *not* inside the BASIC image (high ROM)
    cpu.loadByte(LOAD, 0x60);
    cpu.loadByte(SAVE, 0x60);
    // ISCNTC: CLC ; RTS
    cpu.loadByte(ISCNTC, 0x18); // CLC
    cpu.loadByte(ISCNTC + 1, 0x60); // RTS

    // Initial state using CPU interface methods
    cpu.setAccumulator(0);
    cpu.setXRegister(0);
    cpu.setYRegister(0);
    cpu.setStackPointer(0xfd);
    cpu.setStatusRegister(0x24);
    cpu.setProgramCounter(0x4065);

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
            console.log("Check this log to identify issues that need to be fixed in the CPU implementations.");
        }
        console.log("Will exit immediately on any CPU implementation divergence");
        console.log("");
    } else if (USE_CPU2) {
        console.log("Running MS-BASIC with CPU2");
        console.log("Use --sync flag to run with SyncCPU and detect implementation divergences.");
        console.log("");
    } else {
        console.log("Running MS-BASIC with CPU1");
        console.log("");
        console.log("Available options:");
        console.log("  --cpu1            Use CPU1 implementation (default)");
        console.log("  --cpu2            Use CPU2 implementation");
        console.log("  --sync            Use SyncCPU (runs both CPU1 and CPU2 in parallel)");
        console.log("  --debug           Enable debug mode with detailed logging");
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
            const ret = pop16(state) + 1; // emulate RTS

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
        try {
            const opcode = cpu.readByte(cpu.getProgramCounter());
            cpu.step(TRACE);

            // Count instructions for reporting
            instructionCount++;
            if (instructionCount % REPORT_INTERVAL === 0) {
                dumpDivergenceSummary();
            }
        } catch (error) {
            if (USE_SYNC) {
                const errorMessage = String(error);
                const opcode = cpu.readByte(cpu.getProgramCounter() - 1); // Rough approximation of last executed opcode

                // Log the divergence
                if (DEBUG) {
                    logDivergence(opcode, errorMessage);
                }
                
                console.error(`CPU divergence detected with opcode 0x${opcode.toString(16).padStart(2, "0")}`);
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
