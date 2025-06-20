import { describe, expect, it } from "bun:test";
import { createCPU } from "./utils";

describe("Internal helper functions", () => {
  it("should correctly read and write words", () => {
    const cpu = createCPU();
    
    // Test writeWord
    cpu.loadByte(0x1234, 0); // Clear memory
    cpu.loadByte(0x1235, 0); 
    
    // Use the CPU step to indirectly test writeWord
    cpu.loadByte(0, 0x20); // JSR absolute
    cpu.loadByte(1, 0x34); // Low byte of target address
    cpu.loadByte(2, 0x12); // High byte of target address
    
    cpu.step(); // This calls pushWord internally
    
    // Verify the return address was written correctly
    // JSR pushes PC+2-1 to stack, which is 2 in this case (0x0002)
    expect(cpu.readByte(0x01FC)).toBe(0x02); // Low byte
    expect(cpu.readByte(0x01FD)).toBe(0x00); // High byte
    
    // Test readWord via JMP indirect
    // First set up the memory
    cpu.loadByte(0x2000, 0x42); // Low byte
    cpu.loadByte(0x2001, 0x37); // High byte
    
    // Now setup a JMP indirect instruction
    cpu.setProgramCounter(0);
    cpu.loadByte(0, 0x6C); // JMP indirect
    cpu.loadByte(1, 0x00); // Low byte of pointer
    cpu.loadByte(2, 0x20); // High byte of pointer
    
    cpu.step(); // This calls readWord internally
    
    // Verify PC was set to the address read from memory
    expect(cpu.getProgramCounter()).toBe(0x3742);
  });
});
