import { describe, expect, it } from "bun:test";
import { createCPU } from "./utils";
import { CARRY, ZERO, NEGATIVE, OVERFLOW, BREAK, UNUSED, INTERRUPT } from "../6502";

describe("Comprehensive coverage tests", () => {
  // Test writeWord function
  it("should test writeWord with various addresses", () => {
    const cpu = createCPU();
    
    // Setup test data
    cpu.loadByte(0x100, 0xFF);
    cpu.loadByte(0x101, 0xFF);
    
    // Test writing a word at address 0x100
    cpu.loadByte(0x100, 0); 
    cpu.loadByte(0x101, 0);
    
    // Write word using the CPU's memory writing mechanism
    cpu.setProgramCounter(0);
    cpu.loadByte(0, 0x8D); // STA Absolute
    cpu.loadByte(1, 0x00);
    cpu.loadByte(2, 0x01);
    cpu.setAccumulator(0x34);
    
    // Execute STA to trigger write
    let cycles = cpu.step();
    expect(cycles).toBe(4);
    expect(cpu.readByte(0x100)).toBe(0x34);
    
    // Now write to the second byte
    cpu.setProgramCounter(0);
    cpu.loadByte(0, 0x8D); // STA Absolute
    cpu.loadByte(1, 0x01);
    cpu.loadByte(2, 0x01);
    cpu.setAccumulator(0x12);
    
    // Execute STA again
    cycles = cpu.step();
    expect(cycles).toBe(4);
    expect(cpu.readByte(0x101)).toBe(0x12);
    
    // Verify word was written correctly (0x1234)
    expect((cpu.readByte(0x101) << 8) | cpu.readByte(0x100)).toBe(0x1234);
  });

  // Test LDX Absolute,Y addressing mode with page crossing
  it("should test LDX Absolute,Y with page crossing", () => {
    const cpu = createCPU();
    
    // Setup memory for LDX Absolute,Y
    cpu.loadByte(0, 0xBE); // LDX Absolute,Y
    cpu.loadByte(1, 0xFF); // Low byte of address (0x01FF)
    cpu.loadByte(2, 0x01); // High byte of address
    cpu.setYRegister(0x01);      // Y = 1, so effective address is 0x0200
    cpu.loadByte(0x0200, 0x42); // Value to load
    
    // Execute LDX Absolute,Y
    const cycles = cpu.step();
    
    // Check if crossing page boundary costs an extra cycle
    expect(cycles).toBe(5); // 4 + 1 for page cross
    expect(cpu.getXRegister()).toBe(0x42);
  });

  // Test ROL, ROR, ASL, LSR instructions with specific conditions
  it("should test shift and rotate edge cases", () => {
    const cpu = createCPU();
    
    // Test ROL with carry set and result being zero
    cpu.setProgramCounter(0);
    cpu.loadByte(0, 0x2A); // ROL A
    cpu.setAccumulator(0x00);      // Accumulator = 0
    cpu.setStatusFlag(CARRY);     // Carry flag set
    
    cpu.step();
    expect(cpu.getAccumulator()).toBe(0x01); // Result should be 0x01 (carry rotated in)
    expect(cpu.isStatusFlagSet(CARRY)).toBe(false); // Carry flag should be cleared
    expect(cpu.isStatusFlagSet(ZERO)).toBe(false);  // Zero flag should be cleared
    expect(cpu.isStatusFlagSet(NEGATIVE)).toBe(false); // Negative flag should be cleared
    
    // Test ROR with carry set and result having negative bit set
    cpu.setProgramCounter(0);
    cpu.loadByte(0, 0x6A); // ROR A
    cpu.setAccumulator(0x00);      // Accumulator = 0
    cpu.setStatusFlag(CARRY);     // Carry flag set
    
    cpu.step();
    expect(cpu.getAccumulator()).toBe(0x80); // Result should be 0x80 (carry rotated to bit 7)
    expect(cpu.isStatusFlagSet(CARRY)).toBe(false); // Carry flag should be cleared
    expect(cpu.isStatusFlagSet(ZERO)).toBe(false);  // Zero flag should be cleared
    expect(cpu.isStatusFlagSet(NEGATIVE)).toBe(true); // Negative flag should be set
    
    // Test ASL with a value that will set both zero and clear carry
    cpu.setProgramCounter(0);
    cpu.loadByte(0, 0x0A); // ASL A
    cpu.setAccumulator(0x00);      // Accumulator = 0
    
    cpu.step();
    expect(cpu.getAccumulator()).toBe(0x00); // Result should be 0
    expect(cpu.isStatusFlagSet(CARRY)).toBe(false); // Carry flag should be cleared
    expect(cpu.isStatusFlagSet(ZERO)).toBe(true);  // Zero flag should be set
    
    // Test LSR with value that sets carry and zero
    cpu.setProgramCounter(0);
    cpu.loadByte(0, 0x4A); // LSR A
    cpu.setAccumulator(0x01);      // Accumulator = 1
    
    cpu.step();
    expect(cpu.getAccumulator()).toBe(0x00); // Result should be 0
    expect(cpu.isStatusFlagSet(CARRY)).toBe(true); // Carry flag should be set
    expect(cpu.isStatusFlagSet(ZERO)).toBe(true);   // Zero flag should be set
  });

  // Test memory operations at page boundaries
  it("should test memory operations at page boundaries", () => {
    const cpu = createCPU();
    
    // Test ASL Absolute,X at page boundary
    cpu.setProgramCounter(0);
    cpu.loadByte(0, 0x1E); // ASL Absolute,X
    cpu.loadByte(1, 0xFF); // Address 0x01FF
    cpu.loadByte(2, 0x01);
    cpu.setXRegister(0x01);      // X = 1, so effective address is 0x0200
    cpu.loadByte(0x0200, 0x80); // Value to shift
    
    cpu.step();
    expect(cpu.readByte(0x0200)).toBe(0x00); // Result after shift
    expect(cpu.isStatusFlagSet(CARRY)).toBe(true);  // Carry flag should be set
    expect(cpu.isStatusFlagSet(ZERO)).toBe(true);    // Zero flag should be set
    
    // Test LSR Absolute,X at page boundary
    cpu.setProgramCounter(0);
    cpu.loadByte(0, 0x5E); // LSR Absolute,X
    cpu.loadByte(1, 0xFF); // Address 0x01FF
    cpu.loadByte(2, 0x01);
    cpu.setXRegister(0x01);      // X = 1, so effective address is 0x0200
    cpu.loadByte(0x0200, 0x01); // Value to shift
    
    cpu.step();
    expect(cpu.readByte(0x0200)).toBe(0x00); // Result after shift
    expect(cpu.isStatusFlagSet(CARRY)).toBe(true);  // Carry flag should be set
    expect(cpu.isStatusFlagSet(ZERO)).toBe(true);    // Zero flag should be set
    
    // Test ROL Absolute,X at page boundary
    cpu.setProgramCounter(0);
    cpu.loadByte(0, 0x3E); // ROL Absolute,X
    cpu.loadByte(1, 0xFF); // Address 0x01FF
    cpu.loadByte(2, 0x01);
    cpu.setXRegister(0x01);      // X = 1, so effective address is 0x0200
    cpu.loadByte(0x0200, 0x80); // Value to rotate
    cpu.setStatusFlag(CARRY);     // Set carry flag
    
    cpu.step();
    expect(cpu.readByte(0x0200)).toBe(0x01); // Result after rotate
    expect(cpu.isStatusFlagSet(CARRY)).toBe(true);  // Carry flag should be set
    expect(cpu.isStatusFlagSet(ZERO)).toBe(false);  // Zero flag should be cleared
    
    // Test ROR Absolute,X at page boundary
    cpu.setProgramCounter(0);
    cpu.loadByte(0, 0x7E); // ROR Absolute,X
    cpu.loadByte(1, 0xFF); // Address 0x01FF
    cpu.loadByte(2, 0x01);
    cpu.setXRegister(0x01);      // X = 1, so effective address is 0x0200
    cpu.loadByte(0x0200, 0x01); // Value to rotate
    cpu.setStatusFlag(CARRY);     // Set carry flag
    
    cpu.step();
    expect(cpu.readByte(0x0200)).toBe(0x80); // Result after rotate
    expect(cpu.isStatusFlagSet(CARRY)).toBe(true);  // Carry flag should be set
    expect(cpu.isStatusFlagSet(NEGATIVE)).toBe(true); // Negative flag should be set
  });

  // Test DEC/INC at page boundaries
  it("should test INC and DEC at page boundaries", () => {
    const cpu = createCPU();
    
    // Test INC Absolute,X
    cpu.setProgramCounter(0);
    cpu.loadByte(0, 0xFE); // INC Absolute,X
    cpu.loadByte(1, 0xFF); // Address 0x01FF
    cpu.loadByte(2, 0x01);
    cpu.setXRegister(0x01);      // X = 1, so effective address is 0x0200
    cpu.loadByte(0x0200, 0xFF); // Value to increment
    
    cpu.step();
    expect(cpu.readByte(0x0200)).toBe(0x00); // Result after increment
    expect(cpu.isStatusFlagSet(ZERO)).toBe(true);    // Zero flag should be set
    
    // Test DEC Absolute,X
    cpu.setProgramCounter(0);
    cpu.loadByte(0, 0xDE); // DEC Absolute,X
    cpu.loadByte(1, 0xFF); // Address 0x01FF
    cpu.loadByte(2, 0x01);
    cpu.setXRegister(0x01);      // X = 1, so effective address is 0x0200
    cpu.loadByte(0x0200, 0x01); // Value to decrement
    
    cpu.step();
    expect(cpu.readByte(0x0200)).toBe(0x00); // Result after decrement
    expect(cpu.isStatusFlagSet(ZERO)).toBe(true);    // Zero flag should be set
  });

  // Test BRK, RTI with specific conditions
  it("should test BRK and RTI with different status flags", () => {
    const cpu = createCPU();
    
    // Setup for BRK
    cpu.setProgramCounter(0x1000);
    // Clear and set the flags individually
    cpu.clearStatusFlag(CARRY);
    cpu.clearStatusFlag(ZERO);
    cpu.clearStatusFlag(INTERRUPT);
    cpu.clearStatusFlag(NEGATIVE);
    cpu.clearStatusFlag(OVERFLOW);
    cpu.clearStatusFlag(BREAK);
    // Now set the ones we want
    cpu.setStatusFlag(ZERO);
    cpu.setStatusFlag(OVERFLOW);
    cpu.setStatusFlag(CARRY);
    
    // Setup IRQ vector
    cpu.loadByte(0xFFFE, 0x00);
    cpu.loadByte(0xFFFF, 0x20);
    
    // Place BRK instruction
    cpu.loadByte(0x1000, 0x00); // BRK
    
    // Execute BRK instruction
    cpu.step();
    
    // Remember current stack pointer after BRK
    const stackPointerAfterBRK = cpu.getStackPointer();
    
    // Check if processor is at the interrupt handler
    expect(cpu.getProgramCounter()).toBe(0x2000);
    
    // After BRK, stack should have:
    // SP+1: status flags with B set
    // SP+2: low byte of return address (PC+2)
    // SP+3: high byte of return address
    
    // Check status on stack (using readByte directly)
    expect(cpu.readByte(0x0100 + stackPointerAfterBRK + 1)).toBe(ZERO | OVERFLOW | CARRY | UNUSED | BREAK);
    expect(cpu.readByte(0x0100 + stackPointerAfterBRK + 2)).toBe(0x02); // Low byte of PC+2
    expect(cpu.readByte(0x0100 + stackPointerAfterBRK + 3)).toBe(0x10); // High byte of PC+2
    
    // Interrupt flag should be set
    expect(cpu.isStatusFlagSet(INTERRUPT)).toBe(true);
    
    // Place RTI instruction at interrupt handler
    cpu.loadByte(0x2000, 0x40); // RTI
    
    // Execute RTI instruction
    cpu.step();
    
    // Check if PC was restored correctly
    expect(cpu.getProgramCounter()).toBe(0x1002);
    
    // Check if status flags were restored (with B flag cleared)
    expect(cpu.isStatusFlagSet(ZERO)).toBe(true);
    expect(cpu.isStatusFlagSet(OVERFLOW)).toBe(true);
    expect(cpu.isStatusFlagSet(CARRY)).toBe(true);
    expect(cpu.isStatusFlagSet(UNUSED)).toBe(true);
    expect(cpu.isStatusFlagSet(BREAK)).toBe(false);
  });

  // Test ADC, SBC with various overflow conditions
  it("should test arithmetic operations with different flag combinations", () => {
    const cpu = createCPU();
    
    // Setup ADC with overflow from positive + positive = negative
    cpu.setProgramCounter(0);
    cpu.loadByte(0, 0x69); // ADC Immediate
    cpu.loadByte(1, 0x70); // Value to add
    cpu.setAccumulator(0x70);      // A = 0x70 (positive, bit 7 clear)
    cpu.setStatusFlag(CARRY);     // Carry flag set
    
    cpu.step();
    expect(cpu.getAccumulator()).toBe(0xE1); // 0x70 + 0x70 + 1 = 0xE1
    expect(cpu.isStatusFlagSet(OVERFLOW)).toBe(true); // Overflow flag should be set
    expect(cpu.isStatusFlagSet(NEGATIVE)).toBe(true); // Negative flag should be set
    
    // Setup SBC with overflow from negative - positive = positive
    cpu.setProgramCounter(0);
    cpu.loadByte(0, 0xE9); // SBC Immediate
    cpu.loadByte(1, 0x70); // Value to subtract
    cpu.setAccumulator(0x90);      // A = 0x90 (negative, bit 7 set)
    cpu.setStatusFlag(CARRY);     // Carry flag set (no borrow)
    
    cpu.step();
    expect(cpu.getAccumulator()).toBe(0x20); // 0x90 - 0x70 = 0x20
    expect(cpu.isStatusFlagSet(OVERFLOW)).toBe(true); // Overflow flag should be set
    expect(cpu.isStatusFlagSet(NEGATIVE)).toBe(false); // Negative flag should be cleared
  });

  // Test for LDX Absolute,Y edge cases
  it("should test LDX Absolute,Y with various conditions", () => {
    const cpu = createCPU();
    
    // Test LDX Absolute,Y without page crossing
    cpu.setProgramCounter(0);
    cpu.loadByte(0, 0xBE); // LDX Absolute,Y
    cpu.loadByte(1, 0x80); // Address 0x0080
    cpu.loadByte(2, 0x00);
    cpu.setYRegister(0x05);      // Y = 5, so effective address is 0x0085
    cpu.loadByte(0x0085, 0xFF); // Value to load
    
    const cycles = cpu.step();
    expect(cycles).toBe(4); // No page crossing
    expect(cpu.getXRegister()).toBe(0xFF);
    expect(cpu.isStatusFlagSet(NEGATIVE)).toBe(true); // Negative flag should be set
    
    // Test LDX Absolute,Y with zero result
    cpu.setProgramCounter(0);
    cpu.loadByte(0, 0xBE); // LDX Absolute,Y
    cpu.loadByte(1, 0x80); // Address 0x0080
    cpu.loadByte(2, 0x00);
    cpu.setYRegister(0x05);      // Y = 5, so effective address is 0x0085
    cpu.loadByte(0x0085, 0x00); // Value to load (zero)
    
    cpu.step();
    expect(cpu.getXRegister()).toBe(0x00);
    expect(cpu.isStatusFlagSet(ZERO)).toBe(true); // Zero flag should be set
  });

  // Test various bit manipulation operations
  it("should test bit manipulation operations at specific addresses", () => {
    const cpu = createCPU();
    
    // Test BIT Zero Page
    cpu.setProgramCounter(0);
    cpu.loadByte(0, 0x24); // BIT Zero Page
    cpu.loadByte(1, 0x80); // Zero page address 0x80
    cpu.loadByte(0x80, 0xC0); // Test bits (bit 7 and 6 set)
    cpu.setAccumulator(0x00);      // A = 0
    
    cpu.step();
    expect(cpu.isStatusFlagSet(NEGATIVE)).toBe(true); // Bit 7 should set N flag
    expect(cpu.isStatusFlagSet(OVERFLOW)).toBe(true); // Bit 6 should set V flag
    expect(cpu.isStatusFlagSet(ZERO)).toBe(true);    // A & M = 0 should set Z flag
    
    // Test BIT Absolute
    cpu.setProgramCounter(0);
    cpu.loadByte(0, 0x2C); // BIT Absolute
    cpu.loadByte(1, 0x00); // Address 0x0200
    cpu.loadByte(2, 0x02);
    cpu.loadByte(0x0200, 0x80); // Test bits (bit 7 set, bit 6 clear)
    cpu.setAccumulator(0x01);      // A = 1
    
    cpu.step();
    expect(cpu.isStatusFlagSet(NEGATIVE)).toBe(true); // Bit 7 should set N flag
    expect(cpu.isStatusFlagSet(OVERFLOW)).toBe(false); // Bit 6 should clear V flag
    expect(cpu.isStatusFlagSet(ZERO)).toBe(true);    // A & M = 0 should set Z flag
  });

  // Add more tests as needed to cover the remaining edge cases
});