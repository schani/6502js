/**
 * Interface for 6502 CPU implementations
 */
export interface CPU {
    /**
     * Get the full CPU state (registers and PC; memory is external)
     */
    getState(): CPUState;
    
    /** Reset CPU to initial state */
    reset(): void;
    
    /** Execute a single instruction */
    step(trace?: boolean): number;
    
    /** Memory accessors (operate on external memory supplied at construction) */
    loadByte(address: number, value: number): void;
    loadWord(address: number, value: number): void;
    readByte(address: number): number;
    readWord(address: number): number;
    
    /** Register/mode mutators */
    setProgramCounter(address: number): void;
    setAccumulator(value: number): void;
    setXRegister(value: number): void;
    setYRegister(value: number): void;
    setStackPointer(value: number): void;
    setStatusRegister(value: number): void;
    setStatusFlag(mask: number): void;
    clearStatusFlag(mask: number): void;

}

/**
 * Interface for the internal CPU state
 */
export interface CPUState {
    /** Accumulator */
    a: number;
    /** X index register */
    x: number;
    /** Y index register */
    y: number;
    /** Stack pointer */
    sp: number;
    /** Status register */
    p: number;
    /** Program counter */
    pc: number;
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
        sp: 0xFD,
        p: 0x24,  // Default status flags - bit 5 always set, bit 2 (Break) set after reset
        pc: 0
    };
}
