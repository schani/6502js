import { describe, expect, it } from "bun:test";
import { createCPU } from "./utils";
import { disassemble } from "../disasm";

describe("Disassembler edge cases", () => {
  it("should handle all remaining addressing mode edge cases", () => {
    const cpu = createCPU();
    
    // Test Zero Page,Y addressing mode (LDX instruction)
    cpu.mem[0] = 0xB6; // LDX Zero Page,Y
    cpu.mem[1] = 0x42; // Zero page address
    
    let [instruction, length] = disassemble(cpu, 0);
    expect(instruction).toBe("LDX $42,Y");
    expect(length).toBe(2);
    
    // Test Absolute,Y addressing mode (LDX instruction)
    cpu.mem[0] = 0xBE; // LDX Absolute,Y
    cpu.mem[1] = 0x34; // Low byte of address
    cpu.mem[2] = 0x12; // High byte of address
    
    [instruction, length] = disassemble(cpu, 0);
    expect(instruction).toBe("LDX $1234,Y");
    expect(length).toBe(3);
    
    // Test Accumulator addressing mode (ASL instruction)
    cpu.mem[0] = 0x0A; // ASL A
    
    [instruction, length] = disassemble(cpu, 0);
    expect(instruction).toBe("ASL A");
    expect(length).toBe(1);
    
    // Test Relative addressing mode with negative offset
    cpu.mem[0] = 0x90; // BCC
    cpu.mem[1] = 0x80; // -128 offset (negative)
    
    [instruction, length] = disassemble(cpu, 0);
    // Should display the target address (0x0000 + 2 - 128 = 0xFF82)
    expect(instruction).toBe("BCC $FF82");
    expect(length).toBe(2);
    
    // Test Relative addressing mode with positive offset
    cpu.mem[0] = 0x90; // BCC
    cpu.mem[1] = 0x7F; // +127 offset (positive)
    
    [instruction, length] = disassemble(cpu, 0);
    // Should display the target address (0x0000 + 2 + 127 = 0x0081)
    expect(instruction).toBe("BCC $0081");
    expect(length).toBe(2);
    
    // Test Indirect addressing mode (JMP)
    cpu.mem[0] = 0x6C; // JMP Indirect
    cpu.mem[1] = 0x34; // Low byte of pointer address
    cpu.mem[2] = 0x12; // High byte of pointer address
    
    [instruction, length] = disassemble(cpu, 0);
    expect(instruction).toBe("JMP ($1234)");
    expect(length).toBe(3);
    
    // Test Indexed Indirect addressing mode (ORA)
    cpu.mem[0] = 0x01; // ORA (Zero Page,X)
    cpu.mem[1] = 0x42; // Zero page address
    
    [instruction, length] = disassemble(cpu, 0);
    expect(instruction).toBe("ORA ($42,X)");
    expect(length).toBe(2);
    
    // Test Indirect Indexed addressing mode (ORA)
    cpu.mem[0] = 0x11; // ORA (Zero Page),Y
    cpu.mem[1] = 0x42; // Zero page address
    
    [instruction, length] = disassemble(cpu, 0);
    expect(instruction).toBe("ORA ($42),Y");
    expect(length).toBe(2);
  });
  
  it("should handle disassembling sequences of instructions", () => {
    const cpu = createCPU();
    
    // Create a small program with different addressing modes
    cpu.mem[0] = 0xA9; // LDA Immediate
    cpu.mem[1] = 0x42;
    cpu.mem[2] = 0x85; // STA Zero Page
    cpu.mem[3] = 0x00;
    cpu.mem[4] = 0xE8; // INX
    cpu.mem[5] = 0x4C; // JMP Absolute
    cpu.mem[6] = 0x00; // Low byte
    cpu.mem[7] = 0x10; // High byte
    
    // Disassemble each instruction
    let offset = 0;
    let instructions = [];
    
    while (offset < 8) {
      const [instruction, length] = disassemble(cpu, offset);
      instructions.push(instruction);
      offset += length;
    }
    
    // Verify the disassembled instructions
    expect(instructions).toEqual([
      "LDA #$42",
      "STA $00",
      "INX",
      "JMP $1000"
    ]);
    
    // Verify the final offset
    expect(offset).toBe(8);
  });
  
  it("should handle all system instructions for coverage", () => {
    const cpu = createCPU();
    
    // BRK implied
    cpu.mem[0] = 0x00;
    let [instruction, length] = disassemble(cpu, 0);
    expect(instruction).toBe("BRK");
    expect(length).toBe(1);
    
    // RTI implied
    cpu.mem[0] = 0x40;
    [instruction, length] = disassemble(cpu, 0);
    expect(instruction).toBe("RTI");
    expect(length).toBe(1);
    
    // RTS implied
    cpu.mem[0] = 0x60;
    [instruction, length] = disassemble(cpu, 0);
    expect(instruction).toBe("RTS");
    expect(length).toBe(1);
    
    // JSR Absolute
    cpu.mem[0] = 0x20;
    cpu.mem[1] = 0x34;
    cpu.mem[2] = 0x12;
    [instruction, length] = disassemble(cpu, 0);
    expect(instruction).toBe("JSR $1234");
    expect(length).toBe(3);
  });
  
  it("should handle unknown opcodes", () => {
    const cpu = createCPU();
    
    // Test with an invalid opcode
    cpu.mem[0] = 0xFF; // Undefined opcode
    
    const [instruction, length] = disassemble(cpu, 0);
    expect(instruction).toBe(".byte $FF");
    expect(length).toBe(1);
  });
});