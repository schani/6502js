import { describe, expect, it } from "bun:test";
import { createCPU, CARRY, ZERO, NEGATIVE, INTERRUPT, UNUSED } from "./utils";

describe("6502 CPU", () => {
  it("should initialize with default values", () => {
    const cpu = createCPU();
    expect(cpu.getAccumulator()).toBe(0);
    expect(cpu.getXRegister()).toBe(0);
    expect(cpu.getYRegister()).toBe(0);
    expect(cpu.getStackPointer()).toBe(0xFD); // Initial stack pointer value
    expect(cpu.getStatusRegister()).toBe(0x24);  // Interrupt and unused flag set
    expect(cpu.getProgramCounter()).toBe(0);
    // Since mem is a proxy, we can't expect it to have length, 
    // so let's check that we can read from max address
    expect(cpu.readByte(0xFFFF)).toBe(0);
  });

  it("should properly set status flags", () => {
    const cpu = createCPU();
    
    // Test individual flag setting
    cpu.setStatusRegister(0);
    cpu.setStatusFlag(CARRY);
    expect(cpu.isStatusFlagSet(CARRY)).toBe(true);
    
    cpu.setStatusRegister(0);
    cpu.setStatusFlag(ZERO);
    expect(cpu.isStatusFlagSet(ZERO)).toBe(true);
    
    cpu.setStatusRegister(0);
    cpu.setStatusFlag(NEGATIVE);
    expect(cpu.isStatusFlagSet(NEGATIVE)).toBe(true);
  });
});