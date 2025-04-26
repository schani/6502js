import { describe, expect, it } from "bun:test";
import { createCPU, step6502, CARRY, ZERO, NEGATIVE } from "./utils";

describe("Shift and rotate instructions", () => {
  it("should perform ASL A instruction", () => {
    const cpu = createCPU();
    
    // Set up CPU state
    cpu.a = 0x41; // 01000001
    
    // Set up memory
    cpu.mem[0] = 0x0A; // ASL A
    
    const cycles = step6502(cpu);
    
    expect(cpu.a).toBe(0x82); // 10000010
    expect(cpu.p & CARRY).toBe(0); // Bit 7 was 0
    expect(cpu.p & NEGATIVE).toBe(NEGATIVE); // Result has bit 7 set
    expect(cpu.pc).toBe(1);
    expect(cycles).toBe(2);
    
    // Test with carry out
    cpu.pc = 0;
    cpu.a = 0x81; // 10000001
    
    step6502(cpu);
    
    expect(cpu.a).toBe(0x02); // 00000010
    expect(cpu.p & CARRY).toBe(CARRY); // Bit 7 was 1
    expect(cpu.p & ZERO).toBe(0); // Result is not zero
  });
  
  it("should perform ASL zero page instruction", () => {
    const cpu = createCPU();
    
    // Set up memory
    cpu.mem[0] = 0x06; // ASL zero page
    cpu.mem[1] = 0x42; // Zero page address
    cpu.mem[0x42] = 0x41; // Value to shift
    
    const cycles = step6502(cpu);
    
    expect(cpu.mem[0x42]).toBe(0x82); // 10000010
    expect(cpu.p & CARRY).toBe(0); // Bit 7 was 0
    expect(cpu.p & NEGATIVE).toBe(NEGATIVE); // Result has bit 7 set
    expect(cpu.pc).toBe(2);
    expect(cycles).toBe(5);
  });
  
  it("should perform ASL absolute instruction", () => {
    const cpu = createCPU();
    
    // Set up memory
    cpu.mem[0] = 0x0E; // ASL absolute
    cpu.mem[1] = 0x34; // Low byte of address
    cpu.mem[2] = 0x12; // High byte of address
    cpu.mem[0x1234] = 0x41; // Value to shift
    
    const cycles = step6502(cpu);
    
    expect(cpu.mem[0x1234]).toBe(0x82); // 10000010
    expect(cpu.p & CARRY).toBe(0); // Bit 7 was 0
    expect(cpu.p & NEGATIVE).toBe(NEGATIVE); // Result has bit 7 set
    expect(cpu.pc).toBe(3);
    expect(cycles).toBe(6);
  });
  
  it("should perform LSR A instruction", () => {
    const cpu = createCPU();
    
    // Set up CPU state
    cpu.a = 0x41; // 01000001
    
    // Set up memory
    cpu.mem[0] = 0x4A; // LSR A
    
    const cycles = step6502(cpu);
    
    expect(cpu.a).toBe(0x20); // 00100000
    expect(cpu.p & CARRY).toBe(CARRY); // Bit 0 was 1
    expect(cpu.p & NEGATIVE).toBe(0); // Bit 7 is always cleared
    expect(cpu.pc).toBe(1);
    expect(cycles).toBe(2);
    
    // Test with zero result
    cpu.pc = 0;
    cpu.a = 0x01; // 00000001
    
    step6502(cpu);
    
    expect(cpu.a).toBe(0x00); // 00000000
    expect(cpu.p & CARRY).toBe(CARRY); // Bit 0 was 1
    expect(cpu.p & ZERO).toBe(ZERO); // Result is zero
  });
  
  it("should perform LSR zero page instruction", () => {
    const cpu = createCPU();
    
    // Set up memory
    cpu.mem[0] = 0x46; // LSR zero page
    cpu.mem[1] = 0x42; // Zero page address
    cpu.mem[0x42] = 0x41; // Value to shift
    
    const cycles = step6502(cpu);
    
    expect(cpu.mem[0x42]).toBe(0x20); // 00100000
    expect(cpu.p & CARRY).toBe(CARRY); // Bit 0 was 1
    expect(cpu.p & NEGATIVE).toBe(0); // Bit 7 is always cleared
    expect(cpu.pc).toBe(2);
    expect(cycles).toBe(5);
  });
  
  it("should perform LSR absolute instruction", () => {
    const cpu = createCPU();
    
    // Set up memory
    cpu.mem[0] = 0x4E; // LSR absolute
    cpu.mem[1] = 0x34; // Low byte of address
    cpu.mem[2] = 0x12; // High byte of address
    cpu.mem[0x1234] = 0x41; // Value to shift
    
    const cycles = step6502(cpu);
    
    expect(cpu.mem[0x1234]).toBe(0x20); // 00100000
    expect(cpu.p & CARRY).toBe(CARRY); // Bit 0 was 1
    expect(cpu.p & NEGATIVE).toBe(0); // Bit 7 is always cleared
    expect(cpu.pc).toBe(3);
    expect(cycles).toBe(6);
  });
  
  it("should perform ROL A instruction", () => {
    const cpu = createCPU();
    
    // Set up CPU state
    cpu.a = 0x41; // 01000001
    cpu.p &= ~CARRY; // Clear carry flag
    
    // Set up memory
    cpu.mem[0] = 0x2A; // ROL A
    
    const cycles = step6502(cpu);
    
    expect(cpu.a).toBe(0x82); // 10000010
    expect(cpu.p & CARRY).toBe(0); // Old bit 7 was 0
    expect(cpu.p & NEGATIVE).toBe(NEGATIVE); // Result has bit 7 set
    expect(cpu.pc).toBe(1);
    expect(cycles).toBe(2);
    
    // Test with carry in and out
    cpu.pc = 0;
    cpu.a = 0x81; // 10000001
    cpu.p |= CARRY; // Set carry flag
    
    step6502(cpu);
    
    expect(cpu.a).toBe(0x03); // 00000011 (carry in becomes bit 0)
    expect(cpu.p & CARRY).toBe(CARRY); // Old bit 7 was 1
    expect(cpu.p & ZERO).toBe(0); // Result is not zero
  });
  
  it("should perform ROL zero page instruction", () => {
    const cpu = createCPU();
    
    // Set up CPU state
    cpu.p &= ~CARRY; // Clear carry flag
    
    // Set up memory
    cpu.mem[0] = 0x26; // ROL zero page
    cpu.mem[1] = 0x42; // Zero page address
    cpu.mem[0x42] = 0x41; // Value to rotate
    
    const cycles = step6502(cpu);
    
    expect(cpu.mem[0x42]).toBe(0x82); // 10000010
    expect(cpu.p & CARRY).toBe(0); // Old bit 7 was 0
    expect(cpu.p & NEGATIVE).toBe(NEGATIVE); // Result has bit 7 set
    expect(cpu.pc).toBe(2);
    expect(cycles).toBe(5);
  });
  
  it("should perform ROL absolute instruction", () => {
    const cpu = createCPU();
    
    // Set up CPU state
    cpu.p &= ~CARRY; // Clear carry flag
    
    // Set up memory
    cpu.mem[0] = 0x2E; // ROL absolute
    cpu.mem[1] = 0x34; // Low byte of address
    cpu.mem[2] = 0x12; // High byte of address
    cpu.mem[0x1234] = 0x41; // Value to rotate
    
    const cycles = step6502(cpu);
    
    expect(cpu.mem[0x1234]).toBe(0x82); // 10000010
    expect(cpu.p & CARRY).toBe(0); // Old bit 7 was 0
    expect(cpu.p & NEGATIVE).toBe(NEGATIVE); // Result has bit 7 set
    expect(cpu.pc).toBe(3);
    expect(cycles).toBe(6);
  });
  
  it("should perform ROR A instruction", () => {
    const cpu = createCPU();
    
    // Set up CPU state
    cpu.a = 0x41; // 01000001
    cpu.p &= ~CARRY; // Clear carry flag
    
    // Set up memory
    cpu.mem[0] = 0x6A; // ROR A
    
    const cycles = step6502(cpu);
    
    expect(cpu.a).toBe(0x20); // 00100000
    expect(cpu.p & CARRY).toBe(CARRY); // Old bit 0 was 1
    expect(cpu.p & NEGATIVE).toBe(0); // Result has bit 7 clear
    expect(cpu.pc).toBe(1);
    expect(cycles).toBe(2);
    
    // Test with carry in
    cpu.pc = 0;
    cpu.a = 0x01; // 00000001
    cpu.p |= CARRY; // Set carry flag
    
    step6502(cpu);
    
    expect(cpu.a).toBe(0x80); // 10000000 (carry in becomes bit 7)
    expect(cpu.p & CARRY).toBe(CARRY); // Old bit 0 was 1
    expect(cpu.p & NEGATIVE).toBe(NEGATIVE); // Result has bit 7 set
  });
  
  it("should perform ROR zero page instruction", () => {
    const cpu = createCPU();
    
    // Set up CPU state
    cpu.p &= ~CARRY; // Clear carry flag
    
    // Set up memory
    cpu.mem[0] = 0x66; // ROR zero page
    cpu.mem[1] = 0x42; // Zero page address
    cpu.mem[0x42] = 0x41; // Value to rotate
    
    const cycles = step6502(cpu);
    
    expect(cpu.mem[0x42]).toBe(0x20); // 00100000
    expect(cpu.p & CARRY).toBe(CARRY); // Old bit 0 was 1
    expect(cpu.p & NEGATIVE).toBe(0); // Result has bit 7 clear
    expect(cpu.pc).toBe(2);
    expect(cycles).toBe(5);
  });
  
  it("should perform ROR absolute instruction", () => {
    const cpu = createCPU();
    
    // Set up CPU state
    cpu.p &= ~CARRY; // Clear carry flag
    
    // Set up memory
    cpu.mem[0] = 0x6E; // ROR absolute
    cpu.mem[1] = 0x34; // Low byte of address
    cpu.mem[2] = 0x12; // High byte of address
    cpu.mem[0x1234] = 0x41; // Value to rotate
    
    const cycles = step6502(cpu);
    
    expect(cpu.mem[0x1234]).toBe(0x20); // 00100000
    expect(cpu.p & CARRY).toBe(CARRY); // Old bit 0 was 1
    expect(cpu.p & NEGATIVE).toBe(0); // Result has bit 7 clear
    expect(cpu.pc).toBe(3);
    expect(cycles).toBe(6);
  });
  
  it("should handle ASL with zero result", () => {
    const cpu = createCPU();
    
    // Set up CPU state
    cpu.a = 0x80; // 10000000
    
    // Set up memory
    cpu.mem[0] = 0x0A; // ASL A
    
    const cycles = step6502(cpu);
    
    expect(cpu.a).toBe(0x00); // 00000000
    expect(cpu.p & CARRY).toBe(CARRY); // Bit 7 was 1
    expect(cpu.p & ZERO).toBe(ZERO); // Result is zero
    expect(cpu.p & NEGATIVE).toBe(0); // Result is not negative
    expect(cpu.pc).toBe(1);
    expect(cycles).toBe(2);
  });
});
