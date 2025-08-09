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
  getState(): CPUState {
    return this.cpu1.getState();
  }

  /** Reset both CPUs to initial state */
  reset(): void {
    this.cpu1.reset();
    this.cpu2.reset();
  }

  /** Execute one instruction on both CPUs and verify they match */
  step(trace = false): number {
    // Execute step on both CPUs
    const cycles1 = this.cpu1.step(trace);
    const cycles2 = this.cpu2.step(trace);

    // Compare states (registers and PC/flags)
    this.compareStates();

    // Always return CPU1's cycle count
    return cycles1;
  }

  // Memory accessors
  loadByte(address: number, value: number): void {
    this.cpu1.loadByte(address, value);
    this.cpu2.loadByte(address, value);
  }
  loadWord(address: number, value: number): void {
    this.cpu1.loadWord(address, value);
    this.cpu2.loadWord(address, value);
  }
  readByte(address: number): number {
    return this.cpu1.readByte(address);
  }
  readWord(address: number): number {
    return this.cpu1.readWord(address);
  }

  // Register/mode mutators
  setProgramCounter(address: number): void {
    this.cpu1.setProgramCounter(address);
    this.cpu2.setProgramCounter(address);
  }
  setAccumulator(value: number): void {
    this.cpu1.setAccumulator(value);
    this.cpu2.setAccumulator(value);
  }
  setXRegister(value: number): void {
    this.cpu1.setXRegister(value);
    this.cpu2.setXRegister(value);
  }
  setYRegister(value: number): void {
    this.cpu1.setYRegister(value);
    this.cpu2.setYRegister(value);
  }
  setStackPointer(value: number): void {
    this.cpu1.setStackPointer(value);
    this.cpu2.setStackPointer(value);
  }
  setStatusRegister(value: number): void {
    this.cpu1.setStatusRegister(value);
    this.cpu2.setStatusRegister(value);
  }
  setStatusFlag(mask: number): void {
    this.cpu1.setStatusFlag(mask);
    this.cpu2.setStatusFlag(mask);
  }
  clearStatusFlag(mask: number): void {
    this.cpu1.clearStatusFlag(mask);
    this.cpu2.clearStatusFlag(mask);
  }

  // Legacy getters preserved for tests (not part of CPU interface)
  getProgramCounter(): number { return this.cpu1.getProgramCounter(); }
  getAccumulator(): number { return this.cpu1.getAccumulator(); }
  getXRegister(): number { return this.cpu1.getXRegister(); }
  getYRegister(): number { return this.cpu1.getYRegister(); }
  getStackPointer(): number { return this.cpu1.getStackPointer(); }
  getStatusRegister(): number { return this.cpu1.getStatusRegister(); }
  isStatusFlagSet(mask: number): boolean { return this.cpu1.isStatusFlagSet(mask); }

  // Compare CPU states (registers only)
  private compareStates(): void {
    const s1 = this.cpu1.getState();
    const s2 = this.cpu2.getState();

    if (s1.a !== s2.a) throw new Error(`CPU divergence: A ${s1.a} != ${s2.a}`);
    if (s1.x !== s2.x) throw new Error(`CPU divergence: X ${s1.x} != ${s2.x}`);
    if (s1.y !== s2.y) throw new Error(`CPU divergence: Y ${s1.y} != ${s2.y}`);
    if (s1.sp !== s2.sp) throw new Error(`CPU divergence: SP ${s1.sp} != ${s2.sp}`);
    if (s1.p !== s2.p) throw new Error(`CPU divergence: P ${s1.p} != ${s2.p}`);
    if (s1.pc !== s2.pc) throw new Error(`CPU divergence: PC ${s1.pc} != ${s2.pc}`);
  }
}
