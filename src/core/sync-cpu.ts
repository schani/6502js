import type { CPU, CPUState } from "./cpu-interface.ts";
import { CPU1 } from "./cpu1.ts";
import { CPU2 } from "./cpu2.ts";
import { PGCPU } from "./pgcpu.ts";

const REGISTERS = ["a", "x", "y", "sp", "p", "pc"] as const;

/**
 * CPU implementation that maintains three underlying CPU implementations (CPU1, CPU2, and PGCPU),
 * keeping them in sync and checking for state differences after each step
 */
export class SyncCPU implements CPU {
    private cpu1: CPU1;
    /** The other CPUs, each compared against CPU1 after every step */
    private others: { name: string; cpu: CPU }[];
    /** All CPUs, for fanning out writes and mutations */
    private all: CPU[];

    constructor() {
        this.cpu1 = new CPU1();
        this.others = [
            { name: "CPU2", cpu: new CPU2() },
            { name: "PGCPU", cpu: new PGCPU() },
        ];
        this.all = [this.cpu1, ...this.others.map((o) => o.cpu)];
    }

    /** Get the current CPU state (from CPU1) */
    async getState(): Promise<CPUState> {
        return this.cpu1.getState();
    }

    /** Reset all CPUs to initial state */
    async reset(): Promise<void> {
        for (const cpu of this.all) await cpu.reset();
    }

    /** Execute one instruction on all CPUs and verify they match */
    async step(trace = false): Promise<void> {
        await this.cpu1.step(trace);
        for (const { cpu } of this.others) await cpu.step(false);
        await this.compareStates();
    }

    // Memory accessors (reads are served from CPU1)
    async loadByte(address: number, value: number): Promise<void> {
        for (const cpu of this.all) await cpu.loadByte(address, value);
    }
    async loadWord(address: number, value: number): Promise<void> {
        for (const cpu of this.all) await cpu.loadWord(address, value);
    }
    async readByte(address: number): Promise<number> {
        return this.cpu1.readByte(address);
    }
    async readWord(address: number): Promise<number> {
        return this.cpu1.readWord(address);
    }

    // Register/mode mutators, fanned out to all CPUs
    async setProgramCounter(address: number): Promise<void> {
        for (const cpu of this.all) await cpu.setProgramCounter(address);
    }
    async setAccumulator(value: number): Promise<void> {
        for (const cpu of this.all) await cpu.setAccumulator(value);
    }
    async setXRegister(value: number): Promise<void> {
        for (const cpu of this.all) await cpu.setXRegister(value);
    }
    async setYRegister(value: number): Promise<void> {
        for (const cpu of this.all) await cpu.setYRegister(value);
    }
    async setStackPointer(value: number): Promise<void> {
        for (const cpu of this.all) await cpu.setStackPointer(value);
    }
    async setStatusRegister(value: number): Promise<void> {
        for (const cpu of this.all) await cpu.setStatusRegister(value);
    }
    async setStatusFlag(mask: number): Promise<void> {
        for (const cpu of this.all) await cpu.setStatusFlag(mask);
    }
    async clearStatusFlag(mask: number): Promise<void> {
        for (const cpu of this.all) await cpu.clearStatusFlag(mask);
    }

    // Compare register state of every CPU against CPU1
    private async compareStates(): Promise<void> {
        const s1 = await this.cpu1.getState();
        for (const { name, cpu } of this.others) {
            const s = await cpu.getState();
            for (const reg of REGISTERS) {
                if (s1[reg] !== s[reg])
                    throw new Error(
                        `CPU1/${name} divergence: ${reg.toUpperCase()} ${s1[reg]} != ${s[reg]}`,
                    );
            }
        }
    }
}
