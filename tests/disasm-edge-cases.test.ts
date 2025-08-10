import { describe, expect, it } from "bun:test";
import { disassemble } from "../disasm";

class Mem {
  buf = new Uint8Array(0x10000);
  loadByte(addr: number, val: number) { this.buf[addr & 0xFFFF] = val & 0xFF; }
  readByte(addr: number) { return this.buf[addr & 0xFFFF] || 0; }
  readWord(addr: number) {
    const lo = this.readByte(addr);
    const hi = this.readByte((addr + 1) & 0xFFFF);
    return (hi << 8) | lo;
  }
}

describe("Disassembler edge cases", () => {
  it("should handle all remaining addressing mode edge cases", () => {
    const cpu = new Mem();
    
    // Test Zero Page,Y addressing mode (LDX instruction)
    cpu.loadByte(0, 0xB6); // LDX Zero Page,Y
    cpu.loadByte(1, 0x42); // Zero page address
    
    let [instruction, length] = disassemble(cpu as any, 0);
    expect(instruction).toBe("LDX $42,Y");
    expect(length).toBe(2);
    
    // Test Absolute,Y addressing mode (LDX instruction)
    cpu.loadByte(0, 0xBE); // LDX Absolute,Y
    cpu.loadByte(1, 0x34); // Low byte of address
    cpu.loadByte(2, 0x12); // High byte of address
    
    [instruction, length] = disassemble(cpu as any, 0);
    expect(instruction).toBe("LDX $1234,Y");
    expect(length).toBe(3);
    
    // Test Accumulator addressing mode (ASL instruction)
    cpu.loadByte(0, 0x0A); // ASL A
    
    [instruction, length] = disassemble(cpu as any, 0);
    expect(instruction).toBe("ASL A");
    expect(length).toBe(1);
    
    // Test Relative addressing mode with negative offset
    cpu.loadByte(0, 0x90); // BCC
    cpu.loadByte(1, 0x80); // -128 offset (negative)
    
    [instruction, length] = disassemble(cpu as any, 0);
    // Should display the target address (0x0000 + 2 - 128 = 0xFF82)
    expect(instruction).toBe("BCC $FF82");
    expect(length).toBe(2);
    
    // Test Relative addressing mode with positive offset
    cpu.loadByte(0, 0x90); // BCC
    cpu.loadByte(1, 0x7F); // +127 offset (positive)
    
    [instruction, length] = disassemble(cpu as any, 0);
    // Should display the target address (0x0000 + 2 + 127 = 0x0081)
    expect(instruction).toBe("BCC $0081");
    expect(length).toBe(2);
    
    // Test Indirect addressing mode (JMP)
    cpu.loadByte(0, 0x6C); // JMP Indirect
    cpu.loadByte(1, 0x34); // Low byte of pointer address
    cpu.loadByte(2, 0x12); // High byte of pointer address
    
    [instruction, length] = disassemble(cpu as any, 0);
    expect(instruction).toBe("JMP ($1234)");
    expect(length).toBe(3);
    
    // Test Indexed Indirect addressing mode (ORA)
    cpu.loadByte(0, 0x01); // ORA (Zero Page,X)
    cpu.loadByte(1, 0x42); // Zero page address
    
    [instruction, length] = disassemble(cpu as any, 0);
    expect(instruction).toBe("ORA ($42,X)");
    expect(length).toBe(2);
    
    // Test Indirect Indexed addressing mode (ORA)
    cpu.loadByte(0, 0x11); // ORA (Zero Page),Y
    cpu.loadByte(1, 0x42); // Zero page address
    
    [instruction, length] = disassemble(cpu as any, 0);
    expect(instruction).toBe("ORA ($42),Y");
    expect(length).toBe(2);
  });
  
  it("should handle disassembling sequences of instructions", () => {
    const cpu = new Mem();
    
    // Create a small program with different addressing modes
    cpu.loadByte(0, 0xA9); // LDA Immediate
    cpu.loadByte(1, 0x42);
    cpu.loadByte(2, 0x85); // STA Zero Page
    cpu.loadByte(3, 0x00);
    cpu.loadByte(4, 0xE8); // INX
    cpu.loadByte(5, 0x4C); // JMP Absolute
    cpu.loadByte(6, 0x00); // Low byte
    cpu.loadByte(7, 0x10); // High byte
    
    // Disassemble each instruction
    let offset = 0;
    let instructions: string[] = [];
    
    while (offset < 8) {
      const [instruction, length] = disassemble(cpu as any, offset);
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
    const cpu = new Mem();
    
    // BRK implied
    cpu.loadByte(0, 0x00);
    let [instruction, length] = disassemble(cpu as any, 0);
    expect(instruction).toBe("BRK");
    expect(length).toBe(1);
    
    // RTI implied
    cpu.loadByte(0, 0x40);
    [instruction, length] = disassemble(cpu as any, 0);
    expect(instruction).toBe("RTI");
    expect(length).toBe(1);
    
    // RTS implied
    cpu.loadByte(0, 0x60);
    [instruction, length] = disassemble(cpu as any, 0);
    expect(instruction).toBe("RTS");
    expect(length).toBe(1);
    
    // JSR Absolute
    cpu.loadByte(0, 0x20);
    cpu.loadByte(1, 0x34);
    cpu.loadByte(2, 0x12);
    [instruction, length] = disassemble(cpu as any, 0);
    expect(instruction).toBe("JSR $1234");
    expect(length).toBe(3);
  });
  
  it("should handle unknown opcodes", () => {
    const cpu = new Mem();
    
    // Test with an invalid opcode
    cpu.loadByte(0, 0xFF); // Undefined opcode
    
    const [instruction, length] = disassemble(cpu as any, 0);
    expect(instruction).toBe(".byte $FF");
    expect(length).toBe(1);
  });
});