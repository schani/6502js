import { describe, expect, it } from "bun:test";
import { type CPU, createCPU } from "./utils";

describe("More memory helper tests", () => {
  it("should test writeWord at exact memory boundary", () => {
    const cpu = createCPU();
    
    // Test writing a word at the very edge of memory
    cpu.loadWord(0xFFFE, 0x1234);
    
    // Verify the write was successful and the high byte wrapped around
    expect(cpu.readByte(0xFFFE)).toBe(0x34);
    expect(cpu.readByte(0xFFFF)).toBe(0x12);
    
    // Test writing a word that exactly crosses the memory boundary
    cpu.loadWord(0xFFFF, 0x5678);
    
    // Verify the write was successful and the high byte wrapped around
    expect(cpu.readByte(0xFFFF)).toBe(0x78);
    expect(cpu.readByte(0x0000)).toBe(0x56);
  });
});