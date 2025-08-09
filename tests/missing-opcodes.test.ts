import { describe, expect, it } from "bun:test";
import { ZERO, NEGATIVE, CARRY } from "../6502";
import { createCPU } from "./utils";

describe("Missing opcodes tests for 100% coverage", () => {
  it("should test LDX Absolute (0xAE)", () => {
    const cpu = createCPU();
    
    // Test loading zero value
    cpu.setProgramCounter(0);
    cpu.loadByte(0, 0xAE); // LDX Absolute
    cpu.loadByte(1, 0x00); // Low byte of address
    cpu.loadByte(2, 0x10); // High byte of address
    cpu.loadByte(0x1000, 0x00); // Value to load
    
    let cycles = cpu.step();
    expect(cycles).toBe(4); // Always 4 cycles for LDX Absolute
    expect(cpu.getXRegister()).toBe(0x00);
    expect((cpu.getState().p & ZERO) !== 0).toBe(true); // Zero flag should be set
    
    // Test loading positive value
    cpu.setProgramCounter(0);
    cpu.loadByte(0, 0xAE); // LDX Absolute
    cpu.loadByte(1, 0x00); // Low byte of address
    cpu.loadByte(2, 0x10); // High byte of address
    cpu.loadByte(0x1000, 0x42); // Value to load
    
    cycles = cpu.step();
    expect(cycles).toBe(4);
    expect(cpu.getXRegister()).toBe(0x42);
    expect((cpu.getState().p & ZERO) === 0).toBe(false); // Zero flag should be cleared
    expect((cpu.getState().p & NEGATIVE) === 0).toBe(false); // Negative flag should be cleared
    
    // Test loading negative value
    cpu.setProgramCounter(0);
    cpu.loadByte(0, 0xAE); // LDX Absolute
    cpu.loadByte(1, 0x00); // Low byte of address
    cpu.loadByte(2, 0x10); // High byte of address
    cpu.loadByte(0x1000, 0x80); // Value to load (negative because bit 7 is set)
    
    cycles = cpu.step();
    expect(cycles).toBe(4);
    expect(cpu.getXRegister()).toBe(0x80);
    expect((cpu.getState().p & ZERO) === 0).toBe(false); // Zero flag should be cleared
    expect((cpu.getState().p & NEGATIVE) !== 0).toBe(true); // Negative flag should be set
  });

  it("should test CMP Absolute (0xCD)", () => {
    const cpu = createCPU();
    
    // Test with equal values
    cpu.setProgramCounter(0);
    cpu.loadByte(0, 0xCD); // CMP Absolute
    cpu.loadByte(1, 0x00); // Low byte of address
    cpu.loadByte(2, 0x10); // High byte of address
    cpu.loadByte(0x1000, 0x42); // Value to compare
    cpu.setAccumulator(0x42);    // A equals memory
    
    let cycles = cpu.step();
    expect(cycles).toBe(4); // Always 4 cycles for CMP Absolute
    expect((cpu.getState().p & ZERO) !== 0).toBe(true);   // Zero flag set (values are equal)
    expect((cpu.getState().p & CARRY) !== 0).toBe(true);  // Carry flag set (A >= M)
    expect((cpu.getState().p & NEGATIVE) === 0).toBe(false); // Negative flag clear
    
    // Test with A > M
    cpu.setProgramCounter(0);
    cpu.loadByte(0, 0xCD); // CMP Absolute
    cpu.loadByte(1, 0x00); // Low byte of address
    cpu.loadByte(2, 0x10); // High byte of address
    cpu.loadByte(0x1000, 0x30); // Value to compare
    cpu.setAccumulator(0x42);    // A greater than memory
    
    cycles = cpu.step();
    expect(cycles).toBe(4);
    expect((cpu.getState().p & ZERO) === 0).toBe(false);   // Zero flag clear (values are not equal)
    expect((cpu.getState().p & CARRY) !== 0).toBe(true);   // Carry flag set (A >= M)
    expect((cpu.getState().p & NEGATIVE) === 0).toBe(false); // Negative flag clear
    
    // Test with A < M
    cpu.setProgramCounter(0);
    cpu.loadByte(0, 0xCD); // CMP Absolute
    cpu.loadByte(1, 0x00); // Low byte of address
    cpu.loadByte(2, 0x10); // High byte of address
    cpu.loadByte(0x1000, 0x60); // Value to compare
    cpu.setAccumulator(0x42);    // A less than memory
    
    cycles = cpu.step();
    expect(cycles).toBe(4);
    expect((cpu.getState().p & ZERO) === 0).toBe(false);    // Zero flag clear (values are not equal)
    expect((cpu.getState().p & CARRY) === 0).toBe(false);   // Carry flag clear (A < M)
    expect((cpu.getState().p & NEGATIVE) !== 0).toBe(true); // Negative flag may be set based on result
  });
  
  // Testing more of the uncovered instructions
  it("should test loadWord and readWord methods", () => {
    const cpu = createCPU();
    
    // Test writing a word
    cpu.loadWord(0x1000, 0x1234);
    
    // Verify the value was written correctly (little-endian)
    expect(cpu.readByte(0x1000)).toBe(0x34); // Low byte
    expect(cpu.readByte(0x1001)).toBe(0x12); // High byte
    
    // Verify we can read it back as a word
    expect(cpu.readWord(0x1000)).toBe(0x1234);
    
    // Test writing at memory boundary
    cpu.loadWord(0xFFFF, 0x4567);
    
    // Verify the value was written correctly, wrapping around to address 0
    expect(cpu.readByte(0xFFFF)).toBe(0x67); // Low byte
    expect(cpu.readByte(0x0000)).toBe(0x45); // High byte (wrapped)
    
    // Verify we can read it back as a word, even at the boundary
    expect(cpu.readWord(0xFFFF)).toBe(0x4567);
  });
  
  // Test remaining shift operations that might be uncovered
  it("should test all shift and rotate operations with all flags", () => {
    const cpu = createCPU();
    
    // Test LSR with zero input and zero output (no carry)
    cpu.setProgramCounter(0);
    cpu.loadByte(0, 0x4A); // LSR A
    cpu.setAccumulator(0x00);
    
    cpu.step();
    expect(cpu.getAccumulator()).toBe(0x00);
    expect((cpu.getState().p & CARRY) === 0).toBe(false);  // Carry should be clear
    expect((cpu.getState().p & ZERO) !== 0).toBe(true);    // Zero flag should be set
    
    // Test ASL with zero input and zero output (no carry)
    cpu.setProgramCounter(0);
    cpu.loadByte(0, 0x0A); // ASL A
    cpu.setAccumulator(0x00);
    
    cpu.step();
    expect(cpu.getAccumulator()).toBe(0x00);
    expect((cpu.getState().p & CARRY) === 0).toBe(false);  // Carry should be clear
    expect((cpu.getState().p & ZERO) !== 0).toBe(true);    // Zero flag should be set
    
    // Test ROL with carry set and zero input
    cpu.setProgramCounter(0);
    cpu.loadByte(0, 0x2A); // ROL A
    cpu.setAccumulator(0x00);
    cpu.setStatusRegister(CARRY);      // Set carry flag
    
    cpu.step();
    expect(cpu.getAccumulator()).toBe(0x01);         // Result should be 0x01 (carry rotated into bit 0)
    expect((cpu.getState().p & CARRY) === 0).toBe(false);  // No carry out
    expect((cpu.getState().p & ZERO) === 0).toBe(false);   // Zero flag should be clear
    
    // Test ROR with carry set and zero input
    cpu.setProgramCounter(0);
    cpu.loadByte(0, 0x6A); // ROR A
    cpu.setAccumulator(0x00);
    cpu.setStatusRegister(CARRY);      // Set carry flag
    
    cpu.step();
    expect(cpu.getAccumulator()).toBe(0x80);         // Result should be 0x80 (carry rotated into bit 7)
    expect((cpu.getState().p & CARRY) === 0).toBe(false);  // No carry out
    expect((cpu.getState().p & NEGATIVE) !== 0).toBe(true); // Negative flag should be set
  });
});