import { describe, expect, it } from "bun:test";
import { createCPU } from "./utils";
import { CARRY, ZERO, NEGATIVE, OVERFLOW, BREAK, UNUSED, INTERRUPT } from "../cpu";

describe("Comprehensive coverage tests", () => {
  // Test writeWord function
  it("should test writeWord with various addresses", () => {
    const cpu = createCPU();
    
    // Setup test data
    cpu.mem[0x100] = 0xFF;
    cpu.mem[0x101] = 0xFF;
    
    // Test writing a word at address 0x100
    cpu.mem[0x100] = 0; 
    cpu.mem[0x101] = 0;
    
    // Write word using the CPU's memory writing mechanism
    cpu.pc = 0;
    cpu.mem[0] = 0x8D; // STA Absolute
    cpu.mem[1] = 0x00;
    cpu.mem[2] = 0x01;
    cpu.a = 0x34;
    
    // Execute STA to trigger write
    let cycles = step6502(cpu);
    expect(cycles).toBe(4);
    expect(cpu.mem[0x100]).toBe(0x34);
    
    // Now write to the second byte
    cpu.pc = 0;
    cpu.mem[0] = 0x8D; // STA Absolute
    cpu.mem[1] = 0x01;
    cpu.mem[2] = 0x01;
    cpu.a = 0x12;
    
    // Execute STA again
    cycles = step6502(cpu);
    expect(cycles).toBe(4);
    expect(cpu.mem[0x101]).toBe(0x12);
    
    // Verify word was written correctly (0x1234)
    expect((cpu.mem[0x101] << 8) | cpu.mem[0x100]).toBe(0x1234);
  });

  // Test LDX Absolute,Y addressing mode with page crossing
  it("should test LDX Absolute,Y with page crossing", () => {
    const cpu = createCPU();
    
    // Setup memory for LDX Absolute,Y
    cpu.mem[0] = 0xBE; // LDX Absolute,Y
    cpu.mem[1] = 0xFF; // Low byte of address (0x01FF)
    cpu.mem[2] = 0x01; // High byte of address
    cpu.y = 0x01;      // Y = 1, so effective address is 0x0200
    cpu.mem[0x0200] = 0x42; // Value to load
    
    // Execute LDX Absolute,Y
    const cycles = step6502(cpu);
    
    // Check if crossing page boundary costs an extra cycle
    expect(cycles).toBe(5); // 4 + 1 for page cross
    expect(cpu.x).toBe(0x42);
  });

  // Test ROL, ROR, ASL, LSR instructions with specific conditions
  it("should test shift and rotate edge cases", () => {
    const cpu = createCPU();
    
    // Test ROL with carry set and result being zero
    cpu.pc = 0;
    cpu.mem[0] = 0x2A; // ROL A
    cpu.a = 0x00;      // Accumulator = 0
    cpu.p = CARRY;     // Carry flag set
    
    step6502(cpu);
    expect(cpu.a).toBe(0x01); // Result should be 0x01 (carry rotated in)
    expect(cpu.p & CARRY).toBe(0); // Carry flag should be cleared
    expect(cpu.p & ZERO).toBe(0);  // Zero flag should be cleared
    expect(cpu.p & NEGATIVE).toBe(0); // Negative flag should be cleared
    
    // Test ROR with carry set and result having negative bit set
    cpu.pc = 0;
    cpu.mem[0] = 0x6A; // ROR A
    cpu.a = 0x00;      // Accumulator = 0
    cpu.p = CARRY;     // Carry flag set
    
    step6502(cpu);
    expect(cpu.a).toBe(0x80); // Result should be 0x80 (carry rotated to bit 7)
    expect(cpu.p & CARRY).toBe(0); // Carry flag should be cleared
    expect(cpu.p & ZERO).toBe(0);  // Zero flag should be cleared
    expect(cpu.p & NEGATIVE).toBe(NEGATIVE); // Negative flag should be set
    
    // Test ASL with a value that will set both zero and clear carry
    cpu.pc = 0;
    cpu.mem[0] = 0x0A; // ASL A
    cpu.a = 0x00;      // Accumulator = 0
    
    step6502(cpu);
    expect(cpu.a).toBe(0x00); // Result should be 0
    expect(cpu.p & CARRY).toBe(0); // Carry flag should be cleared
    expect(cpu.p & ZERO).toBe(ZERO);  // Zero flag should be set
    
    // Test LSR with value that sets carry and zero
    cpu.pc = 0;
    cpu.mem[0] = 0x4A; // LSR A
    cpu.a = 0x01;      // Accumulator = 1
    
    step6502(cpu);
    expect(cpu.a).toBe(0x00); // Result should be 0
    expect(cpu.p & CARRY).toBe(CARRY); // Carry flag should be set
    expect(cpu.p & ZERO).toBe(ZERO);   // Zero flag should be set
  });

  // Test memory operations at page boundaries
  it("should test memory operations at page boundaries", () => {
    const cpu = createCPU();
    
    // Test ASL Absolute,X at page boundary
    cpu.pc = 0;
    cpu.mem[0] = 0x1E; // ASL Absolute,X
    cpu.mem[1] = 0xFF; // Address 0x01FF
    cpu.mem[2] = 0x01;
    cpu.x = 0x01;      // X = 1, so effective address is 0x0200
    cpu.mem[0x0200] = 0x80; // Value to shift
    
    step6502(cpu);
    expect(cpu.mem[0x0200]).toBe(0x00); // Result after shift
    expect(cpu.p & CARRY).toBe(CARRY);  // Carry flag should be set
    expect(cpu.p & ZERO).toBe(ZERO);    // Zero flag should be set
    
    // Test LSR Absolute,X at page boundary
    cpu.pc = 0;
    cpu.mem[0] = 0x5E; // LSR Absolute,X
    cpu.mem[1] = 0xFF; // Address 0x01FF
    cpu.mem[2] = 0x01;
    cpu.x = 0x01;      // X = 1, so effective address is 0x0200
    cpu.mem[0x0200] = 0x01; // Value to shift
    
    step6502(cpu);
    expect(cpu.mem[0x0200]).toBe(0x00); // Result after shift
    expect(cpu.p & CARRY).toBe(CARRY);  // Carry flag should be set
    expect(cpu.p & ZERO).toBe(ZERO);    // Zero flag should be set
    
    // Test ROL Absolute,X at page boundary
    cpu.pc = 0;
    cpu.mem[0] = 0x3E; // ROL Absolute,X
    cpu.mem[1] = 0xFF; // Address 0x01FF
    cpu.mem[2] = 0x01;
    cpu.x = 0x01;      // X = 1, so effective address is 0x0200
    cpu.mem[0x0200] = 0x80; // Value to rotate
    cpu.p = CARRY;     // Set carry flag
    
    step6502(cpu);
    expect(cpu.mem[0x0200]).toBe(0x01); // Result after rotate
    expect(cpu.p & CARRY).toBe(CARRY);  // Carry flag should be set
    expect(cpu.p & ZERO).toBe(0);       // Zero flag should be cleared
    
    // Test ROR Absolute,X at page boundary
    cpu.pc = 0;
    cpu.mem[0] = 0x7E; // ROR Absolute,X
    cpu.mem[1] = 0xFF; // Address 0x01FF
    cpu.mem[2] = 0x01;
    cpu.x = 0x01;      // X = 1, so effective address is 0x0200
    cpu.mem[0x0200] = 0x01; // Value to rotate
    cpu.p = CARRY;     // Set carry flag
    
    step6502(cpu);
    expect(cpu.mem[0x0200]).toBe(0x80); // Result after rotate
    expect(cpu.p & CARRY).toBe(CARRY);  // Carry flag should be set
    expect(cpu.p & NEGATIVE).toBe(NEGATIVE); // Negative flag should be set
  });

  // Test DEC/INC at page boundaries
  it("should test INC and DEC at page boundaries", () => {
    const cpu = createCPU();
    
    // Test INC Absolute,X
    cpu.pc = 0;
    cpu.mem[0] = 0xFE; // INC Absolute,X
    cpu.mem[1] = 0xFF; // Address 0x01FF
    cpu.mem[2] = 0x01;
    cpu.x = 0x01;      // X = 1, so effective address is 0x0200
    cpu.mem[0x0200] = 0xFF; // Value to increment
    
    step6502(cpu);
    expect(cpu.mem[0x0200]).toBe(0x00); // Result after increment
    expect(cpu.p & ZERO).toBe(ZERO);    // Zero flag should be set
    
    // Test DEC Absolute,X
    cpu.pc = 0;
    cpu.mem[0] = 0xDE; // DEC Absolute,X
    cpu.mem[1] = 0xFF; // Address 0x01FF
    cpu.mem[2] = 0x01;
    cpu.x = 0x01;      // X = 1, so effective address is 0x0200
    cpu.mem[0x0200] = 0x01; // Value to decrement
    
    step6502(cpu);
    expect(cpu.mem[0x0200]).toBe(0x00); // Result after decrement
    expect(cpu.p & ZERO).toBe(ZERO);    // Zero flag should be set
  });

  // Test BRK, RTI with specific conditions
  it("should test BRK and RTI with different status flags", () => {
    const cpu = createCPU();
    
    // Setup for BRK
    cpu.pc = 0x1000;
    cpu.p = ZERO | OVERFLOW | CARRY; // Set some status flags
    
    // Setup IRQ vector
    cpu.mem[0xFFFE] = 0x00;
    cpu.mem[0xFFFF] = 0x20;
    
    // Place BRK instruction
    cpu.mem[0x1000] = 0x00; // BRK
    
    // Execute BRK instruction
    step6502(cpu);
    
    // Remember current stack pointer after BRK
    const stackPointerAfterBRK = cpu.sp;
    
    // Check if processor is at the interrupt handler
    expect(cpu.pc).toBe(0x2000);
    
    // After BRK, stack should have:
    // SP+1: status flags with B set
    // SP+2: low byte of return address (PC+2)
    // SP+3: high byte of return address
    
    // Check status on stack
    expect(cpu.mem[0x0100 + stackPointerAfterBRK + 1]).toBe(ZERO | OVERFLOW | CARRY | UNUSED | BREAK);
    expect(cpu.mem[0x0100 + stackPointerAfterBRK + 2]).toBe(0x02); // Low byte of PC+2
    expect(cpu.mem[0x0100 + stackPointerAfterBRK + 3]).toBe(0x10); // High byte of PC+2
    
    // Interrupt flag should be set
    expect(cpu.p & INTERRUPT).toBe(INTERRUPT);
    
    // Place RTI instruction at interrupt handler
    cpu.mem[0x2000] = 0x40; // RTI
    
    // Execute RTI instruction
    step6502(cpu);
    
    // Check if PC was restored correctly
    expect(cpu.pc).toBe(0x1002);
    
    // Check if status flags were restored (with B flag cleared)
    expect(cpu.p).toBe(ZERO | OVERFLOW | CARRY | UNUSED);
  });

  // Test ADC, SBC with various overflow conditions
  it("should test arithmetic operations with different flag combinations", () => {
    const cpu = createCPU();
    
    // Setup ADC with overflow from positive + positive = negative
    cpu.pc = 0;
    cpu.mem[0] = 0x69; // ADC Immediate
    cpu.mem[1] = 0x70; // Value to add
    cpu.a = 0x70;      // A = 0x70 (positive, bit 7 clear)
    cpu.p = CARRY;     // Carry flag set
    
    step6502(cpu);
    expect(cpu.a).toBe(0xE1); // 0x70 + 0x70 + 1 = 0xE1
    expect(cpu.p & OVERFLOW).toBe(OVERFLOW); // Overflow flag should be set
    expect(cpu.p & NEGATIVE).toBe(NEGATIVE); // Negative flag should be set
    
    // Setup SBC with overflow from negative - positive = positive
    cpu.pc = 0;
    cpu.mem[0] = 0xE9; // SBC Immediate
    cpu.mem[1] = 0x70; // Value to subtract
    cpu.a = 0x90;      // A = 0x90 (negative, bit 7 set)
    cpu.p = CARRY;     // Carry flag set (no borrow)
    
    step6502(cpu);
    expect(cpu.a).toBe(0x20); // 0x90 - 0x70 = 0x20
    expect(cpu.p & OVERFLOW).toBe(OVERFLOW); // Overflow flag should be set
    expect(cpu.p & NEGATIVE).toBe(0);        // Negative flag should be cleared
  });

  // Test for LDX Absolute,Y edge cases
  it("should test LDX Absolute,Y with various conditions", () => {
    const cpu = createCPU();
    
    // Test LDX Absolute,Y without page crossing
    cpu.pc = 0;
    cpu.mem[0] = 0xBE; // LDX Absolute,Y
    cpu.mem[1] = 0x80; // Address 0x0080
    cpu.mem[2] = 0x00;
    cpu.y = 0x05;      // Y = 5, so effective address is 0x0085
    cpu.mem[0x0085] = 0xFF; // Value to load
    
    const cycles = step6502(cpu);
    expect(cycles).toBe(4); // No page crossing
    expect(cpu.x).toBe(0xFF);
    expect(cpu.p & NEGATIVE).toBe(NEGATIVE); // Negative flag should be set
    
    // Test LDX Absolute,Y with zero result
    cpu.pc = 0;
    cpu.mem[0] = 0xBE; // LDX Absolute,Y
    cpu.mem[1] = 0x80; // Address 0x0080
    cpu.mem[2] = 0x00;
    cpu.y = 0x05;      // Y = 5, so effective address is 0x0085
    cpu.mem[0x0085] = 0x00; // Value to load (zero)
    
    step6502(cpu);
    expect(cpu.x).toBe(0x00);
    expect(cpu.p & ZERO).toBe(ZERO); // Zero flag should be set
  });

  // Test various bit manipulation operations
  it("should test bit manipulation operations at specific addresses", () => {
    const cpu = createCPU();
    
    // Test BIT Zero Page
    cpu.pc = 0;
    cpu.mem[0] = 0x24; // BIT Zero Page
    cpu.mem[1] = 0x80; // Zero page address 0x80
    cpu.mem[0x80] = 0xC0; // Test bits (bit 7 and 6 set)
    cpu.a = 0x00;      // A = 0
    
    step6502(cpu);
    expect(cpu.p & NEGATIVE).toBe(NEGATIVE); // Bit 7 should set N flag
    expect(cpu.p & OVERFLOW).toBe(OVERFLOW); // Bit 6 should set V flag
    expect(cpu.p & ZERO).toBe(ZERO);        // A & M = 0 should set Z flag
    
    // Test BIT Absolute
    cpu.pc = 0;
    cpu.mem[0] = 0x2C; // BIT Absolute
    cpu.mem[1] = 0x00; // Address 0x0200
    cpu.mem[2] = 0x02;
    cpu.mem[0x0200] = 0x80; // Test bits (bit 7 set, bit 6 clear)
    cpu.a = 0x01;      // A = 1
    
    step6502(cpu);
    expect(cpu.p & NEGATIVE).toBe(NEGATIVE); // Bit 7 should set N flag
    expect(cpu.p & OVERFLOW).toBe(0);       // Bit 6 should clear V flag
    expect(cpu.p & ZERO).toBe(ZERO);        // A & M = 0 should set Z flag
  });

  // Add more tests as needed to cover the remaining edge cases
});

import { step6502 } from "../cpu";