import type { CPU, CPUState } from "./cpu-interface.ts";
import { CPU1 } from "./cpu1.ts";
import { CPU2 } from "./cpu2.ts";
import { PGCPU } from "./pgcpu.ts";

/**
 * CPU implementation that maintains three underlying CPU implementations (CPU1, CPU2, and PGCPU),
 * keeping them in sync and checking for state differences after each step
 */
export class SyncCPU implements CPU {
    private cpu1: CPU1;
    private cpu2: CPU2;
    private pgcpu: PGCPU;

    constructor() {
        this.cpu1 = new CPU1();
        this.cpu2 = new CPU2();
        this.pgcpu = new PGCPU();
    }

    /** Get the current CPU state (from CPU1) */
    async getState(): Promise<CPUState> {
        return this.cpu1.getState();
    }

    /** Reset all three CPUs to initial state */
    async reset(): Promise<void> {
        await this.cpu1.reset();
        await this.cpu2.reset();
        await this.pgcpu.reset();
    }

    /** Execute one instruction on all three CPUs and verify they match */
    async step(trace = false): Promise<void> {
        await this.cpu1.step(trace);
        await this.cpu2.step(false);
        await this.pgcpu.step(false);
        await this.compareStates();
        return;
    }

    // Memory accessors
    async loadByte(address: number, value: number): Promise<void> {
        await this.cpu1.loadByte(address, value);
        await this.cpu2.loadByte(address, value);
        await this.pgcpu.loadByte(address, value);
    }
    async loadWord(address: number, value: number): Promise<void> {
        await this.cpu1.loadWord(address, value);
        await this.cpu2.loadWord(address, value);
        await this.pgcpu.loadWord(address, value);
    }
    async readByte(address: number): Promise<number> {
        return this.cpu1.readByte(address);
    }
    async readWord(address: number): Promise<number> {
        return this.cpu1.readWord(address);
    }

    // Register/mode mutators
    async setProgramCounter(address: number): Promise<void> {
        await this.cpu1.setProgramCounter(address);
        await this.cpu2.setProgramCounter(address);
        await this.pgcpu.setProgramCounter(address);
    }
    async setAccumulator(value: number): Promise<void> {
        await this.cpu1.setAccumulator(value);
        await this.cpu2.setAccumulator(value);
        await this.pgcpu.setAccumulator(value);
    }
    async setXRegister(value: number): Promise<void> {
        await this.cpu1.setXRegister(value);
        await this.cpu2.setXRegister(value);
        await this.pgcpu.setXRegister(value);
    }
    async setYRegister(value: number): Promise<void> {
        await this.cpu1.setYRegister(value);
        await this.cpu2.setYRegister(value);
        await this.pgcpu.setYRegister(value);
    }
    async setStackPointer(value: number): Promise<void> {
        await this.cpu1.setStackPointer(value);
        await this.cpu2.setStackPointer(value);
        await this.pgcpu.setStackPointer(value);
    }
    async setStatusRegister(value: number): Promise<void> {
        await this.cpu1.setStatusRegister(value);
        await this.cpu2.setStatusRegister(value);
        await this.pgcpu.setStatusRegister(value);
    }
    async setStatusFlag(mask: number): Promise<void> {
        await this.cpu1.setStatusFlag(mask);
        await this.cpu2.setStatusFlag(mask);
        await this.pgcpu.setStatusFlag(mask);
    }
    async clearStatusFlag(mask: number): Promise<void> {
        await this.cpu1.clearStatusFlag(mask);
        await this.cpu2.clearStatusFlag(mask);
        await this.pgcpu.clearStatusFlag(mask);
    }

    // Legacy getters preserved for tests (not part of CPU interface)
    getProgramCounter(): number {
        return this.cpu1.getProgramCounter();
    }
    getAccumulator(): number {
        return this.cpu1.getAccumulator();
    }
    getXRegister(): number {
        return this.cpu1.getXRegister();
    }
    getYRegister(): number {
        return this.cpu1.getYRegister();
    }
    getStackPointer(): number {
        return this.cpu1.getStackPointer();
    }
    getStatusRegister(): number {
        return this.cpu1.getStatusRegister();
    }

    // Compare CPU states (registers only) across all three CPUs
    private async compareStates(): Promise<void> {
        const s1 = await this.cpu1.getState();
        const s2 = await this.cpu2.getState();
        const s3 = await this.pgcpu.getState();
        
        // Compare CPU1 and CPU2
        if (s1.a !== s2.a)
            throw new Error(`CPU1/CPU2 divergence: A ${s1.a} != ${s2.a}`);
        if (s1.x !== s2.x)
            throw new Error(`CPU1/CPU2 divergence: X ${s1.x} != ${s2.x}`);
        if (s1.y !== s2.y)
            throw new Error(`CPU1/CPU2 divergence: Y ${s1.y} != ${s2.y}`);
        if (s1.sp !== s2.sp)
            throw new Error(`CPU1/CPU2 divergence: SP ${s1.sp} != ${s2.sp}`);
        if (s1.p !== s2.p)
            throw new Error(`CPU1/CPU2 divergence: P ${s1.p} != ${s2.p}`);
        if (s1.pc !== s2.pc)
            throw new Error(`CPU1/CPU2 divergence: PC ${s1.pc} != ${s2.pc}`);
            
        // Compare CPU1 and PGCPU
        if (s1.a !== s3.a)
            throw new Error(`CPU1/PGCPU divergence: A ${s1.a} != ${s3.a}`);
        if (s1.x !== s3.x)
            throw new Error(`CPU1/PGCPU divergence: X ${s1.x} != ${s3.x}`);
        if (s1.y !== s3.y)
            throw new Error(`CPU1/PGCPU divergence: Y ${s1.y} != ${s3.y}`);
        if (s1.sp !== s3.sp)
            throw new Error(`CPU1/PGCPU divergence: SP ${s1.sp} != ${s3.sp}`);
        if (s1.p !== s3.p)
            throw new Error(`CPU1/PGCPU divergence: P ${s1.p} != ${s3.p}`);
        if (s1.pc !== s3.pc)
            throw new Error(`CPU1/PGCPU divergence: PC ${s1.pc} != ${s3.pc}`);
    }
}
