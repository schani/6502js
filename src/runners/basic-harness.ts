/**
 * basic-harness.ts – Node-side glue for running Microsoft BASIC (OSI
 * build, data/osi.bin) on the 6502 cores. Used by basic-runner.ts and
 * dsl-runner.ts. The environment-independent parts (ROM/register setup,
 * monitor-vector trapping) live in basic-traps.ts, shared with the web
 * debugger.
 */

import { readFileSync } from "fs";
import type { CPU } from "../core/cpu-interface.ts";
import { CPU1 } from "../core/cpu1.ts";
import { CPU2 } from "../core/cpu2.ts";
import { PGCPU } from "../core/pgcpu.ts";
import { SyncCPU } from "../core/sync-cpu.ts";
import { initBasicFromRom } from "./basic-traps.ts";

export * from "./basic-traps.ts";

export const ROM_PATH = "./data/osi.bin";

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

/** Load the BASIC ROM from disk and reset the registers to the cold-start entry */
export async function initBasic(cpu: CPU, romPath = ROM_PATH): Promise<void> {
    await initBasicFromRom(cpu, readFileSync(romPath));
}
