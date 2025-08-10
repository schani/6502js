import { describe, expect, it } from "bun:test";
import { type CPU, createCPU } from "./utils";

describe("Memory helpers edge cases", () => {
  it("should test writeWord/readWord edge cases", async () => {
    const cpu = createCPU();
    
    // Test writing at memory boundary (0xFFFF -> 0x0000)
    await cpu.loadWord(0xFFFF, 0xABCD);
    
    // Verify the low byte went to 0xFFFF
    expect(await cpu.readByte(0xFFFF)).toBe(0xCD);
    
    // Verify the high byte wrapped around to 0x0000
    expect(await cpu.readByte(0x0000)).toBe(0xAB);
    
    // Test reading a word at memory boundary
    const value = await cpu.readWord(0xFFFF);
    expect(value).toBe(0xABCD);
    
    // Test with undefined memory (should default to 0)
    // First clear the memory we just set
    await cpu.loadByte(0xFFFF, 0);
    await cpu.loadByte(0x0000, 0);
    
    // Now read from uninitialized memory
    const undefValue = await cpu.readWord(0x3000);
    expect(undefValue).toBe(0); // Should default to 0 for uninitialized memory
    
    // Test with non-word boundary
    await cpu.loadWord(0x4000, 0x1234);
    expect(await cpu.readByte(0x4000)).toBe(0x34);
    expect(await cpu.readByte(0x4001)).toBe(0x12);
    
    // Verify reading non-word boundary
    const value2 = await cpu.readWord(0x4000);
    expect(value2).toBe(0x1234);
  });
});