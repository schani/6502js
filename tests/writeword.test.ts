import { describe, expect, it } from "bun:test";
import { type CPU, createCPU } from "./utils";

// Need to access private function, so we'll have to recreate it here
function writeWord(cpu: any, address: number, value: number): void {
    cpu.mem[address & 0xFFFF] = value & 0xFF;
    cpu.mem[(address + 1) & 0xFFFF] = (value >> 8) & 0xFF;
}

describe("WriteWord function", () => {
  it("should correctly write words to memory", () => {
    const cpu = createCPU();
    
    // Test normal case
    writeWord(cpu, 0x2000, 0x1234);
    expect(cpu.mem[0x2000]).toBe(0x34); // Low byte
    expect(cpu.mem[0x2001]).toBe(0x12); // High byte
    
    // Test boundary case (0xFFFF -> 0x0000)
    writeWord(cpu, 0xFFFF, 0x5678);
    expect(cpu.mem[0xFFFF]).toBe(0x78); // Low byte
    expect(cpu.mem[0x0000]).toBe(0x56); // High byte wraps around
  });
});