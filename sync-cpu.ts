import type { CPU, CPUState } from "./cpu-interface";
import { CPU1 } from "./cpu1";
import { CPU2 } from "./cpu2";

/**
 * CPU implementation that maintains two underlying CPU implementations (CPU1 and CPU2),
 * keeping them in sync and checking for state differences after each step
 */
export class SyncCPU implements CPU {
    private cpu1: CPU1;
    private cpu2: CPU2;

    constructor() {
        this.cpu1 = new CPU1();
        this.cpu2 = new CPU2();
    }

    /**
     * Get the current CPU state (from CPU1)
     */
    getState(): CPUState {
        return this.cpu1.getState();
    }

    /**
     * Reset both CPUs to initial state
     */
    reset(): void {
        this.cpu1.reset();
        this.cpu2.reset();
    }

    /**
     * Execute a single CPU instruction on both CPUs and verify they match
     * @param trace Whether to log trace information during execution
     * @returns Number of clock cycles consumed by the instruction
     * @throws Error if the CPUs diverge in state
     */
    step(trace = false): number {
        // Get the current opcode before execution for diagnostics
        const currentPC = this.getProgramCounter();
        const opcode = this.readByte(currentPC);

        // Execute step on both CPUs
        const cycles1 = this.cpu1.step(trace);
        const cycles2 = this.cpu2.step(trace);

        // Compare cycles
        // if (cycles1 !== cycles2 && !isKnownDifferentCycleOpcode) {
        //     console.warn(
        //         `CPUs returned different cycle counts: CPU1=${cycles1}, CPU2=${cycles2}`,
        //     );
        // }

        // This will throw an error if the states are not equal
        this.compareStates();

        // Always return CPU1's cycle count for consistency
        return cycles1;
    }

    /**
     * Load a byte into memory of both CPUs
     * @param address Memory address
     * @param value Byte value to load
     */
    loadByte(address: number, value: number): void {
        this.cpu1.loadByte(address, value);
        this.cpu2.loadByte(address, value);
    }

    /**
     * Load a word (16-bit value) into memory of both CPUs
     * @param address Memory address for low byte
     * @param value 16-bit value to load
     */
    loadWord(address: number, value: number): void {
        this.cpu1.loadWord(address, value);
        this.cpu2.loadWord(address, value);
    }

    /**
     * Read a byte from memory (from CPU1)
     * @param address Memory address
     * @returns Byte value at address
     */
    readByte(address: number): number {
        return this.cpu1.readByte(address);
    }

    /**
     * Read a word (16-bit value) from memory (from CPU1)
     * @param address Memory address of low byte
     * @returns 16-bit value
     */
    readWord(address: number): number {
        return this.cpu1.readWord(address);
    }

    /**
     * Set the program counter on both CPUs
     * @param address New program counter value
     */
    setProgramCounter(address: number): void {
        this.cpu1.setProgramCounter(address);
        this.cpu2.setProgramCounter(address);
    }

    /**
     * Set the accumulator register on both CPUs
     * @param value Value to set
     */
    setAccumulator(value: number): void {
        this.cpu1.setAccumulator(value);
        this.cpu2.setAccumulator(value);
    }

    /**
     * Set the X index register on both CPUs
     * @param value Value to set
     */
    setXRegister(value: number): void {
        this.cpu1.setXRegister(value);
        this.cpu2.setXRegister(value);
    }

    /**
     * Set the Y index register on both CPUs
     * @param value Value to set
     */
    setYRegister(value: number): void {
        this.cpu1.setYRegister(value);
        this.cpu2.setYRegister(value);
    }

    /**
     * Set the stack pointer on both CPUs
     * @param value Value to set
     */
    setStackPointer(value: number): void {
        this.cpu1.setStackPointer(value);
        this.cpu2.setStackPointer(value);
    }

    /**
     * Set the status register on both CPUs
     * @param value Value to set
     */
    setStatusRegister(value: number): void {
        this.cpu1.setStatusRegister(value);
        this.cpu2.setStatusRegister(value);
    }

    /**
     * Set status flag bits on both CPUs
     * @param mask Bit mask of flags to set
     */
    setStatusFlag(mask: number): void {
        this.cpu1.setStatusFlag(mask);
        this.cpu2.setStatusFlag(mask);
    }

    /**
     * Clear status flag bits on both CPUs
     * @param mask Bit mask of flags to clear
     */
    clearStatusFlag(mask: number): void {
        this.cpu1.clearStatusFlag(mask);
        this.cpu2.clearStatusFlag(mask);
    }

