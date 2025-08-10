import { describe, expect, it } from "bun:test";
import { CPU1 } from "../6502";

describe("Memory helper functions for 100% coverage", () => {
  it("should test writeWord directly", async () => {
    const cpu = new CPU1();
    
    // First make sure the memory is zeroed
    expect(await cpu.readByte(0x1000)).toBe(0);
    expect(await cpu.readByte(0x1001)).toBe(0);
    
    // Now test writing a word at address 0x1000
    // We can use the loadWord method directly
    await cpu.loadWord(0x1000, 0x1234);
    
    // Check if the word was written correctly
    expect(await cpu.readByte(0x1000)).toBe(0x34); // Low byte
    expect(await cpu.readByte(0x1001)).toBe(0x12); // High byte
    
    // Test writing a word at a page boundary (0xFFFF-0x0000)
    await cpu.loadWord(0xFFFF, 0x7856);
    
    // Check if the word was written correctly across the boundary
    expect(await cpu.readByte(0xFFFF)).toBe(0x56); // Low byte
    expect(await cpu.readByte(0x0000)).toBe(0x78); // High byte
  });
  
  it("should test zero page X addressing with wrap around", () => {
    const cpu = new CPU1();
    
    // Set up a value in zero page
    cpu.loadByte(0x80, 0x42);
    
    // Setup CPU for LDA Zero Page,X with wrap-around
    cpu.setProgramCounter(0);
    cpu.loadByte(0, 0xB5); // LDA Zero Page,X
    cpu.loadByte(1, 0xFF); // Zero page address 0xFF
    cpu.setXRegister(0x81); // X = 0x81, effective address = 0x80 (wrapped around from 0xFF + 0x81)
    
    // Execute LDA
    cpu.step();
    
    // Check if the correct value was loaded
    expect(cpu.getAccumulator()).toBe(0x42);
  });
  
  it("should test zero page Y addressing with wrap around", () => {
    const cpu = new CPU1();
    
    // Set up a value in zero page
    cpu.loadByte(0x10, 0x37);
    
    // Setup CPU for LDX Zero Page,Y with wrap-around
    cpu.setProgramCounter(0);
    cpu.loadByte(0, 0xB6); // LDX Zero Page,Y
    cpu.loadByte(1, 0xF0); // Zero page address 0xF0
    cpu.setYRegister(0x20); // Y = 0x20, effective address = 0x10 (wrapped around from 0xF0 + 0x20)
    
    // Execute LDX
    cpu.step();
    
    // Check if the correct value was loaded
    expect(cpu.getXRegister()).toBe(0x37);
  });
  
  it("should test indirect addressing with page boundary bug", () => {
    const cpu = new CPU1();
    
    // Set up memory for the JMP Indirect test with page boundary bug
    // When the pointer is at a page boundary, the high byte is fetched from the same page
    
    // Set up the pointer
    cpu.loadByte(0x02FF, 0x34); // Low byte
    cpu.loadByte(0x0200, 0x12); // High byte (should be at 0x0300, but 6502 bug fetches from 0x0200)
    
    // Setup for JMP Indirect
    cpu.setProgramCounter(0);
    cpu.loadByte(0, 0x6C); // JMP Indirect
    cpu.loadByte(1, 0xFF); // Low byte of pointer (0x02FF)
    cpu.loadByte(2, 0x02); // High byte of pointer
    
    // Execute JMP
    cpu.step();
    
    // Check if PC was set correctly with the bug
    expect(cpu.getProgramCounter()).toBe(0x1234);
  });
});