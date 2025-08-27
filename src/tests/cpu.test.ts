import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { getAccumulator, getXRegister, getYRegister, getProgramCounter, getStackPointer, getStatusRegister, createCPU, CARRY, ZERO, NEGATIVE, INTERRUPT, UNUSED } from "./utils.ts";
describe("6502 CPU", () => {
  it("should initialize with default values", async () => {
    const cpu = createCPU();
    assert.strictEqual(await getAccumulator(cpu), 0);
    assert.strictEqual(await getXRegister(cpu), 0);
    assert.strictEqual(await getYRegister(cpu), 0);
    assert.strictEqual(await getStackPointer(cpu), 0xFD); // Initial stack pointer value
    assert.strictEqual(await getStatusRegister(cpu), 0x24);  // Interrupt and unused flag set
    assert.strictEqual(await getProgramCounter(cpu), 0);
    // Since mem is a proxy, we can't expect it to have length, 
    // so let's check that we can read from max address
    assert.strictEqual(await cpu.readByte(0xFFFF), 0);
  });

  it("should properly set status flags", async () => {
    const cpu = createCPU();
    
    // Test individual flag setting
    await cpu.setStatusRegister(0);
    await cpu.setStatusFlag(CARRY);
    assert.strictEqual((await getStatusRegister(cpu) & CARRY) !== 0, true);
    
    await cpu.setStatusRegister(0);
    await cpu.setStatusFlag(ZERO);
    assert.strictEqual((await getStatusRegister(cpu) & ZERO) !== 0, true);
    
    await cpu.setStatusRegister(0);
    await cpu.setStatusFlag(NEGATIVE);
    assert.strictEqual((await getStatusRegister(cpu) & NEGATIVE) !== 0, true);
  });
});