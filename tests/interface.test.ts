import { describe, expect, it } from "bun:test";
import type { CPU } from "../cpu";
import { CPU1, CPU2 } from "../cpu";

describe("CPU Interface Implementation", () => {
  it("should allow CPU1 and CPU2 to be used interchangeably", () => {
    // Test that both CPU implementations satisfy the interface
    const cpu1: CPU = new CPU1();
    const cpu2: CPU = new CPU2();
    
    // Test that both CPUs have the required methods
    expect(typeof cpu1.step).toBe("function");
    expect(typeof cpu1.getState).toBe("function");
    expect(typeof cpu1.reset).toBe("function");
    
    expect(typeof cpu2.step).toBe("function");
    expect(typeof cpu2.getState).toBe("function");
    expect(typeof cpu2.reset).toBe("function");
    
    // Test that both CPUs initialize with the same default state
    const state1 = cpu1.getState();
    const state2 = cpu2.getState();
    
    expect(state1.a).toBe(state2.a);
    expect(state1.x).toBe(state2.x);
    expect(state1.y).toBe(state2.y);
    expect(state1.pc).toBe(state2.pc);
    expect(state1.sp).toBe(state2.sp);
    expect(state1.p).toBe(state2.p);
  });
});