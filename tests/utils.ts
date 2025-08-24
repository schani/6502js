import {
    CARRY,
    ZERO,
    INTERRUPT,
    DECIMAL,
    BREAK,
    UNUSED,
    OVERFLOW,
    NEGATIVE,
} from "../constants";
import type { CPU } from "../cpu-interface";
import { SyncCPU } from "../sync-cpu";

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

// Helper functions to get individual register values from CPU
export async function getAccumulator(cpu: CPU): Promise<number> {
    const state = await cpu.getState();
    return state.a;
}

export async function getXRegister(cpu: CPU): Promise<number> {
    const state = await cpu.getState();
    return state.x;
}

export async function getYRegister(cpu: CPU): Promise<number> {
    const state = await cpu.getState();
    return state.y;
}

export async function getProgramCounter(cpu: CPU): Promise<number> {
    const state = await cpu.getState();
    return state.pc;
}

export async function getStackPointer(cpu: CPU): Promise<number> {
    const state = await cpu.getState();
    return state.sp;
}

export async function getStatusRegister(cpu: CPU): Promise<number> {
    const state = await cpu.getState();
    return state.p;
}
