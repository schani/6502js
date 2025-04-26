import { describe, expect, it } from "bun:test";
import { createCPU, CARRY, ZERO, NEGATIVE, INTERRUPT, UNUSED } from "./utils";

describe("6502 CPU", () => {
  it("should initialize with default values", () => {
    const cpu = createCPU();
    expect(cpu.a).toBe(0);
    expect(cpu.x).toBe(0);
    expect(cpu.y).toBe(0);
    expect(cpu.sp).toBe(0xFD); // Initial stack pointer value
    expect(cpu.p).toBe(0x24);  // Interrupt and unused flag set
    expect(cpu.pc).toBe(0);
    expect(cpu.mem.length).toBe(65536); // 64KB memory
  });

  it("should properly set status flags", () => {
    const cpu = createCPU();
    
    // Test individual flag setting
    cpu.p = 0;
    cpu.p |= CARRY;
    expect(cpu.p & CARRY).toBe(CARRY);
    
    cpu.p = 0;
    cpu.p |= ZERO;
    expect(cpu.p & ZERO).toBe(ZERO);
    
    cpu.p = 0;
    cpu.p |= NEGATIVE;
    expect(cpu.p & NEGATIVE).toBe(NEGATIVE);
  });
});