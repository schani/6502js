/**
 * Common 6502 CPU interface and implementation classes
 */
import { disassemble } from "./disasm";
import { defined } from "@glideapps/ts-necessities";

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

/**
 * CPU State Interface 
 */
export interface CPUState {
    /** 8-bit registers */
    a: number;
    x: number;
    y: number;
    /** Stack pointer, status register, program counter */
    sp: number;
    p: number;
    pc: number;
    /** 64 kB memory buffer */
    mem: Uint8Array;
}

/**
 * CPU Interface
 */
export interface CPU {
    /**
     * Execute a single CPU instruction
     * @param trace Whether to log trace information during execution
     * @returns Number of clock cycles consumed by the instruction
     */
    step(trace?: boolean): number;
    
    /**
     * Get the current CPU state
     * @returns Current CPU state
     */
    getState(): CPUState;
    
    /**
     * Reset the CPU to initial state
     */
    reset(): void;
}

/**
 * Create a new CPU state with default values
 * @returns Initialized CPU state
 */
export function createCPUState(): CPUState {
    return {
        a: 0,
        x: 0,
        y: 0,
        sp: 0xFD,              // Initialize stack pointer (0x01FD)
        p: INTERRUPT | UNUSED, // Status register with interrupt disabled and unused bit set
        pc: 0,
        mem: new Uint8Array(65536) // 64KB memory
    };
}

// Helper functions for the CPU - exported for backward compatibility with tests
export { step6502, readByte, readWord, writeByte, writeWord } from "./cpu1";

// Legacy function for backward compatibility
export function createCPU(): CPUState {
    return createCPUState();
}

// Export implementations
export { CPU1 } from "./cpu1";
export { CPU2 } from "./cpu2";