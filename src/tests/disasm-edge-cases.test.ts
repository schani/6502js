import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { disassemble } from "../utils/disasm.ts";

class Mem {
  buf = new Uint8Array(0x10000);
  loadByte(addr: number, val: number) { this.buf[addr & 0xFFFF] = val & 0xFF; }
  async readByte(addr: number) { return this.buf[addr & 0xFFFF] || 0; }
  async readWord(addr: number) {
    const lo = await this.readByte(addr);
    const hi = await this.readByte((addr + 1) & 0xFFFF);
    return (hi << 8) | lo;
  }
}

describe("Disassembler edge cases", async () => {
  it("should handle all remaining addressing mode edge cases", async () => {
    const cpu = new Mem();
    
    // Test Zero Page,Y addressing mode (LDX instruction)
    cpu.loadByte(0, 0xB6); // LDX Zero Page,Y
    cpu.loadByte(1, 0x42); // Zero page address
    
    let [instruction, length] = await disassemble(cpu as any, 0);
    assert.strictEqual(instruction, "LDX $42,Y");
    assert.strictEqual(length, 2);
    
    // Test Absolute,Y addressing mode (LDX instruction)
    cpu.loadByte(0, 0xBE); // LDX Absolute,Y
    cpu.loadByte(1, 0x34); // Low byte of address
    cpu.loadByte(2, 0x12); // High byte of address
    
    [instruction, length] = await disassemble(cpu as any, 0);
    assert.strictEqual(instruction, "LDX $1234,Y");
    assert.strictEqual(length, 3);
    
    // Test Accumulator addressing mode (ASL instruction)
    cpu.loadByte(0, 0x0A); // ASL A
    
    [instruction, length] = await disassemble(cpu as any, 0);
    assert.strictEqual(instruction, "ASL A");
    assert.strictEqual(length, 1);
    
    // Test Relative addressing mode with negative offset
    cpu.loadByte(0, 0x90); // BCC
    cpu.loadByte(1, 0x80); // -128 offset (negative)
    
    [instruction, length] = await disassemble(cpu as any, 0);
    // Should display the target address (0x0000 + 2 - 128 = 0xFF82)
    assert.strictEqual(instruction, "BCC $FF82");
    assert.strictEqual(length, 2);
    
    // Test Relative addressing mode with positive offset
    cpu.loadByte(0, 0x90); // BCC
    cpu.loadByte(1, 0x7F); // +127 offset (positive)
    
    [instruction, length] = await disassemble(cpu as any, 0);
    // Should display the target address (0x0000 + 2 + 127 = 0x0081)
    assert.strictEqual(instruction, "BCC $0081");
    assert.strictEqual(length, 2);
    
    // Test Indirect addressing mode (JMP)
    cpu.loadByte(0, 0x6C); // JMP Indirect
    cpu.loadByte(1, 0x34); // Low byte of pointer address
    cpu.loadByte(2, 0x12); // High byte of pointer address
    
    [instruction, length] = await disassemble(cpu as any, 0);
    assert.strictEqual(instruction, "JMP ($1234)");
    assert.strictEqual(length, 3);
    
    // Test Indexed Indirect addressing mode (ORA)
    cpu.loadByte(0, 0x01); // ORA (Zero Page,X)
    cpu.loadByte(1, 0x42); // Zero page address
    
    [instruction, length] = await disassemble(cpu as any, 0);
    assert.strictEqual(instruction, "ORA ($42,X)");
    assert.strictEqual(length, 2);
    
    // Test Indirect Indexed addressing mode (ORA)
    cpu.loadByte(0, 0x11); // ORA (Zero Page),Y
    cpu.loadByte(1, 0x42); // Zero page address
    
    [instruction, length] = await disassemble(cpu as any, 0);
    assert.strictEqual(instruction, "ORA ($42),Y");
    assert.strictEqual(length, 2);
  });
  
  it("should handle disassembling sequences of instructions", async () => {
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
      const [instruction, length] = await disassemble(cpu as any, offset);
      instructions.push(instruction);
      offset += length;
    }
    
    // Verify the disassembled instructions
    assert.deepStrictEqual(instructions,[
      "LDA #$42",
      "STA $00",
      "INX",
      "JMP $1000"
    ]);
    
    // Verify the final offset
    assert.strictEqual(offset, 8);
  });
  
  it("should handle all system instructions for coverage", async () => {
    const cpu = new Mem();
    
    // BRK implied
    cpu.loadByte(0, 0x00);
    let [instruction, length] = await disassemble(cpu as any, 0);
    assert.strictEqual(instruction, "BRK");
    assert.strictEqual(length, 1);
    
    // RTI implied
    cpu.loadByte(0, 0x40);
    [instruction, length] = await disassemble(cpu as any, 0);
    assert.strictEqual(instruction, "RTI");
    assert.strictEqual(length, 1);
    
    // RTS implied
    cpu.loadByte(0, 0x60);
    [instruction, length] = await disassemble(cpu as any, 0);
    assert.strictEqual(instruction, "RTS");
    assert.strictEqual(length, 1);
    
    // JSR Absolute
    cpu.loadByte(0, 0x20);
    cpu.loadByte(1, 0x34);
    cpu.loadByte(2, 0x12);
    [instruction, length] = await disassemble(cpu as any, 0);
    assert.strictEqual(instruction, "JSR $1234");
    assert.strictEqual(length, 3);
  });
  
  it("should handle unknown opcodes", async () => {
    const cpu = new Mem();
    
    // Test with an invalid opcode
    cpu.loadByte(0, 0xFF); // Undefined opcode
    
    const [instruction, length] = await disassemble(cpu as any, 0);
    assert.strictEqual(instruction, ".byte $FF");
    assert.strictEqual(length, 1);
  });
});