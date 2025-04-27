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
    
    /**
     * Load a byte into memory
     * @param address Memory address
     * @param value Byte value to load
     */
    loadByte(address: number, value: number): void;
    
    /**
     * Load a word (16-bit value) into memory
     * @param address Memory address for low byte
     * @param value 16-bit value to load
     */
    loadWord(address: number, value: number): void;
    
    /**
     * Read a byte from memory
     * @param address Memory address
     * @returns Byte value at address
     */
    readByte(address: number): number;
    
    /**
     * Read a word (16-bit value) from memory
     * @param address Memory address of low byte
     * @returns 16-bit value
     */
    readWord(address: number): number;
    
    /**
     * Set the program counter
     * @param address New program counter value
     */
    setProgramCounter(address: number): void;
    
    /**
     * Set the accumulator register
     * @param value Value to set
     */
    setAccumulator(value: number): void;
    
    /**
     * Set the X index register
     * @param value Value to set
     */
    setXRegister(value: number): void;
    
    /**
     * Set the Y index register
     * @param value Value to set
     */
    setYRegister(value: number): void;
    
    /**
     * Set the stack pointer
     * @param value Value to set
     */
    setStackPointer(value: number): void;
    
    /**
     * Set the status register
     * @param value Value to set
     */
    setStatusRegister(value: number): void;
    
    /**
     * Set status flag bits
     * @param mask Bit mask of flags to set
     */
    setStatusFlag(mask: number): void;
    
    /**
     * Clear status flag bits
     * @param mask Bit mask of flags to clear
     */
    clearStatusFlag(mask: number): void;
    
    /**
     * Get the program counter value
     * @returns Current program counter
     */
    getProgramCounter(): number;
    
    /**
     * Get the accumulator value
     * @returns Current accumulator value
     */
    getAccumulator(): number;
    
    /**
     * Get the X register value
     * @returns Current X register value
     */
    getXRegister(): number;
    
    /**
     * Get the Y register value
     * @returns Current Y register value
     */
    getYRegister(): number;
    
    /**
     * Get the stack pointer value
     * @returns Current stack pointer value
     */
    getStackPointer(): number;
    
    /**
     * Get the status register value
     * @returns Current status register value
     */
    getStatusRegister(): number;
    
    /**
     * Check if a status flag is set
     * @param mask Bit mask to check
     * @returns True if any specified flag is set
     */
    isStatusFlagSet(mask: number): boolean;
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