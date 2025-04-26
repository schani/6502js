import { describe, expect, it } from "bun:test";
import { createCPU, step6502 } from "./utils";

describe("Store instructions", () => {
  it("should perform STA zero page instruction", () => {
    const cpu = createCPU();
    
    // Set up accumulator
    cpu.a = 0x42;
    
    // STA $30 - Store accumulator at zero page address 0x30
    cpu.mem[0] = 0x85; // STA zero page
    cpu.mem[1] = 0x30; // Zero page address
    
    const cycles = step6502(cpu);
    
    expect(cpu.mem[0x30]).toBe(0x42);
    expect(cpu.pc).toBe(2);
    expect(cycles).toBe(3);
  });
  
  it("should perform STA zero page,X instruction", () => {
    const cpu = createCPU();
    
    // Set up accumulator and X register
    cpu.a = 0x42;
    cpu.x = 0x05;
    
    // STA $30,X - Store accumulator at zero page address 0x30 + X
    cpu.mem[0] = 0x95; // STA zero page,X
    cpu.mem[1] = 0x30; // Zero page address
    
    const cycles = step6502(cpu);
    
    expect(cpu.mem[0x35]).toBe(0x42); // Value at address 0x30 + 0x05
    expect(cpu.pc).toBe(2);
    expect(cycles).toBe(4);
  });
  
  it("should perform STA absolute instruction", () => {
    const cpu = createCPU();
    
    // Set up accumulator
    cpu.a = 0x42;
    
    // STA $1234 - Store accumulator at absolute address 0x1234
    cpu.mem[0] = 0x8D; // STA absolute
    cpu.mem[1] = 0x34; // Low byte of address
    cpu.mem[2] = 0x12; // High byte of address
    
    const cycles = step6502(cpu);
    
    expect(cpu.mem[0x1234]).toBe(0x42);
    expect(cpu.pc).toBe(3);
    expect(cycles).toBe(4);
  });
  
  it("should perform STA absolute,X instruction", () => {
    const cpu = createCPU();
    
    // Set up accumulator and X register
    cpu.a = 0x42;
    cpu.x = 0x05;
    
    // STA $1234,X - Store accumulator at absolute address 0x1234 + X
    cpu.mem[0] = 0x9D; // STA absolute,X
    cpu.mem[1] = 0x34; // Low byte of address
    cpu.mem[2] = 0x12; // High byte of address
    
    const cycles = step6502(cpu);
    
    expect(cpu.mem[0x1239]).toBe(0x42); // Value at address 0x1234 + 0x05
    expect(cpu.pc).toBe(3);
    expect(cycles).toBe(5); // Always 5 cycles, regardless of page crossing
  });
  
  it("should perform STA absolute,Y instruction", () => {
    const cpu = createCPU();
    
    // Set up accumulator and Y register
    cpu.a = 0x42;
    cpu.y = 0x05;
    
    // STA $1234,Y - Store accumulator at absolute address 0x1234 + Y
    cpu.mem[0] = 0x99; // STA absolute,Y
    cpu.mem[1] = 0x34; // Low byte of address
    cpu.mem[2] = 0x12; // High byte of address
    
    const cycles = step6502(cpu);
    
    expect(cpu.mem[0x1239]).toBe(0x42); // Value at address 0x1234 + 0x05
    expect(cpu.pc).toBe(3);
    expect(cycles).toBe(5); // Always 5 cycles, regardless of page crossing
  });
  
  it("should perform STA (indirect,X) instruction", () => {
    const cpu = createCPU();
    
    // Set up accumulator and X register
    cpu.a = 0x42;
    cpu.x = 0x04;
    
    // Set up memory (pointer in zero page)
    cpu.mem[0] = 0x81; // STA (indirect,X)
    cpu.mem[1] = 0x20; // Zero page address
    
    // Effective address stored at (zero page + X) in little endian
    cpu.mem[0x24] = 0x74; // Low byte of effective address
    cpu.mem[0x25] = 0x20; // High byte of effective address
    
    const cycles = step6502(cpu);
    
    expect(cpu.mem[0x2074]).toBe(0x42); // Value at effective address
    expect(cpu.pc).toBe(2);
    expect(cycles).toBe(6);
  });
  
  it("should perform STA (indirect),Y instruction", () => {
    const cpu = createCPU();
    
    // Set up accumulator and Y register
    cpu.a = 0x42;
    cpu.y = 0x10;
    
    // Set up memory
    cpu.mem[0] = 0x91; // STA (indirect),Y
    cpu.mem[1] = 0x20; // Zero page address
    
    // Effective base address stored at zero page in little endian
    cpu.mem[0x20] = 0x74; // Low byte of base address
    cpu.mem[0x21] = 0x20; // High byte of base address
    
    const cycles = step6502(cpu);
    
    expect(cpu.mem[0x2084]).toBe(0x42); // Value at (base address + Y)
    expect(cpu.pc).toBe(2);
    expect(cycles).toBe(6); // Always 6 cycles, regardless of page crossing
  });
  
  it("should perform STX zero page instruction", () => {
    const cpu = createCPU();
    
    // Set up X register
    cpu.x = 0x42;
    
    // STX $30 - Store X register at zero page address 0x30
    cpu.mem[0] = 0x86; // STX zero page
    cpu.mem[1] = 0x30; // Zero page address
    
    const cycles = step6502(cpu);
    
    expect(cpu.mem[0x30]).toBe(0x42);
    expect(cpu.pc).toBe(2);
    expect(cycles).toBe(3);
  });
  
  it("should perform STX zero page,Y instruction", () => {
    const cpu = createCPU();
    
    // Set up X and Y registers
    cpu.x = 0x42;
    cpu.y = 0x05;
    
    // STX $30,Y - Store X register at zero page address 0x30 + Y
    cpu.mem[0] = 0x96; // STX zero page,Y
    cpu.mem[1] = 0x30; // Zero page address
    
    const cycles = step6502(cpu);
    
    expect(cpu.mem[0x35]).toBe(0x42); // Value at address 0x30 + 0x05
    expect(cpu.pc).toBe(2);
    expect(cycles).toBe(4);
  });
  
  it("should perform STX absolute instruction", () => {
    const cpu = createCPU();
    
    // Set up X register
    cpu.x = 0x42;
    
    // STX $1234 - Store X register at absolute address 0x1234
    cpu.mem[0] = 0x8E; // STX absolute
    cpu.mem[1] = 0x34; // Low byte of address
    cpu.mem[2] = 0x12; // High byte of address
    
    const cycles = step6502(cpu);
    
    expect(cpu.mem[0x1234]).toBe(0x42);
    expect(cpu.pc).toBe(3);
    expect(cycles).toBe(4);
  });
  
  it("should perform STY zero page instruction", () => {
    const cpu = createCPU();
    
    // Set up Y register
    cpu.y = 0x42;
    
    // STY $30 - Store Y register at zero page address 0x30
    cpu.mem[0] = 0x84; // STY zero page
    cpu.mem[1] = 0x30; // Zero page address
    
    const cycles = step6502(cpu);
    
    expect(cpu.mem[0x30]).toBe(0x42);
    expect(cpu.pc).toBe(2);
    expect(cycles).toBe(3);
  });
  
  it("should perform STY zero page,X instruction", () => {
    const cpu = createCPU();
    
    // Set up X and Y registers
    cpu.y = 0x42;
    cpu.x = 0x05;
    
    // STY $30,X - Store Y register at zero page address 0x30 + X
    cpu.mem[0] = 0x94; // STY zero page,X
    cpu.mem[1] = 0x30; // Zero page address
    
    const cycles = step6502(cpu);
    
    expect(cpu.mem[0x35]).toBe(0x42); // Value at address 0x30 + 0x05
    expect(cpu.pc).toBe(2);
    expect(cycles).toBe(4);
  });
  
  it("should perform STY absolute instruction", () => {
    const cpu = createCPU();
    
    // Set up Y register
    cpu.y = 0x42;
    
    // STY $1234 - Store Y register at absolute address 0x1234
    cpu.mem[0] = 0x8C; // STY absolute
    cpu.mem[1] = 0x34; // Low byte of address
    cpu.mem[2] = 0x12; // High byte of address
    
    const cycles = step6502(cpu);
    
    expect(cpu.mem[0x1234]).toBe(0x42);
    expect(cpu.pc).toBe(3);
    expect(cycles).toBe(4);
  });
});
