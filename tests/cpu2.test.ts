import { describe, expect, it } from "bun:test";
import { CPU2 } from "../cpu2";

describe("CPU2 Implementation", () => {
  it("should perform basic operations", () => {
    const cpu = new CPU2();
    const state = cpu.getState();
    
    // Initialize memory with simple program
    // LDA #42  (Load 42 into accumulator)
    // TAX      (Transfer A to X)
    // INX      (Increment X)
    // RTS      (Return from subroutine)
    state.mem[0x1000] = 0xA9; // LDA immediate
    state.mem[0x1001] = 0x2A; // #42 (decimal)
    state.mem[0x1002] = 0xAA; // TAX
    state.mem[0x1003] = 0xE8; // INX
    state.mem[0x1004] = 0x60; // RTS
    
    // Set program counter to start of program
    state.pc = 0x1000;
    
    // Step through each instruction
    cpu.step(); // LDA #42
    expect(state.a).toBe(0x2A); // A should be 42
    
    cpu.step(); // TAX
    expect(state.x).toBe(0x2A); // X should be 42
    
    cpu.step(); // INX
    expect(state.x).toBe(0x2B); // X should be 43
  });
  
  it("should reset the CPU state", () => {
    const cpu = new CPU2();
    const state = cpu.getState();
    
    // Change some values
    state.a = 0x42;
    state.x = 0x84;
    state.pc = 0x1234;
    
    // Reset the CPU
    cpu.reset();
    const newState = cpu.getState();
    
    // Verify default values are restored
    expect(newState.a).toBe(0);
    expect(newState.x).toBe(0);
    expect(newState.pc).toBe(0);
    expect(newState.sp).toBe(0xFD);
  });
});