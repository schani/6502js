import { describe, expect, it } from "bun:test";
import { createCPU, step6502 } from "./utils";

describe("Internal helper functions", () => {
  it("should correctly read and write words", () => {
    const cpu = createCPU();
    
    // Test writeWord
    cpu.mem[0x1234] = 0; // Clear memory
    cpu.mem[0x1235] = 0; 
    
    // Use the CPU step to indirectly test writeWord
    cpu.mem[0] = 0x20; // JSR absolute
    cpu.mem[1] = 0x34; // Low byte of target address
    cpu.mem[2] = 0x12; // High byte of target address
    
    step6502(cpu); // This calls pushWord internally
    
    // Verify the return address was written correctly
    // pc-1 should be written to the stack (0x0001)
    expect(cpu.mem[0x01FC]).toBe(0x00); // Low byte
    expect(cpu.mem[0x01FD]).toBe(0x00); // High byte
    
    // Test readWord via JMP indirect
    // First set up the memory
    cpu.mem[0x2000] = 0x42; // Low byte
    cpu.mem[0x2001] = 0x37; // High byte
    
    // Now setup a JMP indirect instruction
    cpu.pc = 0;
    cpu.mem[0] = 0x6C; // JMP indirect
    cpu.mem[1] = 0x00; // Low byte of pointer
    cpu.mem[2] = 0x20; // High byte of pointer
    
    step6502(cpu); // This calls readWord internally
    
    // Verify PC was set to the address read from memory
    expect(cpu.pc).toBe(0x3742);
  });
});
