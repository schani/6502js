/**
 * Common 6502 CPU implementation classes
 */
import { disassemble } from "./disasm.ts";
import { defined } from "@glideapps/ts-necessities";
import type { CPU, CPUState } from "../core/cpu-interface.ts";
import { createCPUState } from "../core/cpu-interface.ts";

// Re-export the interfaces
export type { CPU, CPUState };
export { createCPUState };

// Re-export defined for other modules
export { defined };

// Re-export flag bits from flags.ts
export {
    CARRY,
    ZERO,
    INTERRUPT,
    DECIMAL,
    BREAK,
    UNUSED,
    OVERFLOW,
    NEGATIVE,
} from "../core/constants.ts";

// Helper functions for the CPU - exported for backward compatibility with tests
export { step6502, readByte, readWord, writeByte, writeWord } from "../core/cpu1.ts";

// Legacy function for backward compatibility
export function createCPU(): CPU {
    const { CPU1 } = require("./cpu1");
    return new CPU1();
}

// Export implementations
export { CPU1 } from "../core/cpu1.ts";
export { CPU2 } from "../core/cpu2.ts";
export { SyncCPU } from "../core/sync-cpu.ts";
