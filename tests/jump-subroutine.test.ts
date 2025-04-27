import { describe, expect, it } from "bun:test";
import { createCPU } from "./utils";

describe("Jump and subroutine instructions", () => {
  it("should perform JMP absolute instruction", () => {
    const cpu = createCPU();
    
    // Set up memory
    cpu.loadByte(0, 0x4C); // JMP absolute
    cpu.loadByte(1, 0x34); // Low byte of target
    cpu.loadByte(2, 0x12); // High byte of target
    
    const cycles = cpu.step();
    
    expect(cpu.getProgramCounter()).toBe(0x1234);
    expect(cycles).toBe(3);
  });
  
  it("should perform JSR and RTS instructions", () => {
    const cpu = createCPU();
    
    // Set up memory for JSR
    cpu.loadByte(0, 0x20); // JSR absolute
    cpu.loadByte(1, 0x34); // Low byte of target
    cpu.loadByte(2, 0x12); // High byte of target
    
    // Set up RTS at target location
    cpu.loadByte(0x1234, 0x60); // RTS
    
    // Execute JSR
    let cycles = cpu.step();
    
    expect(cpu.getProgramCounter()).toBe(0x1234);
    expect(cpu.getStackPointer()).toBe(0xFB); // SP decremented by 2 (for 16-bit return address)
    expect(cpu.readByte(0x01FC)).toBe(0x02); // Low byte of return address (PC+2-1)
    expect(cpu.readByte(0x01FD)).toBe(0x00); // High byte of return address (PC+2-1)
    expect(cycles).toBe(6);
    
    // Execute RTS
    cycles = cpu.step();
    
    expect(cpu.getProgramCounter()).toBe(0x0003); // Return address (0x0002) + 1
    expect(cpu.getStackPointer()).toBe(0xFD); // SP incremented by 2
    expect(cycles).toBe(6);
  });
});
