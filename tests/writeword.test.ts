import { describe, expect, it } from "bun:test";
import { type CPU, createCPU } from "./utils";

describe("WriteWord function", async () => {
  it("should correctly write words to memory", async () => {
    const cpu = createCPU();
    
    // Test normal case
    await cpu.loadWord(0x2000, 0x1234);
    expect(await cpu.readByte(0x2000)).toBe(0x34); // Low byte
    expect(await cpu.readByte(0x2001)).toBe(0x12); // High byte
    
    // Test boundary case (0xFFFF -> 0x0000)
    cpu.loadWord(0xFFFF, 0x5678);
    expect(await cpu.readByte(0xFFFF)).toBe(0x78); // Low byte
    expect(await cpu.readByte(0x0000)).toBe(0x56); // High byte wraps around
  });
});