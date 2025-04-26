import { describe, expect, it } from "bun:test";
import { type CPU, createCPU } from "./utils";

describe("More memory helper tests", () => {
  it("should test writeWord at exact memory boundary", () => {
    // Need direct access to internal functions
    function writeByte(cpu: CPU, address: number, value: number): void {
      cpu.mem[address & 0xFFFF] = value & 0xFF;
    }
    
    function writeWord(cpu: CPU, address: number, value: number): void {
      writeByte(cpu, address, value & 0xFF);
      writeByte(cpu, address + 1, (value >> 8) & 0xFF);
    }
    
    function readByte(cpu: CPU, address: number): number {
      return cpu.mem[address & 0xFFFF] || 0;
    }
    
    const cpu = createCPU();
    
    // Test writing a word at the very edge of memory
    writeWord(cpu, 0xFFFE, 0x1234);
    
    // Verify the write was successful and the high byte wrapped around
    expect(readByte(cpu, 0xFFFE)).toBe(0x34);
    expect(readByte(cpu, 0xFFFF)).toBe(0x12);
    
    // Test writing a word that exactly crosses the memory boundary
    writeWord(cpu, 0xFFFF, 0x5678);
    
    // Verify the write was successful and the high byte wrapped around
    expect(readByte(cpu, 0xFFFF)).toBe(0x78);
    expect(readByte(cpu, 0x0000)).toBe(0x56);
  });
});