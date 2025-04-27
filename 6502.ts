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

// Status register flag bits
export const CARRY = 0x01; // C - Bit 0
export const ZERO = 0x02; // Z - Bit 1
export const INTERRUPT = 0x04; // I - Bit 2
export const DECIMAL = 0x08; // D - Bit 3
export const BREAK = 0x10; // B - Bit 4
export const UNUSED = 0x20; // - - Bit 5 (always 1)
export const OVERFLOW = 0x40; // V - Bit 6
export const NEGATIVE = 0x80; // N - Bit 7

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