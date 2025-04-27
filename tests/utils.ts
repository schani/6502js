import {
    type CPU,
    CARRY,
    ZERO,
    INTERRUPT,
    DECIMAL,
    BREAK,
    UNUSED,
    OVERFLOW,
    NEGATIVE,
    CPU1,
} from "../6502";

/**
 * Create a CPU instance with default values for testing.
 * This returns a CPU that implements the CPU interface.
 */
export function createCPU(): CPU {
    return new CPU1();
}

// Export everything needed for tests
export { CARRY, ZERO, INTERRUPT, DECIMAL, BREAK, UNUSED, OVERFLOW, NEGATIVE };

// Export CPU type for tests
export type { CPU };
