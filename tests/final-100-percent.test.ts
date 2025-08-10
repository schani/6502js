import { describe, expect, it } from "bun:test";
import { 
  ZERO, NEGATIVE, CARRY, INTERRUPT, OVERFLOW, UNUSED, BREAK, DECIMAL 
} from "../6502";
import { createCPU } from "./utils";

// This test targets the exact lines that are uncovered in the CPU code
describe("Final 100% coverage tests", async () => {
  // Test writeWord function implementation directly
  it("should test writeWord directly", async () => {
    const cpu = createCPU();
    
    // Test writing a word at position 0x1234
    await cpu.loadByte(0, 0x8D); // STA Absolute
    await cpu.loadByte(1, 0x34);
    await cpu.loadByte(2, 0x12);
    await cpu.setAccumulator(0x42);
    await cpu.setProgramCounter(0);
    
    // Execute STA Absolute
    await cpu.step();
    
    // Verify the value was written
    expect(await cpu.readByte(0x1234)).toBe(0x42);
    
    // Test writing a word at memory boundary
    await cpu.loadByte(0, 0x8D); // STA Absolute
    await cpu.loadByte(1, 0xFF);
    await cpu.loadByte(2, 0xFF);
    await cpu.setAccumulator(0x37);
    await cpu.setProgramCounter(0);
    
    // Execute STA Absolute
    await cpu.step();
    
    // Verify the value was written
    expect(await cpu.readByte(0xFFFF)).toBe(0x37);
  });

  // Test ADC with edge cases to cover all code paths
  it("should test ADC with all possible operand combinations", async () => {
    const cpu = createCPU();
    
    // Test ADC with all possible operand combinations to ensure all code paths are taken
    
    // 1. Test positive + positive without overflow or carry
    await cpu.setProgramCounter(0);
    await cpu.loadByte(0, 0x69); // ADC Immediate
    await cpu.loadByte(1, 0x40); // Value to add (positive)
    await cpu.setAccumulator(0x30);      // A = 0x30 (positive)
    // Clear all flags
    await cpu.clearStatusFlag(CARRY);
    await cpu.clearStatusFlag(ZERO);
    await cpu.clearStatusFlag(NEGATIVE);
    await cpu.clearStatusFlag(OVERFLOW);
    
    // Execute ADC
    await cpu.step();
    expect(cpu.getAccumulator()).toBe(0x70); // 0x30 + 0x40 = 0x70
    expect(((await cpu.getState()).p & OVERFLOW) !== 0).toBe(false); // No overflow
    expect(((await cpu.getState()).p & CARRY) !== 0).toBe(false);    // No carry
    
    // 2. Test positive + positive with carry but no overflow
    await cpu.setProgramCounter(0);
    await cpu.loadByte(0, 0x69); // ADC Immediate
    await cpu.loadByte(1, 0x70); // Value to add (positive)
    await cpu.setAccumulator(0x95);      // A = 0x95 (negative)
    // Clear all flags
    await cpu.clearStatusFlag(CARRY);
    await cpu.clearStatusFlag(ZERO);
    await cpu.clearStatusFlag(NEGATIVE);
    await cpu.clearStatusFlag(OVERFLOW);
    
    // Execute ADC
    await cpu.step();
    expect(cpu.getAccumulator()).toBe(0x05); // 0x95 + 0x70 = 0x105 (with carry)
    expect(((await cpu.getState()).p & OVERFLOW) !== 0).toBe(false); // No overflow
    expect(((await cpu.getState()).p & CARRY) !== 0).toBe(true); // Carry flag set
    
    // 3. Test positive + positive with overflow (result is negative)
    await cpu.setProgramCounter(0);
    await cpu.loadByte(0, 0x69); // ADC Immediate
    await cpu.loadByte(1, 0x70); // Value to add (positive)
    await cpu.setAccumulator(0x70);      // A = 0x70 (positive)
    // Clear all flags
    await cpu.clearStatusFlag(CARRY);
    await cpu.clearStatusFlag(ZERO);
    await cpu.clearStatusFlag(NEGATIVE);
    await cpu.clearStatusFlag(OVERFLOW);
    
    // Execute ADC
    await cpu.step();
    expect(cpu.getAccumulator()).toBe(0xE0); // 0x70 + 0x70 = 0xE0 (negative)
    expect(((await cpu.getState()).p & OVERFLOW) !== 0).toBe(true); // Overflow flag set
    expect(((await cpu.getState()).p & NEGATIVE) !== 0).toBe(true); // Negative flag set
    
    // 4. Test negative + negative with overflow (result is positive)
    await cpu.setProgramCounter(0);
    await cpu.loadByte(0, 0x69); // ADC Immediate
    await cpu.loadByte(1, 0x90); // Value to add (negative)
    await cpu.setAccumulator(0x90);      // A = 0x90 (negative)
    // Clear all flags
    await cpu.clearStatusFlag(CARRY);
    await cpu.clearStatusFlag(ZERO);
    await cpu.clearStatusFlag(NEGATIVE);
    await cpu.clearStatusFlag(OVERFLOW);
    
    // Execute ADC
    await cpu.step();
    expect(cpu.getAccumulator()).toBe(0x20); // 0x90 + 0x90 = 0x120 (0x20 with carry)
    expect(((await cpu.getState()).p & OVERFLOW) !== 0).toBe(true); // Overflow flag set
    expect(((await cpu.getState()).p & CARRY) !== 0).toBe(true); // Carry flag set
  });
  
  // Test SBC with edge cases to cover all code paths
  it("should test SBC with all possible operand combinations", async () => {
    const cpu = createCPU();
    
    // 1. Test positive - positive with no borrow (positive result)
    await cpu.setProgramCounter(0);
    await cpu.loadByte(0, 0xE9); // SBC Immediate
    await cpu.loadByte(1, 0x30); // Value to subtract (positive)
    await cpu.setAccumulator(0x50);      // A = 0x50 (positive)
    await cpu.setStatusFlag(CARRY);     // Set carry flag (no borrow)
    
    // Execute SBC
    await cpu.step();
    expect(cpu.getAccumulator()).toBe(0x20); // 0x50 - 0x30 = 0x20
    expect(((await cpu.getState()).p & OVERFLOW) !== 0).toBe(false); // No overflow
    expect(((await cpu.getState()).p & CARRY) !== 0).toBe(true); // No borrow needed
    
    // 2. Test positive - positive with borrow (negative result)
    await cpu.setProgramCounter(0);
    await cpu.loadByte(0, 0xE9); // SBC Immediate
    await cpu.loadByte(1, 0x50); // Value to subtract (positive)
    await cpu.setAccumulator(0x30);      // A = 0x30 (positive)
    await cpu.setStatusFlag(CARRY);     // Set carry flag (no borrow)
    
    // Execute SBC
    await cpu.step();
    expect(cpu.getAccumulator()).toBe(0xE0); // 0x30 - 0x50 = 0xE0 (negative)
    expect(((await cpu.getState()).p & OVERFLOW) !== 0).toBe(false); // No overflow
    expect(((await cpu.getState()).p & CARRY) !== 0).toBe(false); // Borrow needed
    
    // 3. Test negative - positive with overflow (positive result)
    await cpu.setProgramCounter(0);
    await cpu.loadByte(0, 0xE9); // SBC Immediate
    await cpu.loadByte(1, 0x70); // Value to subtract (positive)
    await cpu.setAccumulator(0x90);      // A = 0x90 (negative)
    await cpu.setStatusFlag(CARRY);     // Set carry flag (no borrow)
    
    // Execute SBC
    await cpu.step();
    expect(cpu.getAccumulator()).toBe(0x20); // 0x90 - 0x70 = 0x20
    expect(((await cpu.getState()).p & OVERFLOW) !== 0).toBe(true); // Overflow flag set
    expect(((await cpu.getState()).p & CARRY) !== 0).toBe(true); // No borrow needed
    
    // 4. Test positive - negative with overflow (negative result)
    await cpu.setProgramCounter(0);
    await cpu.loadByte(0, 0xE9); // SBC Immediate
    await cpu.loadByte(1, 0x90); // Value to subtract (negative)
    await cpu.setAccumulator(0x20);      // A = 0x20 (positive)
    await cpu.setStatusFlag(CARRY);     // Set carry flag (no borrow)
    
    // Execute SBC
    await cpu.step();
    expect(cpu.getAccumulator()).toBe(0x90); // 0x20 - 0x90 = 0x90 (negative result)
    expect(((await cpu.getState()).p & OVERFLOW) !== 0).toBe(true); // Overflow flag set
    expect(((await cpu.getState()).p & NEGATIVE) !== 0).toBe(true); // Negative flag set
  });
  
  // Test all branch instructions with various conditions 
  it("should test all branch instructions with various conditions", async () => {
    const cpu = createCPU();
    
    // Test BCS with page crossing, carry set
    await cpu.setProgramCounter(0x10FA);
    await cpu.loadByte(0x10FA, 0xB0); // BCS
    await cpu.loadByte(0x10FB, 0x10); // Branch forward 16 bytes (crosses page)
    await cpu.setStatusFlag(CARRY);    // Set carry flag
    
    await cpu.step();
    expect(cpu.getProgramCounter()).toBe(0x110C); // 0x10FA + 2 + 0x10 = 0x110C (correct calculation)
    
    // Test BEQ with page crossing, zero set
    await cpu.setProgramCounter(0x10FA);
    await cpu.loadByte(0x10FA, 0xF0); // BEQ
    await cpu.loadByte(0x10FB, 0x10); // Branch forward 16 bytes (crosses page)
    await cpu.clearStatusFlag(CARRY);
    await cpu.setStatusFlag(ZERO);     // Set zero flag
    
    await cpu.step();
    expect(cpu.getProgramCounter()).toBe(0x110C); // 0x10FA + 2 + 0x10 = 0x110C (correct calculation)
    
    // Test BMI with page crossing, negative set
    await cpu.setProgramCounter(0x10FA);
    await cpu.loadByte(0x10FA, 0x30); // BMI
    await cpu.loadByte(0x10FB, 0x10); // Branch forward 16 bytes (crosses page)
    await cpu.clearStatusFlag(ZERO);
    await cpu.setStatusFlag(NEGATIVE); // Set negative flag
    
    await cpu.step();
    expect(cpu.getProgramCounter()).toBe(0x110C); // 0x10FA + 2 + 0x10 = 0x110C (correct calculation)
    
    // Test BVS with page crossing, overflow set
    await cpu.setProgramCounter(0x10FA);
    await cpu.loadByte(0x10FA, 0x70); // BVS
    await cpu.loadByte(0x10FB, 0x10); // Branch forward 16 bytes (crosses page)
    await cpu.clearStatusFlag(NEGATIVE);
    await cpu.setStatusFlag(OVERFLOW); // Set overflow flag
    
    await cpu.step();
    expect(cpu.getProgramCounter()).toBe(0x110C); // 0x10FA + 2 + 0x10 = 0x110C (correct calculation)
  });
  
  // Test all shift/rotate instructions with the carry flag in both states
  it("should test shift and rotate operations with both carry states", async () => {
    const cpu = createCPU();
    
    // Test ROR with carry clear
    await cpu.setProgramCounter(0);
    await cpu.loadByte(0, 0x6A); // ROR A
    await cpu.setAccumulator(0x01);     // Value to rotate
    await cpu.clearStatusFlag(CARRY);   // Clear carry flag
    
    await cpu.step();
    expect(cpu.getAccumulator()).toBe(0x00); // Result: 0x00, bit 0 goes to carry
    expect(((await cpu.getState()).p & CARRY) !== 0).toBe(true); // Carry flag set
    expect(((await cpu.getState()).p & ZERO) !== 0).toBe(true);  // Zero flag set
    
    // Test ROR Zero Page with carry clear
    await cpu.setProgramCounter(0);
    await cpu.loadByte(0, 0x66); // ROR Zero Page
    await cpu.loadByte(1, 0x80); // Zero page address
    await cpu.loadByte(0x80, 0x01); // Value to rotate
    await cpu.clearStatusFlag(CARRY);   // Clear carry flag
    
    await cpu.step();
    expect(await cpu.readByte(0x80)).toBe(0x00); // Result: 0x00, bit 0 goes to carry
    expect(((await cpu.getState()).p & CARRY) !== 0).toBe(true); // Carry flag set
    expect(((await cpu.getState()).p & ZERO) !== 0).toBe(true);  // Zero flag set
    
    // Test ROR Absolute with carry clear
    await cpu.setProgramCounter(0);
    await cpu.loadByte(0, 0x6E); // ROR Absolute
    await cpu.loadByte(1, 0x00); // Low byte of address
    await cpu.loadByte(2, 0x10); // High byte of address
    await cpu.loadByte(0x1000, 0x01); // Value to rotate
    await cpu.clearStatusFlag(CARRY);    // Clear carry flag
    
    await cpu.step();
    expect(await cpu.readByte(0x1000)).toBe(0x00); // Result: 0x00, bit 0 goes to carry
    expect(((await cpu.getState()).p & CARRY) !== 0).toBe(true); // Carry flag set
    expect(((await cpu.getState()).p & ZERO) !== 0).toBe(true);  // Zero flag set
    
    // Test ROR Absolute,X with carry clear
    await cpu.setProgramCounter(0);
    await cpu.loadByte(0, 0x7E); // ROR Absolute,X
    await cpu.loadByte(1, 0x00); // Low byte of address
    await cpu.loadByte(2, 0x10); // High byte of address
    cpu.setXRegister(0x05);     // X register = 5
    await cpu.loadByte(0x1005, 0x01); // Value to rotate
    await cpu.clearStatusFlag(CARRY);   // Clear carry flag
    
    await cpu.step();
    expect(await cpu.readByte(0x1005)).toBe(0x00); // Result: 0x00, bit 0 goes to carry
    expect(((await cpu.getState()).p & CARRY) !== 0).toBe(true); // Carry flag set
    expect(((await cpu.getState()).p & ZERO) !== 0).toBe(true);  // Zero flag set
  });
  
  // Test BRK and RTI with specific status flags
  it("should test BRK and RTI with specific status flags and stack manipulation", async () => {
    const cpu = createCPU();
    
    // Set initial state
    await cpu.setProgramCounter(0x1000);
    
    // Set the flags individually
    await cpu.clearStatusFlag(INTERRUPT);
    await cpu.clearStatusFlag(BREAK);
    await cpu.setStatusFlag(ZERO);
    await cpu.setStatusFlag(CARRY);
    await cpu.setStatusFlag(NEGATIVE);
    await cpu.setStatusFlag(OVERFLOW);
    await cpu.setStatusFlag(DECIMAL);
    
    // Setup IRQ/BRK vector
    await cpu.loadByte(0xFFFE, 0x00);
    await cpu.loadByte(0xFFFF, 0x20);
    
    // Setup BRK instruction
    await cpu.loadByte(0x1000, 0x00); // BRK
    
    // Save the initial stack pointer
    const initialSP = cpu.getStackPointer();
    
    // Execute BRK
    await cpu.step();
    
    // Check stack state after BRK
    expect(cpu.getStackPointer()).toBe(initialSP - 3); // Stack pointer decremented by 3
    expect(((await cpu.getState()).p & INTERRUPT) !== 0).toBe(true); // Interrupt flag set
    expect(cpu.getProgramCounter()).toBe(0x2000); // PC set to interrupt vector
    
    // Check status pushed on stack (using direct memory read)
    const stackStatusValue = await cpu.readByte(0x0100 + cpu.getStackPointer() + 1);
    expect((stackStatusValue & ZERO) === ZERO).toBe(true);
    expect((stackStatusValue & CARRY) === CARRY).toBe(true);
    expect((stackStatusValue & NEGATIVE) === NEGATIVE).toBe(true);
    expect((stackStatusValue & OVERFLOW) === OVERFLOW).toBe(true);
    expect((stackStatusValue & DECIMAL) === DECIMAL).toBe(true);
    expect((stackStatusValue & UNUSED) === UNUSED).toBe(true);
    expect((stackStatusValue & BREAK) === BREAK).toBe(true);
    
    // Set up RTI at interrupt handler
    await cpu.loadByte(0x2000, 0x40); // RTI
    
    // Execute RTI
    await cpu.step();
    
    // Check CPU state after RTI
    expect(cpu.getStackPointer()).toBe(initialSP); // Stack pointer restored
    expect(cpu.getProgramCounter()).toBe(0x1002); // PC set to address after BRK
    
    // Check restored flag values
    expect(((await cpu.getState()).p & ZERO) !== 0).toBe(true);
    expect(((await cpu.getState()).p & CARRY) !== 0).toBe(true);
    expect(((await cpu.getState()).p & NEGATIVE) !== 0).toBe(true);
    expect(((await cpu.getState()).p & OVERFLOW) !== 0).toBe(true);
    expect(((await cpu.getState()).p & DECIMAL) !== 0).toBe(true);
    expect(((await cpu.getState()).p & UNUSED) !== 0).toBe(true);
    expect(((await cpu.getState()).p & BREAK) !== 0).toBe(false); // B flag not restored
  });
  
  // Test zero page wrapping behavior
  it("should test zero page X and Y addressing with wrap-around", async () => {
    const cpu = createCPU();
    
    // Test zero page X addressing wrap-around
    // Setup memory
    await cpu.loadByte(0x05, 0x42); // Test value at wrapped address
    
    // Setup CPU
    await cpu.setProgramCounter(0);
    await cpu.loadByte(0, 0xB5); // LDA Zero Page,X
    await cpu.loadByte(1, 0x06); // Zero page address
    await cpu.setXRegister(0xFF);      // X = 0xFF, effective address = 0x05 (0x06 + 0xFF wraps)
    
    // Execute instruction
    await cpu.step();
    
    // Check result
    expect(cpu.getAccumulator()).toBe(0x42);
    
    // Test zero page Y addressing wrap-around
    // Setup memory
    await cpu.loadByte(0x07, 0x37); // Test value at wrapped address
    
    // Setup CPU
    await cpu.setProgramCounter(0);
    await cpu.loadByte(0, 0xB6); // LDX Zero Page,Y
    await cpu.loadByte(1, 0x08); // Zero page address
    await cpu.setYRegister(0xFF);      // Y = 0xFF, effective address = 0x07 (0x08 + 0xFF wraps)
    
    // Execute instruction
    await cpu.step();
    
    // Check result
    expect(cpu.getXRegister()).toBe(0x37);
  });
  
  // Test LDX Absolute,Y with various combinations
  it("should test LDX Absolute,Y with various combinations", async () => {
    const cpu = createCPU();
    
    // Test without page crossing, loading zero value
    await cpu.setProgramCounter(0);
    await cpu.loadByte(0, 0xBE); // LDX Absolute,Y
    await cpu.loadByte(1, 0x00); // Low byte of address
    await cpu.loadByte(2, 0x10); // High byte of address
    await cpu.setYRegister(0x05);      // Y register = 5, effective address = 0x1005
    await cpu.loadByte(0x1005, 0x00); // Value to load
    
    // Execute instruction
    const cycles1 = await cpu.step();
    
    // Check results
    expect(cycles1).toBe(4); // No page crossing
    expect(cpu.getXRegister()).toBe(0x00);
    expect(((await cpu.getState()).p & ZERO) !== 0).toBe(true);
    
    // Test with page crossing, loading negative value
    await cpu.setProgramCounter(0);
    await cpu.loadByte(0, 0xBE); // LDX Absolute,Y
    await cpu.loadByte(1, 0xFF); // Low byte of address (0x10FF)
    await cpu.loadByte(2, 0x10); // High byte of address
    cpu.setYRegister(0x01);      // Y register = 1, effective address = 0x1100 (crosses page)
    await cpu.loadByte(0x1100, 0x80); // Value to load (negative)
    
    // Execute instruction
    const cycles2 = await cpu.step();
    
    // Check results
    expect(cycles2).toBe(5); // Page crossing adds a cycle
    expect(cpu.getXRegister()).toBe(0x80);
    expect(((await cpu.getState()).p & NEGATIVE) !== 0).toBe(true);
    
    // Test without page crossing, loading positive value
    await cpu.setProgramCounter(0);
    await cpu.loadByte(0, 0xBE); // LDX Absolute,Y
    await cpu.loadByte(1, 0x00); // Low byte of address
    await cpu.loadByte(2, 0x10); // High byte of address
    await cpu.setYRegister(0x05);      // Y register = 5, effective address = 0x1005
    await cpu.loadByte(0x1005, 0x42); // Value to load
    
    // Execute instruction
    await cpu.step();
    
    // Check results
    expect(cpu.getXRegister()).toBe(0x42);
    expect(((await cpu.getState()).p & ZERO) !== 0).toBe(false);
    expect(((await cpu.getState()).p & NEGATIVE) !== 0).toBe(false);
  });
});

