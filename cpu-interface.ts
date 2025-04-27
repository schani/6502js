/**
 * Interface for 6502 CPU implementations
 */
export interface CPU {
    /**
     * Get the full CPU state
     */
    getState(): CPUState;
    
    /**
     * Reset CPU to initial state
     */
    reset(): void;
    
    /**
     * Execute a single CPU instruction
     * @param trace Whether to log trace information during execution
     * @returns Number of clock cycles consumed by the instruction
     */
    step(trace?: boolean): number;
    
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
 * Interface for the internal CPU state
 */
export interface CPUState {
    /**
     * Memory (64K)
     */
    mem: Uint8Array;
    
    /**
     * Accumulator
     */
    a: number;
    
    /**
     * X index register
     */
    x: number;
    
    /**
     * Y index register
     */
    y: number;
    
    /**
     * Stack pointer
     */
    sp: number;
    
    /**
     * Status register
     */
    p: number;
    
    /**
     * Program counter
     */
    pc: number;
}

/**
 * Create a new CPU state with default values
 * @returns Initialized CPU state
 */
export function createCPUState(): CPUState {
    return {
        mem: new Uint8Array(65536),
        a: 0,
        x: 0,
        y: 0,
        sp: 0xFD,
        p: 0x24,  // Default status flags - bit 5 always set, bit 2 (Break) set after reset
        pc: 0
    };
}