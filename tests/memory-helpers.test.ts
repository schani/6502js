import { describe, expect, it } from "bun:test";
import { createCPU } from "./utils";

describe("Memory helper functions", () => {
  it("should handle edge cases in readByte and writeByte", async () => {
    const cpu = createCPU();
    
    // Force a memory access at address 0xFFFF to test boundary conditions
    await cpu.loadByte(0xFFFF, 0x42);
    
    // Set up a program that reads from 0xFFFF
    await cpu.loadByte(0, 0xAD); // LDA Absolute
    await cpu.loadByte(1, 0xFF); // Low byte of address
    await cpu.loadByte(2, 0xFF); // High byte of address (0xFFFF)
    
    await cpu.setProgramCounter(0);
    
    // Execute LDA Absolute to read from 0xFFFF
    const cycles = await cpu.step();
    
    // Verify the result
    expect(cycles).toBe(4);
    expect(cpu.getAccumulator()).toBe(0x42);
    
    // Test boundary by writing to 0xFFFF
    await cpu.loadByte(3, 0x8D); // STA Absolute
    await cpu.loadByte(4, 0xFF); // Low byte of address
    await cpu.loadByte(5, 0xFF); // High byte of address (0xFFFF)
    
    await cpu.setAccumulator(0x84); // Update A
    await cpu.setProgramCounter(3);
    
    // Execute STA Absolute to write to 0xFFFF
    const cycles2 = await cpu.step();
    
    // Verify the result
    expect(cycles2).toBe(4);
    expect(await cpu.readByte(0xFFFF)).toBe(0x84);
  });
  
  it("should correctly handle writeWord at memory boundary", async () => {
    const cpu = createCPU();
    
    // Test writeWord at 0xFFFF (wraps around to 0x0000)
    await cpu.loadByte(0, 0x20); // JSR Absolute
    await cpu.loadByte(1, 0xFF); // Low byte of address
    await cpu.loadByte(2, 0xFF); // High byte of address (0xFFFF)
    
    await cpu.setProgramCounter(0);
    
    // Execute JSR instruction which will write return address (PC+2-1) to stack
    const cycles = await cpu.step();
    
    // JSR pushes return address (PC+2-1) to stack and jumps to target address
    expect(cycles).toBe(6);
    expect(cpu.getProgramCounter()).toBe(0xFFFF);
    
    // Pull the address from the stack to verify it was stored correctly
    await cpu.loadByte(0xFFFF, 0x60); // RTS
    
    // Execute RTS to pull address from stack and jump back
    const cycles2 = await cpu.step();
    
    // RTS pulls address from stack, adds 1, and sets PC
    expect(cycles2).toBe(6);
    expect(cpu.getProgramCounter()).toBe(3); // Since JSR saves PC+2-1=2, RTS adds 1 to get 3
  });
  
});