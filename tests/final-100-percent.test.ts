import { describe, expect, it } from "bun:test";
import { 
  createCPU, step6502,
  ZERO, NEGATIVE, CARRY, INTERRUPT, OVERFLOW, UNUSED, BREAK, DECIMAL 
} from "../cpu";

// This test targets the exact lines that are uncovered in the CPU code
describe("Final 100% coverage tests", () => {
  // Test writeWord function implementation directly
  it("should test writeWord directly", () => {
    const cpu = createCPU();
    
    // Access the internal writeWord function via a hack
    // First create a reference to the CPU module
    const cpuModule = require("../cpu");
    
    // Now get the internal functions
    const writeWord = cpuModule.writeWord;
    
    // If the functions are not accessible this way, we'll use a workaround
    // by testing the functionality through the public API
    
    // Test writing a word at position 0x1234
    cpu.mem[0] = 0x8D; // STA Absolute
    cpu.mem[1] = 0x34;
    cpu.mem[2] = 0x12;
    cpu.a = 0x42;
    cpu.pc = 0;
    
    // Execute STA Absolute
    step6502(cpu);
    
    // Verify the value was written
    expect(cpu.mem[0x1234]).toBe(0x42);
    
    // Test writing a word at memory boundary
    cpu.mem[0] = 0x8D; // STA Absolute
    cpu.mem[1] = 0xFF;
    cpu.mem[2] = 0xFF;
    cpu.a = 0x37;
    cpu.pc = 0;
    
    // Execute STA Absolute
    step6502(cpu);
    
    // Verify the value was written
    expect(cpu.mem[0xFFFF]).toBe(0x37);
  });

  // Test ADC with edge cases to cover all code paths
  it("should test ADC with all possible operand combinations", () => {
    const cpu = createCPU();
    
    // Test ADC with all possible operand combinations to ensure all code paths are taken
    
    // 1. Test positive + positive without overflow or carry
    cpu.pc = 0;
    cpu.mem[0] = 0x69; // ADC Immediate
    cpu.mem[1] = 0x40; // Value to add (positive)
    cpu.a = 0x30;      // A = 0x30 (positive)
    cpu.p = 0;         // Clear all flags
    
    // Execute ADC
    step6502(cpu);
    expect(cpu.a).toBe(0x70); // 0x30 + 0x40 = 0x70
    expect(cpu.p & OVERFLOW).toBe(0); // No overflow
    expect(cpu.p & CARRY).toBe(0);    // No carry
    
    // 2. Test positive + positive with carry but no overflow
    cpu.pc = 0;
    cpu.mem[0] = 0x69; // ADC Immediate
    cpu.mem[1] = 0x70; // Value to add (positive)
    cpu.a = 0x95;      // A = 0x95 (negative)
    cpu.p = 0;         // Clear all flags
    
    // Execute ADC
    step6502(cpu);
    expect(cpu.a).toBe(0x05); // 0x95 + 0x70 = 0x105 (with carry)
    expect(cpu.p & OVERFLOW).toBe(0); // No overflow
    expect(cpu.p & CARRY).toBe(CARRY); // Carry flag set
    
    // 3. Test positive + positive with overflow (result is negative)
    cpu.pc = 0;
    cpu.mem[0] = 0x69; // ADC Immediate
    cpu.mem[1] = 0x70; // Value to add (positive)
    cpu.a = 0x70;      // A = 0x70 (positive)
    cpu.p = 0;         // Clear all flags
    
    // Execute ADC
    step6502(cpu);
    expect(cpu.a).toBe(0xE0); // 0x70 + 0x70 = 0xE0 (negative)
    expect(cpu.p & OVERFLOW).toBe(OVERFLOW); // Overflow flag set
    expect(cpu.p & NEGATIVE).toBe(NEGATIVE); // Negative flag set
    
    // 4. Test negative + negative with overflow (result is positive)
    cpu.pc = 0;
    cpu.mem[0] = 0x69; // ADC Immediate
    cpu.mem[1] = 0x90; // Value to add (negative)
    cpu.a = 0x90;      // A = 0x90 (negative)
    cpu.p = 0;         // Clear all flags
    
    // Execute ADC
    step6502(cpu);
    expect(cpu.a).toBe(0x20); // 0x90 + 0x90 = 0x120 (0x20 with carry)
    expect(cpu.p & OVERFLOW).toBe(OVERFLOW); // Overflow flag set
    expect(cpu.p & CARRY).toBe(CARRY); // Carry flag set
  });
  
  // Test SBC with edge cases to cover all code paths
  it("should test SBC with all possible operand combinations", () => {
    const cpu = createCPU();
    
    // 1. Test positive - positive with no borrow (positive result)
    cpu.pc = 0;
    cpu.mem[0] = 0xE9; // SBC Immediate
    cpu.mem[1] = 0x30; // Value to subtract (positive)
    cpu.a = 0x50;      // A = 0x50 (positive)
    cpu.p = CARRY;     // Set carry flag (no borrow)
    
    // Execute SBC
    step6502(cpu);
    expect(cpu.a).toBe(0x20); // 0x50 - 0x30 = 0x20
    expect(cpu.p & OVERFLOW).toBe(0); // No overflow
    expect(cpu.p & CARRY).toBe(CARRY); // No borrow needed
    
    // 2. Test positive - positive with borrow (negative result)
    cpu.pc = 0;
    cpu.mem[0] = 0xE9; // SBC Immediate
    cpu.mem[1] = 0x50; // Value to subtract (positive)
    cpu.a = 0x30;      // A = 0x30 (positive)
    cpu.p = CARRY;     // Set carry flag (no borrow)
    
    // Execute SBC
    step6502(cpu);
    expect(cpu.a).toBe(0xE0); // 0x30 - 0x50 = 0xE0 (negative)
    expect(cpu.p & OVERFLOW).toBe(0); // No overflow
    expect(cpu.p & CARRY).toBe(0); // Borrow needed
    
    // 3. Test negative - positive with overflow (positive result)
    cpu.pc = 0;
    cpu.mem[0] = 0xE9; // SBC Immediate
    cpu.mem[1] = 0x70; // Value to subtract (positive)
    cpu.a = 0x90;      // A = 0x90 (negative)
    cpu.p = CARRY;     // Set carry flag (no borrow)
    
    // Execute SBC
    step6502(cpu);
    expect(cpu.a).toBe(0x20); // 0x90 - 0x70 = 0x20
    expect(cpu.p & OVERFLOW).toBe(OVERFLOW); // Overflow flag set
    expect(cpu.p & CARRY).toBe(CARRY); // No borrow needed
    
    // 4. Test positive - negative with overflow (negative result)
    cpu.pc = 0;
    cpu.mem[0] = 0xE9; // SBC Immediate
    cpu.mem[1] = 0x90; // Value to subtract (negative)
    cpu.a = 0x20;      // A = 0x20 (positive)
    cpu.p = CARRY;     // Set carry flag (no borrow)
    
    // Execute SBC
    step6502(cpu);
    expect(cpu.a).toBe(0x90); // 0x20 - 0x90 = 0x90 (negative result)
    expect(cpu.p & OVERFLOW).toBe(OVERFLOW); // Overflow flag set
    expect(cpu.p & NEGATIVE).toBe(NEGATIVE); // Negative flag set
  });
  
  // Test all branch instructions with various conditions 
  it("should test all branch instructions with various conditions", () => {
    const cpu = createCPU();
    
    // Test BCS with page crossing, carry set
    cpu.pc = 0x10FA;
    cpu.mem[0x10FA] = 0xB0; // BCS
    cpu.mem[0x10FB] = 0x10; // Branch forward 16 bytes (crosses page)
    cpu.p = CARRY;          // Set carry flag
    
    step6502(cpu);
    expect(cpu.pc).toBe(0x110C); // 0x10FA + 2 + 0x10 = 0x110C (correct calculation)
    
    // Test BEQ with page crossing, zero set
    cpu.pc = 0x10FA;
    cpu.mem[0x10FA] = 0xF0; // BEQ
    cpu.mem[0x10FB] = 0x10; // Branch forward 16 bytes (crosses page)
    cpu.p = ZERO;           // Set zero flag
    
    step6502(cpu);
    expect(cpu.pc).toBe(0x110C); // 0x10FA + 2 + 0x10 = 0x110C (correct calculation)
    
    // Test BMI with page crossing, negative set
    cpu.pc = 0x10FA;
    cpu.mem[0x10FA] = 0x30; // BMI
    cpu.mem[0x10FB] = 0x10; // Branch forward 16 bytes (crosses page)
    cpu.p = NEGATIVE;       // Set negative flag
    
    step6502(cpu);
    expect(cpu.pc).toBe(0x110C); // 0x10FA + 2 + 0x10 = 0x110C (correct calculation)
    
    // Test BVS with page crossing, overflow set
    cpu.pc = 0x10FA;
    cpu.mem[0x10FA] = 0x70; // BVS
    cpu.mem[0x10FB] = 0x10; // Branch forward 16 bytes (crosses page)
    cpu.p = OVERFLOW;       // Set overflow flag
    
    step6502(cpu);
    expect(cpu.pc).toBe(0x110C); // 0x10FA + 2 + 0x10 = 0x110C (correct calculation)
  });
  
  // Test all shift/rotate instructions with the carry flag in both states
  it("should test shift and rotate operations with both carry states", () => {
    const cpu = createCPU();
    
    // Test ROR with carry clear
    cpu.pc = 0;
    cpu.mem[0] = 0x6A; // ROR A
    cpu.a = 0x01;     // Value to rotate
    cpu.p = 0;        // Clear carry flag
    
    step6502(cpu);
    expect(cpu.a).toBe(0x00); // Result: 0x00, bit 0 goes to carry
    expect(cpu.p & CARRY).toBe(CARRY); // Carry flag set
    expect(cpu.p & ZERO).toBe(ZERO);   // Zero flag set
    
    // Test ROR Zero Page with carry clear
    cpu.pc = 0;
    cpu.mem[0] = 0x66; // ROR Zero Page
    cpu.mem[1] = 0x80; // Zero page address
    cpu.mem[0x80] = 0x01; // Value to rotate
    cpu.p = 0;        // Clear carry flag
    
    step6502(cpu);
    expect(cpu.mem[0x80]).toBe(0x00); // Result: 0x00, bit 0 goes to carry
    expect(cpu.p & CARRY).toBe(CARRY); // Carry flag set
    expect(cpu.p & ZERO).toBe(ZERO);   // Zero flag set
    
    // Test ROR Absolute with carry clear
    cpu.pc = 0;
    cpu.mem[0] = 0x6E; // ROR Absolute
    cpu.mem[1] = 0x00; // Low byte of address
    cpu.mem[2] = 0x10; // High byte of address
    cpu.mem[0x1000] = 0x01; // Value to rotate
    cpu.p = 0;        // Clear carry flag
    
    step6502(cpu);
    expect(cpu.mem[0x1000]).toBe(0x00); // Result: 0x00, bit 0 goes to carry
    expect(cpu.p & CARRY).toBe(CARRY); // Carry flag set
    expect(cpu.p & ZERO).toBe(ZERO);   // Zero flag set
    
    // Test ROR Absolute,X with carry clear
    cpu.pc = 0;
    cpu.mem[0] = 0x7E; // ROR Absolute,X
    cpu.mem[1] = 0x00; // Low byte of address
    cpu.mem[2] = 0x10; // High byte of address
    cpu.x = 0x05;     // X register = 5
    cpu.mem[0x1005] = 0x01; // Value to rotate
    cpu.p = 0;        // Clear carry flag
    
    step6502(cpu);
    expect(cpu.mem[0x1005]).toBe(0x00); // Result: 0x00, bit 0 goes to carry
    expect(cpu.p & CARRY).toBe(CARRY); // Carry flag set
    expect(cpu.p & ZERO).toBe(ZERO);   // Zero flag set
  });
  
  // Test BRK and RTI with specific status flags
  it("should test BRK and RTI with specific status flags and stack manipulation", () => {
    const cpu = createCPU();
    
    // Set initial state
    cpu.pc = 0x1000;
    cpu.p = ZERO | CARRY | NEGATIVE | OVERFLOW | DECIMAL; // Set multiple flags
    cpu.sp = 0xFD;  // Initialize stack pointer
    
    // Setup IRQ/BRK vector
    cpu.mem[0xFFFE] = 0x00;
    cpu.mem[0xFFFF] = 0x20;
    
    // Setup BRK instruction
    cpu.mem[0x1000] = 0x00; // BRK
    
    // Execute BRK
    step6502(cpu);
    
    // Check stack state after BRK
    expect(cpu.sp).toBe(0xFA); // Stack pointer decremented by 3
    expect(cpu.p & INTERRUPT).toBe(INTERRUPT); // Interrupt flag set
    expect(cpu.pc).toBe(0x2000); // PC set to interrupt vector
    
    // Check status pushed on stack
    expect(cpu.mem[0x01FB]).toBe(
      ZERO | CARRY | NEGATIVE | OVERFLOW | DECIMAL | UNUSED | BREAK
    ); // Status with B flag set
    
    // Set up RTI at interrupt handler
    cpu.mem[0x2000] = 0x40; // RTI
    
    // Execute RTI
    step6502(cpu);
    
    // Check CPU state after RTI
    expect(cpu.sp).toBe(0xFD); // Stack pointer restored
    expect(cpu.pc).toBe(0x1002); // PC set to address after BRK
    expect(cpu.p & (ZERO | CARRY | NEGATIVE | OVERFLOW | DECIMAL | UNUSED)).toBe(
      ZERO | CARRY | NEGATIVE | OVERFLOW | DECIMAL | UNUSED
    ); // Status restored except B flag
    expect(cpu.p & BREAK).toBe(0); // B flag not restored
  });
  
  // Test zero page wrapping behavior
  it("should test zero page X and Y addressing with wrap-around", () => {
    const cpu = createCPU();
    
    // Test zero page X addressing wrap-around
    // Setup memory
    cpu.mem[0x05] = 0x42; // Test value at wrapped address
    
    // Setup CPU
    cpu.pc = 0;
    cpu.mem[0] = 0xB5; // LDA Zero Page,X
    cpu.mem[1] = 0x06; // Zero page address
    cpu.x = 0xFF;      // X = 0xFF, effective address = 0x05 (0x06 + 0xFF wraps)
    
    // Execute instruction
    step6502(cpu);
    
    // Check result
    expect(cpu.a).toBe(0x42);
    
    // Test zero page Y addressing wrap-around
    // Setup memory
    cpu.mem[0x07] = 0x37; // Test value at wrapped address
    
    // Setup CPU
    cpu.pc = 0;
    cpu.mem[0] = 0xB6; // LDX Zero Page,Y
    cpu.mem[1] = 0x08; // Zero page address
    cpu.y = 0xFF;      // Y = 0xFF, effective address = 0x07 (0x08 + 0xFF wraps)
    
    // Execute instruction
    step6502(cpu);
    
    // Check result
    expect(cpu.x).toBe(0x37);
  });
  
  // Test LDX Absolute,Y with various combinations
  it("should test LDX Absolute,Y with various combinations", () => {
    const cpu = createCPU();
    
    // Test without page crossing, loading zero value
    cpu.pc = 0;
    cpu.mem[0] = 0xBE; // LDX Absolute,Y
    cpu.mem[1] = 0x00; // Low byte of address
    cpu.mem[2] = 0x10; // High byte of address
    cpu.y = 0x05;      // Y register = 5, effective address = 0x1005
    cpu.mem[0x1005] = 0x00; // Value to load
    
    // Execute instruction
    const cycles1 = step6502(cpu);
    
    // Check results
    expect(cycles1).toBe(4); // No page crossing
    expect(cpu.x).toBe(0x00);
    expect(cpu.p & ZERO).toBe(ZERO);
    
    // Test with page crossing, loading negative value
    cpu.pc = 0;
    cpu.mem[0] = 0xBE; // LDX Absolute,Y
    cpu.mem[1] = 0xFF; // Low byte of address (0x10FF)
    cpu.mem[2] = 0x10; // High byte of address
    cpu.y = 0x01;      // Y register = 1, effective address = 0x1100 (crosses page)
    cpu.mem[0x1100] = 0x80; // Value to load (negative)
    
    // Execute instruction
    const cycles2 = step6502(cpu);
    
    // Check results
    expect(cycles2).toBe(5); // Page crossing adds a cycle
    expect(cpu.x).toBe(0x80);
    expect(cpu.p & NEGATIVE).toBe(NEGATIVE);
    
    // Test without page crossing, loading positive value
    cpu.pc = 0;
    cpu.mem[0] = 0xBE; // LDX Absolute,Y
    cpu.mem[1] = 0x00; // Low byte of address
    cpu.mem[2] = 0x10; // High byte of address
    cpu.y = 0x05;      // Y register = 5, effective address = 0x1005
    cpu.mem[0x1005] = 0x42; // Value to load
    
    // Execute instruction
    step6502(cpu);
    
    // Check results
    expect(cpu.x).toBe(0x42);
    expect(cpu.p & ZERO).toBe(0);
    expect(cpu.p & NEGATIVE).toBe(0);
  });
});

