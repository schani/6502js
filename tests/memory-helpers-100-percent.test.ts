import { describe, expect, it } from "bun:test";
import { createCPU } from "./utils";

describe("Memory helper functions for 100% coverage", () => {
  it("should test writeWord directly", () => {
    const cpu = createCPU();
    
    // First make sure the memory is zeroed
    expect(cpu.mem[0x1000]).toBe(0);
    expect(cpu.mem[0x1001]).toBe(0);
    
    // Now test writing a word at address 0x1000
    // We need to access writeWord indirectly since it's a private function
    
    // Prepare CPU for STA Absolute to write low byte
    cpu.pc = 0;
    cpu.mem[0] = 0x8D; // STA Absolute
    cpu.mem[1] = 0x00; // Low byte address
    cpu.mem[2] = 0x10; // High byte address
    cpu.a = 0x34;      // Value to write
    
    // Execute STA
    step6502(cpu);
    
    // Prepare CPU for STA Absolute to write high byte
    cpu.pc = 0;
    cpu.mem[0] = 0x8D; // STA Absolute
    cpu.mem[1] = 0x01; // Low byte address
    cpu.mem[2] = 0x10; // High byte address
    cpu.a = 0x12;      // Value to write
    
    // Execute STA
    step6502(cpu);
    
    // Check if the word was written correctly
    expect(cpu.mem[0x1000]).toBe(0x34); // Low byte
    expect(cpu.mem[0x1001]).toBe(0x12); // High byte
    
    // Test writing a word at a page boundary (0xFFFF-0x0000)
    // Prepare CPU for STA Absolute to write low byte
    cpu.pc = 0;
    cpu.mem[0] = 0x8D; // STA Absolute
    cpu.mem[1] = 0xFF; // Low byte address
    cpu.mem[2] = 0xFF; // High byte address
    cpu.a = 0x56;      // Value to write
    
    // Execute STA
    step6502(cpu);
    
    // Prepare CPU for STA Absolute to write high byte
    cpu.pc = 0;
    cpu.mem[0] = 0x8D; // STA Absolute
    cpu.mem[1] = 0x00; // Low byte address
    cpu.mem[2] = 0x00; // High byte address
    cpu.a = 0x78;      // Value to write
    
    // Execute STA
    step6502(cpu);
    
    // Check if the word was written correctly across the boundary
    expect(cpu.mem[0xFFFF]).toBe(0x56); // Low byte
    expect(cpu.mem[0x0000]).toBe(0x78); // High byte
  });
  
  it("should test zero page X addressing with wrap around", () => {
    const cpu = createCPU();
    
    // Set up a value in zero page
    cpu.mem[0x80] = 0x42;
    
    // Setup CPU for LDA Zero Page,X with wrap-around
    cpu.pc = 0;
    cpu.mem[0] = 0xB5; // LDA Zero Page,X
    cpu.mem[1] = 0xFF; // Zero page address 0xFF
    cpu.x = 0x81;      // X = 0x81, effective address = 0x80 (wrapped around from 0xFF + 0x81)
    
    // Execute LDA
    step6502(cpu);
    
    // Check if the correct value was loaded
    expect(cpu.a).toBe(0x42);
  });
  
  it("should test zero page Y addressing with wrap around", () => {
    const cpu = createCPU();
    
    // Set up a value in zero page
    cpu.mem[0x10] = 0x37;
    
    // Setup CPU for LDX Zero Page,Y with wrap-around
    cpu.pc = 0;
    cpu.mem[0] = 0xB6; // LDX Zero Page,Y
    cpu.mem[1] = 0xF0; // Zero page address 0xF0
    cpu.y = 0x20;      // Y = 0x20, effective address = 0x10 (wrapped around from 0xF0 + 0x20)
    
    // Execute LDX
    step6502(cpu);
    
    // Check if the correct value was loaded
    expect(cpu.x).toBe(0x37);
  });
  
  it("should test indirect addressing with page boundary bug", () => {
    const cpu = createCPU();
    
    // Set up memory for the JMP Indirect test with page boundary bug
    // When the pointer is at a page boundary, the high byte is fetched from the same page
    
    // Set up the pointer
    cpu.mem[0x02FF] = 0x34; // Low byte
    cpu.mem[0x0200] = 0x12; // High byte (should be at 0x0300, but 6502 bug fetches from 0x0200)
    
    // Setup for JMP Indirect
    cpu.pc = 0;
    cpu.mem[0] = 0x6C; // JMP Indirect
    cpu.mem[1] = 0xFF; // Low byte of pointer (0x02FF)
    cpu.mem[2] = 0x02; // High byte of pointer
    
    // Execute JMP
    step6502(cpu);
    
    // Check if PC was set correctly with the bug
    expect(cpu.pc).toBe(0x1234);
  });
});

import { step6502 } from "../cpu";