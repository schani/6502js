/**
 * Common 6502 CPU implementation classes
 */
import { disassemble } from "./disasm";
import { defined } from "@glideapps/ts-necessities";
import type { CPU, CPUState } from "./cpu-interface";
import { createCPUState } from "./cpu-interface";

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
} from "./constants";

// Helper functions for the CPU - exported for backward compatibility with tests
export { step6502, readByte, readWord, writeByte, writeWord } from "./cpu1";

// Legacy function for backward compatibility
export function createCPU(): CPU {
    const { CPU1 } = require("./cpu1");
    return new CPU1();
}

// Export implementations
export { CPU1 } from "./cpu1";
export { CPU2 } from "./cpu2";
export { SyncCPU } from "./sync-cpu";
