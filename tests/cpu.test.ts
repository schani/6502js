import { describe, expect, it } from "bun:test";
import { getAccumulator, getXRegister, getYRegister, getProgramCounter, getStackPointer, getStatusRegister, createCPU, CARRY, ZERO, NEGATIVE, INTERRUPT, UNUSED } from "./utils";
describe("6502 CPU", () => {
  it("should initialize with default values", async () => {
    const cpu = createCPU();
    expect(await getAccumulator(cpu)).toBe(0);
    expect(await getXRegister(cpu)).toBe(0);
    expect(await getYRegister(cpu)).toBe(0);
    expect(await getStackPointer(cpu)).toBe(0xFD); // Initial stack pointer value
    expect(await getStatusRegister(cpu)).toBe(0x24);  // Interrupt and unused flag set
    expect(await getProgramCounter(cpu)).toBe(0);
    // Since mem is a proxy, we can't expect it to have length, 
    // so let's check that we can read from max address
    expect(await cpu.readByte(0xFFFF)).toBe(0);
  });

  it("should properly set status flags", async () => {
    const cpu = createCPU();
    
    // Test individual flag setting
    await cpu.setStatusRegister(0);
    await cpu.setStatusFlag(CARRY);
    expect((await getStatusRegister(cpu) & CARRY) !== 0).toBe(true);
    
    await cpu.setStatusRegister(0);
    await cpu.setStatusFlag(ZERO);
    expect((await getStatusRegister(cpu) & ZERO) !== 0).toBe(true);
    
    await cpu.setStatusRegister(0);
    await cpu.setStatusFlag(NEGATIVE);
    expect((await getStatusRegister(cpu) & NEGATIVE) !== 0).toBe(true);
  });
});