import { describe, expect, it } from "bun:test";
import { CPU2 } from "../cpu2";
import { getAccumulator, getXRegister, getYRegister, getProgramCounter, getStackPointer, getStatusRegister } from "./utils";

describe("CPU2 Implementation", () => {
  it("should perform basic operations", async () => {
    const cpu = new CPU2();
    
    // Initialize memory with simple program
    // LDA #42  (Load 42 into accumulator)
    // TAX      (Transfer A to X)
    // INX      (Increment X)
    // RTS      (Return from subroutine)
    cpu.loadByte(0x1000, 0xA9); // LDA immediate
    cpu.loadByte(0x1001, 0x2A); // #42 (decimal)
    cpu.loadByte(0x1002, 0xAA); // TAX
    cpu.loadByte(0x1003, 0xE8); // INX
    cpu.loadByte(0x1004, 0x60); // RTS
    
    // Set program counter to start of program
    cpu.setProgramCounter(0x1000);
    
    // Step through each instruction
    cpu.step(); // LDA #42
    expect(await getAccumulator(cpu)).toBe(0x2A); // A should be 42
    
    cpu.step(); // TAX
    expect(await getXRegister(cpu)).toBe(0x2A); // X should be 42
    
    cpu.step(); // INX
    expect(await getXRegister(cpu)).toBe(0x2B); // X should be 43
  });
  
  it("should reset the CPU state", async () => {
    const cpu = new CPU2();
    
    // Change some values
    cpu.setAccumulator(0x42);
    cpu.setXRegister(0x84);
    cpu.setProgramCounter(0x1234);
    
    // Reset the CPU
    cpu.reset();
    
    // Verify default values are restored
    expect(await getAccumulator(cpu)).toBe(0);
    expect(await getXRegister(cpu)).toBe(0);
    expect(await getProgramCounter(cpu)).toBe(0);
    expect(await getStackPointer(cpu)).toBe(0xFD);
  });
});