import { describe, expect, it } from "bun:test";
import { createCPU, step6502, ZERO } from "./utils";

describe("Indirect addressing modes", () => {
  it("should perform LDA indirect,X instruction", () => {
    const cpu = createCPU();
    
    // Set up CPU state
    cpu.x = 0x04;
    
    // Set up memory
    cpu.mem[0] = 0xA1; // LDA (indirect,X)
    cpu.mem[1] = 0x20; // Zero page address
    
    // Effective address stored at (zero page + X) in little endian
    cpu.mem[0x24] = 0x74; // Low byte of effective address
    cpu.mem[0x25] = 0x20; // High byte of effective address
    
    // Value at effective address
    cpu.mem[0x2074] = 0x42;
    
    const cycles = step6502(cpu);
    
    expect(cpu.a).toBe(0x42);
    expect(cpu.pc).toBe(2);
    expect(cycles).toBe(6);
  });
  
  it("should perform LDA indirect,Y instruction", () => {
    const cpu = createCPU();
    
    // Set up CPU state
    cpu.y = 0x10;
    
    // Set up memory
    cpu.mem[0] = 0xB1; // LDA (indirect),Y
    cpu.mem[1] = 0x20; // Zero page address
    
    // Effective base address stored at zero page in little endian
    cpu.mem[0x20] = 0x74; // Low byte of base address
    cpu.mem[0x21] = 0x20; // High byte of base address
    
    // Value at (base address + Y)
    cpu.mem[0x2084] = 0x42; // 0x2074 + 0x10 = 0x2084
    
    const cycles = step6502(cpu);
    
    expect(cpu.a).toBe(0x42);
    expect(cpu.pc).toBe(2);
    expect(cycles).toBe(5);
  });
  
  it("should add cycle when crossing page boundary with indirect,Y", () => {
    const cpu = createCPU();
    
    // Set up CPU state
    cpu.y = 0xFF;
    
    // Set up memory
    cpu.mem[0] = 0xB1; // LDA (indirect),Y
    cpu.mem[1] = 0x20; // Zero page address
    
    // Effective base address stored at zero page in little endian
    cpu.mem[0x20] = 0x01; // Low byte of base address
    cpu.mem[0x21] = 0x20; // High byte of base address
    
    // Value at (base address + Y) crossing page boundary
    cpu.mem[0x2100] = 0x42; // 0x2001 + 0xFF = 0x2100
    
    const cycles = step6502(cpu);
    
    expect(cpu.a).toBe(0x42);
    expect(cpu.pc).toBe(2);
    expect(cycles).toBe(6); // Extra cycle for page boundary crossing
  });
  
  it("should perform JMP indirect instruction", () => {
    const cpu = createCPU();
    
    // Set up memory
    cpu.mem[0] = 0x6C; // JMP indirect
    cpu.mem[1] = 0x20; // Low byte of pointer address
    cpu.mem[2] = 0x30; // High byte of pointer address
    
    // Target address stored at pointer in little endian
    cpu.mem[0x3020] = 0x40; // Low byte of target
    cpu.mem[0x3021] = 0x50; // High byte of target
    
    const cycles = step6502(cpu);
    
    expect(cpu.pc).toBe(0x5040); // PC should be set to target address
    expect(cycles).toBe(5);
  });
  
  // Test the 6502's indirect JMP bug when vector falls on page boundary
  it("should correctly handle JMP indirect page boundary bug", () => {
    const cpu = createCPU();
    
    // Set up memory
    cpu.mem[0] = 0x6C; // JMP indirect
    cpu.mem[1] = 0xFF; // Low byte of pointer address (page boundary)
    cpu.mem[2] = 0x30; // High byte of pointer address
    
    // Target address stored at pointer with wrap-around bug
    cpu.mem[0x30FF] = 0x40; // Low byte of target
    cpu.mem[0x3000] = 0x50; // High byte at wrap-around address (not 0x3100)
    
    const cycles = step6502(cpu);
    
    expect(cpu.pc).toBe(0x5040); // PC should be set to target address with bug behavior
    expect(cycles).toBe(5);
  });
});