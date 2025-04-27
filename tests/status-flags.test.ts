import { describe, expect, it } from "bun:test";
import { CPU1, CARRY, INTERRUPT, DECIMAL, OVERFLOW } from "../6502";

describe("Status flag instructions", () => {
  it("should perform CLC instruction", () => {
    const cpu = new CPU1();
    
    // Set up CPU state
    cpu.setStatusFlag(CARRY); // Set carry flag
    
    // Set up memory
    cpu.loadByte(0, 0x18); // CLC
    cpu.setProgramCounter(0);
    
    const cycles = cpu.step();
    
    expect(cpu.isStatusFlagSet(CARRY)).toBe(false); // Carry should be cleared
    expect(cpu.getProgramCounter()).toBe(1);
    expect(cycles).toBe(2);
  });
  
  it("should perform SEC instruction", () => {
    const cpu = new CPU1();
    
    // Set up CPU state
    cpu.clearStatusFlag(CARRY); // Clear carry flag
    
    // Set up memory
    cpu.loadByte(0, 0x38); // SEC
    cpu.setProgramCounter(0);
    
    const cycles = cpu.step();
    
    expect(cpu.isStatusFlagSet(CARRY)).toBe(true); // Carry should be set
    expect(cpu.getProgramCounter()).toBe(1);
    expect(cycles).toBe(2);
  });
  
  it("should perform CLI instruction", () => {
    const cpu = new CPU1();
    
    // Set up CPU state
    cpu.setStatusFlag(INTERRUPT); // Set interrupt disable flag
    
    // Set up memory
    cpu.loadByte(0, 0x58); // CLI
    cpu.setProgramCounter(0);
    
    const cycles = cpu.step();
    
    expect(cpu.isStatusFlagSet(INTERRUPT)).toBe(false); // Interrupt disable should be cleared
    expect(cpu.getProgramCounter()).toBe(1);
    expect(cycles).toBe(2);
  });
  
  it("should perform SEI instruction", () => {
    const cpu = new CPU1();
    
    // Set up CPU state
    cpu.clearStatusFlag(INTERRUPT); // Clear interrupt disable flag
    
    // Set up memory
    cpu.loadByte(0, 0x78); // SEI
    cpu.setProgramCounter(0);
    
    const cycles = cpu.step();
    
    expect(cpu.isStatusFlagSet(INTERRUPT)).toBe(true); // Interrupt disable should be set
    expect(cpu.getProgramCounter()).toBe(1);
    expect(cycles).toBe(2);
  });
  
  it("should perform CLD instruction", () => {
    const cpu = new CPU1();
    
    // Set up CPU state
    cpu.setStatusFlag(DECIMAL); // Set decimal flag
    
    // Set up memory
    cpu.loadByte(0, 0xD8); // CLD
    cpu.setProgramCounter(0);
    
    const cycles = cpu.step();
    
    expect(cpu.isStatusFlagSet(DECIMAL)).toBe(false); // Decimal flag should be cleared
    expect(cpu.getProgramCounter()).toBe(1);
    expect(cycles).toBe(2);
  });
  
  it("should perform SED instruction", () => {
    const cpu = new CPU1();
    
    // Set up CPU state
    cpu.clearStatusFlag(DECIMAL); // Clear decimal flag
    
    // Set up memory
    cpu.loadByte(0, 0xF8); // SED
    cpu.setProgramCounter(0);
    
    const cycles = cpu.step();
    
    expect(cpu.isStatusFlagSet(DECIMAL)).toBe(true); // Decimal flag should be set
    expect(cpu.getProgramCounter()).toBe(1);
    expect(cycles).toBe(2);
  });
  
  it("should perform CLV instruction", () => {
    const cpu = new CPU1();
    
    // Set up CPU state
    cpu.setStatusFlag(OVERFLOW); // Set overflow flag
    
    // Set up memory
    cpu.loadByte(0, 0xB8); // CLV
    cpu.setProgramCounter(0);
    
    const cycles = cpu.step();
    
    expect(cpu.isStatusFlagSet(OVERFLOW)).toBe(false); // Overflow flag should be cleared
    expect(cpu.getProgramCounter()).toBe(1);
    expect(cycles).toBe(2);
  });
});
