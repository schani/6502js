/**
 * Barrel file that exports all CPU implementations
 */

// Export the CPU interface and types
export * from "../utils/6502.ts";

// Export the CPU implementations
export { CPU1 } from "./cpu1.ts";
export { CPU2 } from "./cpu2.ts";

// Export helper functions for backward compatibility with tests
export { 
    step6502, 
    readByte, 
    readWord, 
    writeByte, 
    writeWord 
} from "./cpu1.ts";

/**
 * Create a CPU state (for backward compatibility with tests)
 */
export function createCPU() {
    return {
        a: 0,
        x: 0,
        y: 0,
        sp: 0xfd,
        p: 0x24,
        pc: 0,
        mem: new Uint8Array(65536)
    };
}