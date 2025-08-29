import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createCPU, getProgramCounter, getStackPointer } from "./utils.ts";

describe("Jump and subroutine instructions", () => {
  it("should perform JMP absolute instruction", async () => {
    const cpu = createCPU();
    
    // Set up memory
    await cpu.loadByte(0, 0x4C); // JMP absolute
    await cpu.loadByte(1, 0x34); // Low byte of target
    await cpu.loadByte(2, 0x12); // High byte of target
    
    await cpu.step();
    
    assert.strictEqual(await getProgramCounter(cpu), 0x1234);
    
  });
  
  it("should perform JSR and RTS instructions", async () => {
    const cpu = createCPU();
    
    // Set up memory for JSR
    await cpu.loadByte(0, 0x20); // JSR absolute
    await cpu.loadByte(1, 0x34); // Low byte of target
    await cpu.loadByte(2, 0x12); // High byte of target
    
    // Set up RTS at target location
    await cpu.loadByte(0x1234, 0x60); // RTS
    
    // Execute JSR
    await cpu.step();
    
    assert.strictEqual(await getProgramCounter(cpu), 0x1234);
    assert.strictEqual(await getStackPointer(cpu), 0xFB); // SP decremented by 2 (for 16-bit return address)
    assert.strictEqual(await cpu.readByte(0x01FC), 0x02); // Low byte of return address (PC+2-1)
    assert.strictEqual(await cpu.readByte(0x01FD), 0x00); // High byte of return address (PC+2-1)
    
    await cpu.step();
    
    assert.strictEqual(await getProgramCounter(cpu), 0x0003); // Return address (0x0002) + 1
    assert.strictEqual(await getStackPointer(cpu), 0xFD); // SP incremented by 2
    
  });
});
