// Export everything from the 6502.ts file for test purposes
import type { CPUState } from "../6502";
import { 
    createCPU, 
    step6502, 
    CARRY, 
    ZERO, 
    INTERRUPT, 
    DECIMAL, 
    BREAK, 
    UNUSED, 
    OVERFLOW, 
    NEGATIVE,
    defined
} from "../6502";

// Export everything needed for tests
export { 
    CARRY, 
    ZERO, 
    INTERRUPT, 
    DECIMAL, 
    BREAK, 
    UNUSED, 
    OVERFLOW, 
    NEGATIVE,
    step6502,
    createCPU,
    defined
};

// Export CPU type for tests (backwards compatibility - tests expect "CPU" type)
export type CPU = CPUState;