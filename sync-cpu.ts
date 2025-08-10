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

  /** Get the current CPU state (from CPU1) */
  async getState(): Promise<CPUState> {
    return this.cpu1.getState();
  }

  /** Reset both CPUs to initial state */
  async reset(): Promise<void> {
    await this.cpu1.reset();
    await this.cpu2.reset();
  }

  /** Execute one instruction on both CPUs and verify they match */
  async step(trace = false): Promise<number> {
    const cycles1 = await this.cpu1.step(trace);
    await this.cpu2.step(trace);
    await this.compareStates();
    return cycles1;
  }

  // Memory accessors
  async loadByte(address: number, value: number): Promise<void> {
    await this.cpu1.loadByte(address, value);
    await this.cpu2.loadByte(address, value);
  }
  async loadWord(address: number, value: number): Promise<void> {
    await this.cpu1.loadWord(address, value);
    await this.cpu2.loadWord(address, value);
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
  }
  async setAccumulator(value: number): Promise<void> {
    await this.cpu1.setAccumulator(value);
    await this.cpu2.setAccumulator(value);
  }
  async setXRegister(value: number): Promise<void> {
    await this.cpu1.setXRegister(value);
    await this.cpu2.setXRegister(value);
  }
  async setYRegister(value: number): Promise<void> {
    await this.cpu1.setYRegister(value);
    await this.cpu2.setYRegister(value);
  }
  async setStackPointer(value: number): Promise<void> {
    await this.cpu1.setStackPointer(value);
    await this.cpu2.setStackPointer(value);
  }
  async setStatusRegister(value: number): Promise<void> {
    await this.cpu1.setStatusRegister(value);
    await this.cpu2.setStatusRegister(value);
  }
  async setStatusFlag(mask: number): Promise<void> {
    await this.cpu1.setStatusFlag(mask);
    await this.cpu2.setStatusFlag(mask);
  }
  async clearStatusFlag(mask: number): Promise<void> {
    await this.cpu1.clearStatusFlag(mask);
    await this.cpu2.clearStatusFlag(mask);
  }

  // Legacy getters preserved for tests (not part of CPU interface)
  getProgramCounter(): number { return this.cpu1.getProgramCounter(); }
  getAccumulator(): number { return this.cpu1.getAccumulator(); }
  getXRegister(): number { return this.cpu1.getXRegister(); }
  getYRegister(): number { return this.cpu1.getYRegister(); }
  getStackPointer(): number { return this.cpu1.getStackPointer(); }
  getStatusRegister(): number { return this.cpu1.getStatusRegister(); }

  // Compare CPU states (registers only)
  private async compareStates(): Promise<void> {
    const s1 = await this.cpu1.getState();
    const s2 = await this.cpu2.getState();
    if (s1.a !== s2.a) throw new Error(`CPU divergence: A ${s1.a} != ${s2.a}`);
    if (s1.x !== s2.x) throw new Error(`CPU divergence: X ${s1.x} != ${s2.x}`);
    if (s1.y !== s2.y) throw new Error(`CPU divergence: Y ${s1.y} != ${s2.y}`);
    if (s1.sp !== s2.sp) throw new Error(`CPU divergence: SP ${s1.sp} != ${s2.sp}`);
    if (s1.p !== s2.p) throw new Error(`CPU divergence: P ${s1.p} != ${s2.p}`);
    if (s1.pc !== s2.pc) throw new Error(`CPU divergence: PC ${s1.pc} != ${s2.pc}`);
  }
}
