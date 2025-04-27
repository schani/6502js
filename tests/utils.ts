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
    SyncCPU,
} from "../6502";

/**
 * Create a CPU instance with default values for testing.
 * This returns a CPU that implements the CPU interface.
 * 
 * Currently using CPU1 for testing to maintain compatibility.
 * Once CPU1 and CPU2 are fully compatible, we can switch to SyncCPU.
 */
export function createCPU(): CPU {
    // Using SyncCPU to test both implementations simultaneously
    return new SyncCPU();
}

// Export everything needed for tests
export { CARRY, ZERO, INTERRUPT, DECIMAL, BREAK, UNUSED, OVERFLOW, NEGATIVE };

// Export CPU type for tests
export type { CPU };