    /**
     * Get the program counter value (from CPU1)
     * @returns Current program counter
     */
    getProgramCounter(): number {
        return this.cpu1.getProgramCounter();
    }

    /**
     * Get the accumulator value (from CPU1)
     * @returns Current accumulator value
     */
    getAccumulator(): number {
        return this.cpu1.getAccumulator();
    }

    /**
     * Get the X register value (from CPU1)
     * @returns Current X register value
     */
    getXRegister(): number {
        return this.cpu1.getXRegister();
    }

    /**
     * Get the Y register value (from CPU1)
     * @returns Current Y register value
     */
    getYRegister(): number {
        return this.cpu1.getYRegister();
    }

    /**
     * Get the stack pointer value (from CPU1)
     * @returns Current stack pointer value
     */
    getStackPointer(): number {
        return this.cpu1.getStackPointer();
    }

    /**
     * Get the status register value (from CPU1)
     * @returns Current status register value
     */
    getStatusRegister(): number {
        return this.cpu1.getStatusRegister();
    }

    /**
     * Check if a status flag is set (from CPU1)
     * @param mask Bit mask to check
     * @returns True if any specified flag is set
     */
    isStatusFlagSet(mask: number): boolean {
        return this.cpu1.isStatusFlagSet(mask);
    }

    /**
     * Compare the states of both CPUs and throw an error if they differ
     * @private
     */
    private compareStates(): void {
        const state1 = this.cpu1.getState();
        const state2 = this.cpu2.getState();

        // Compare register values
        if (state1.a !== state2.a) {
            throw new Error(
                `CPU state divergence: Accumulator (CPU1=0x${state1.a.toString(16)}, CPU2=0x${state2.a.toString(16)})`,
            );
        }

        if (state1.x !== state2.x) {
            throw new Error(
                `CPU state divergence: X register (CPU1=0x${state1.x.toString(16)}, CPU2=0x${state2.x.toString(16)})`,
            );
        }

        if (state1.y !== state2.y) {
            throw new Error(
                `CPU state divergence: Y register (CPU1=0x${state1.y.toString(16)}, CPU2=0x${state2.y.toString(16)})`,
            );
        }

        if (state1.sp !== state2.sp) {
            throw new Error(
                `CPU state divergence: Stack pointer (CPU1=0x${state1.sp.toString(16)}, CPU2=0x${state2.sp.toString(16)})`,
            );
        }

        if (state1.p !== state2.p) {
            throw new Error(
                `CPU state divergence: Status register (CPU1=0x${state1.p.toString(16)}, CPU2=0x${state2.p.toString(16)})`,
            );
        }

        if (state1.pc !== state2.pc) {
            throw new Error(
                `CPU state divergence: Program counter (CPU1=0x${state1.pc.toString(16)}, CPU2=0x${state2.pc.toString(16)})`,
            );
        }

        // Compare memory, with some exceptions for known differences
        // This is a sparse comparison - we don't check every byte, just the ones that have been modified
        const mem1 = state1.mem;
        const mem2 = state2.mem;

        // List to collect differences for better reporting
        const memDiffs: {
            address: number;
            cpu1: number | undefined;
            cpu2: number | undefined;
        }[] = [];

        for (let i = 0; i < mem1.length; i++) {
            if (mem1[i] !== mem2[i]) {
                memDiffs.push({ address: i, cpu1: mem1[i], cpu2: mem2[i] });

                // If we find too many differences, break to avoid overwhelming the error message
                if (memDiffs.length > 5) {
                    break;
                }
            }
        }

        if (memDiffs.length > 0) {
            const diffDetails = memDiffs
                .map((diff) => {
                    const cpu1Hex =
                        diff.cpu1 !== undefined
                            ? diff.cpu1.toString(16).padStart(2, "0")
                            : "??";
                    const cpu2Hex =
                        diff.cpu2 !== undefined
                            ? diff.cpu2.toString(16).padStart(2, "0")
                            : "??";
                    return `0x${diff.address.toString(16).padStart(4, "0")}: CPU1=0x${cpu1Hex}, CPU2=0x${cpu2Hex}`;
                })
                .join("\n  ");

            throw new Error(
                `CPU state divergence: Memory differences found:\n  ${diffDetails}\n\nCheck 6502 specification for correct behavior.`,
            );
        }
    }
}
