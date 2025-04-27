import { createCompatWrapper } from "./compat";
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
 * This returns a CPU that implements the CPU interface but also
 * allows direct access to registers and memory for backwards compatibility.
 */
export function createCPU(): any {
    const cpu = new CPU1();
    return createCompatWrapper(cpu);
}

/**
 * @deprecated Use CPU.step() directly from the CPU interface
 * For backward compatibility, will be removed after refactoring
 */
export function step6502(cpu: any, trace = false): number {
    return cpu.step(trace);
}

// Export everything needed for tests
export { CARRY, ZERO, INTERRUPT, DECIMAL, BREAK, UNUSED, OVERFLOW, NEGATIVE };

// Export CPU type for tests
export type { CPU };
