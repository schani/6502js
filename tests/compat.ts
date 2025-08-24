/**
 * Compatibility layer for tests that expect direct access to CPU state
 * This allows us to gradually transition tests to use the CPU interface
 */

import type { CPU, CPUState } from "../cpu-interface";

/**
 * Creates a proxy object that wraps a CPU instance to allow direct property access
 * This is used for backward compatibility with tests that access CPU state directly
 */
export function createCompatWrapper(cpu: CPU): any {
    return new Proxy(cpu, {
        get(target, prop) {
            // Handle accessing properties that existed in the old CPU state
            if (prop === "a") {
                return target.getState().then((state: CPUState) => state.a);
            }
            if (prop === "x") {
                return target.getState().then((state: CPUState) => state.x);
            }
            if (prop === "y") {
                return target.getState().then((state: CPUState) => state.y);
            }
            if (prop === "pc") {
                return target.getState().then((state: CPUState) => state.pc);
            }
            if (prop === "sp") {
                return target.getState().then((state: CPUState) => state.sp);
            }
            if (prop === "p") {
                return target.getState().then((state: CPUState) => state.p);
            }
            if (prop === "mem") {
                // Return a proxy array that translates array access to CPU.readByte/loadByte
                return new Proxy([], {
                    get(_, index) {
                        if (typeof index === "string" && /^\d+$/.test(index)) {
                            return target.readByte(parseInt(index, 10));
                        }
                        return undefined;
                    },
                    set(_, index, value) {
                        if (typeof index === "string" && /^\d+$/.test(index)) {
                            target.loadByte(parseInt(index, 10), value);
                            return true;
                        }
                        return false;
                    },
                });
            }

            // Forward all other property accesses to the CPU instance
            return (target as any)[prop];
        },
        set(target, prop, value) {
            // Handle setting properties that existed in the old CPU state
            if (prop === "a") {
                target.setAccumulator(value);
                return true;
            }
            if (prop === "x") {
                target.setXRegister(value);
                return true;
            }
            if (prop === "y") {
                target.setYRegister(value);
                return true;
            }
            if (prop === "pc") {
                target.setProgramCounter(value);
                return true;
            }
            if (prop === "sp") {
                target.setStackPointer(value);
                return true;
            }
            if (prop === "p") {
                target.setStatusRegister(value);
                return true;
            }

            // Forward all other property sets to the CPU instance
            (target as any)[prop] = value;
            return true;
        },
    });
}
