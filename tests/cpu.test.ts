import { describe, expect, it } from "bun:test";
import { createCPU, CARRY, ZERO, NEGATIVE, INTERRUPT, UNUSED } from "./utils";

describe("6502 CPU", () => {
  it("should initialize with default values", async () => {
    const cpu = createCPU();
    expect(cpu.getAccumulator()).toBe(0);
    expect(cpu.getXRegister()).toBe(0);
    expect(cpu.getYRegister()).toBe(0);
    expect(cpu.getStackPointer()).toBe(0xFD); // Initial stack pointer value
    expect(cpu.getStatusRegister()).toBe(0x24);  // Interrupt and unused flag set
    expect(cpu.getProgramCounter()).toBe(0);
    // Since mem is a proxy, we can't expect it to have length, 
    // so let's check that we can read from max address
    expect(await cpu.readByte(0xFFFF)).toBe(0);
  });

  it("should properly set status flags", async () => {
    const cpu = createCPU();
    
    // Test individual flag setting
    await cpu.setStatusRegister(0);
    await cpu.setStatusFlag(CARRY);
    expect((cpu.getStatusRegister() & CARRY) !== 0).toBe(true);
    
    await cpu.setStatusRegister(0);
    await cpu.setStatusFlag(ZERO);
    expect((cpu.getStatusRegister() & ZERO) !== 0).toBe(true);
    
    await cpu.setStatusRegister(0);
    await cpu.setStatusFlag(NEGATIVE);
    expect((cpu.getStatusRegister() & NEGATIVE) !== 0).toBe(true);
  });
});