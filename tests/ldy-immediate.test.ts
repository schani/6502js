import { describe, expect, it } from "bun:test";
import { type CPU, createCPU, ZERO, NEGATIVE, getYRegister, getProgramCounter, getStatusRegister } from "./utils";

describe("LDY immediate mode comprehensive tests", async () => {
  it("should load immediate value into Y register from uninitialized memory", async () => {
    const cpu = createCPU();
    
    // Setup the LDY instruction, but don't initialize the target memory
    await cpu.loadByte(0x1000, 0xA0); // LDY #$??
    // Intentionally leave cpu.mem[0x1001] uninitialized
    
    await cpu.setProgramCounter(0x1000);
    
    // Execute
    const cycles = await cpu.step();
    
    // Verify
    expect(cycles).toBe(2);
    expect(await getYRegister(cpu)).toBe(0); // Should be 0 from uninitialized memory
    expect(await getStatusRegister(cpu) & ZERO).toBe(ZERO); // Zero flag should be set
    expect(await getStatusRegister(cpu) & NEGATIVE).toBe(0); // Negative flag should be clear
    expect(await getProgramCounter(cpu)).toBe(0x1002); // PC should advance past opcode and operand
  });
  
  it("should load zero into Y register with zero flag set", async () => {
    const cpu = createCPU();
    
    // Setup the LDY instruction with zero
    await cpu.loadByte(0x1000, 0xA0); // LDY #$00
    cpu.loadByte(0x1001, 0x00);
    
    await cpu.setYRegister(0xFF); // Set Y to a non-zero value
    await cpu.clearStatusFlag(ZERO); // Clear zero flag
    await cpu.setStatusFlag(NEGATIVE); // Set negative flag
    await cpu.setProgramCounter(0x1000);
    
    // Execute
    const cycles = await cpu.step();
    
    // Verify
    expect(cycles).toBe(2);
    expect(await getYRegister(cpu)).toBe(0);
    expect(await getStatusRegister(cpu) & ZERO).toBe(ZERO); // Zero flag should be set
    expect(await getStatusRegister(cpu) & NEGATIVE).toBe(0); // Negative flag should be clear
    expect(await getProgramCounter(cpu)).toBe(0x1002);
  });
  
  it("should load negative value into Y register with negative flag set", async () => {
    const cpu = createCPU();
    
    // Setup the LDY instruction with a negative value
    await cpu.loadByte(0x1000, 0xA0); // LDY #$80
    cpu.loadByte(0x1001, 0x80); // Most significant bit set (negative)
    
    await cpu.setYRegister(0x00); // Set Y to a non-negative value
    await cpu.setStatusFlag(ZERO); // Set zero flag
    await cpu.clearStatusFlag(NEGATIVE); // Clear negative flag
    await cpu.setProgramCounter(0x1000);
    
    // Execute
    const cycles = await cpu.step();
    
    // Verify
    expect(cycles).toBe(2);
    expect(await getYRegister(cpu)).toBe(0x80);
    expect(await getStatusRegister(cpu) & ZERO).toBe(0); // Zero flag should be clear
    expect(await getStatusRegister(cpu) & NEGATIVE).toBe(NEGATIVE); // Negative flag should be set
    expect(await getProgramCounter(cpu)).toBe(0x1002);
  });
});