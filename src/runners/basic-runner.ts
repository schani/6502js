/**
 * basic-runner.ts – interactive host to run Microsoft BASIC (OSI build,
 * data/osi.bin) on the 6502 cores, wired to stdin/stdout.
 *
 * Usage:
 *   npm run basic                # interactive prompt (CPU1)
 *   npm run basic -- --cpu2      # use CPU2
 *   npm run basic -- --pgcpu     # use PGCPU (PostgreSQL-based)
 *   npm run basic -- --sync      # run CPU1, CPU2, and PGCPU in lockstep
 *   npm run basic -- --debug     # sync mode with divergence logging
 *   npm run basic -- --trace     # per-instruction tracing
 *
 * ROM loading, register setup, and monitor-vector trapping live in
 * basic-harness.ts, shared with dsl-runner.ts.
 */

import { appendFileSync } from "fs";
import { exit } from "process";
import { defined } from "@glideapps/ts-necessities";
import { buildCPU, initBasic, handleTrap, type TrapIO } from "./basic-harness.ts";

// Command line flags
const TRACE = process.argv.includes("--trace");
const DEBUG = process.argv.includes("--debug");
const USE_CPU2 = process.argv.includes("--cpu2");
const USE_PGCPU = process.argv.includes("--pgcpu");
const USE_SYNC = process.argv.includes("--sync") || DEBUG; // --debug implies --sync

const DIVERGENCE_LOG = "./cpu-divergence.log";

// ---------------------------------------------------------------------------
// Async IO helpers (Node stdin/stdout)
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

// Convert LF (0x0A) to CR (0x0D) as expected by MS-BASIC
function lfToCr(c: number): number {
    return c === 0x0a ? 0x0d : c;
}

async function readChar(): Promise<number> {
    // If we have buffered input, use it
    if (inputBuffer.length > 0) {
        return lfToCr(inputBuffer.shift()!);
    }

    // Otherwise wait for input
    return new Promise<number>((resolve) => {
        inputPromiseResolve = (value: number) => resolve(lfToCr(value));
    });
}

const io: TrapIO = {
    putChar: (c) => {
        process.stdout.write(Buffer.from([c]));
    },
    getChar: () => readChar(),
};

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
    const cpu = buildCPU(process.argv);
    try {
        await initBasic(cpu);
    } catch (e) {
        console.error(String(e));
        exit(1);
    }

    // Console message explaining CPU usage
    if (USE_SYNC) {
        console.log("Running MS-BASIC with SyncCPU (CPU1, CPU2, and PGCPU in parallel)");
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
    } else if (USE_PGCPU) {
        console.log("Running MS-BASIC with PGCPU (PostgreSQL-based)");
        console.log(
            "Use --sync flag to run with SyncCPU and detect implementation divergences.",
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
        console.log("  --pgcpu           Use PGCPU implementation (PostgreSQL-based)");
        console.log(
            "  --sync            Use SyncCPU (runs CPU1, CPU2, and PGCPU in parallel)",
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
        // (getChar blocks until a key arrives, so this never reports need-input)
        if ((await handleTrap(cpu, io)) !== "not-trapped") {
            continue;
        }

        // Execute CPU step and catch any divergences
        const pc = (await cpu.getState()).pc;
        const opcode = await cpu.readByte(pc);
        try {
            await cpu.step(TRACE);

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
