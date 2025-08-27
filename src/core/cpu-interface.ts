/**
 * Interface for 6502 CPU implementations
 */
export interface CPU {
    /**
     * Get the full CPU state (registers and PC; memory is external)
     */
    getState(): Promise<CPUState>;
    
    /** Reset CPU to initial state */
    reset(): Promise<void>;
    
    /** Execute a single instruction */
    step(trace?: boolean): Promise<number>;
    
    /** Memory accessors (operate on external memory supplied at construction) */
    loadByte(address: number, value: number): Promise<void>;
    loadWord(address: number, value: number): Promise<void>;
    readByte(address: number): Promise<number>;
    readWord(address: number): Promise<number>;
    
    /** Register/mode mutators */
    setProgramCounter(address: number): Promise<void>;
    setAccumulator(value: number): Promise<void>;
    setXRegister(value: number): Promise<void>;
    setYRegister(value: number): Promise<void>;
    setStackPointer(value: number): Promise<void>;
    setStatusRegister(value: number): Promise<void>;
    setStatusFlag(mask: number): Promise<void>;
    clearStatusFlag(mask: number): Promise<void>;

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
