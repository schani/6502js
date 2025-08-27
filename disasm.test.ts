import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { disassemble } from "./disasm.ts";

class Mem {
  buf = new Uint8Array(0x10000);
  async loadByte(addr: number, val: number) { this.buf[addr & 0xFFFF] = val & 0xFF; }
  async readByte(addr: number) { return this.buf[addr & 0xFFFF] || 0; }
  async readWord(addr: number) {
    const lo = await this.readByte(addr);
    const hi = await this.readByte((addr + 1) & 0xFFFF);
    return (hi << 8) | lo;
  }
}

describe("6502 disassembler", () => {
  it("should disassemble single-byte instructions", async () => {
    const mem = new Mem();
    
    // NOP
    await mem.loadByte(0x1000, 0xEA);
    assert.deepStrictEqual(await disassemble(mem as any, 0x1000), ["NOP", 1]);

    // TAX
    await mem.loadByte(0x1001, 0xAA);
    assert.deepStrictEqual(await disassemble(mem as any, 0x1001), ["TAX", 1]);

    // TXA
    await mem.loadByte(0x1002, 0x8A);
    assert.deepStrictEqual(await disassemble(mem as any, 0x1002), ["TXA", 1]);

    // INX
    await mem.loadByte(0x1003, 0xE8);
    assert.deepStrictEqual(await disassemble(mem as any, 0x1003), ["INX", 1]);
  });

  it("should disassemble immediate instructions", async () => {
    const mem = new Mem();
    
    // LDA #$42
    await mem.loadByte(0x1000, 0xA9);
    await mem.loadByte(0x1001, 0x42);
    assert.deepStrictEqual(await disassemble(mem as any, 0x1000), ["LDA #$42", 2]);

    // LDX #$FF
    await mem.loadByte(0x1002, 0xA2);
    await mem.loadByte(0x1003, 0xFF);
    assert.deepStrictEqual(await disassemble(mem as any, 0x1002), ["LDX #$FF", 2]);

    // CPY #$00
    await mem.loadByte(0x1004, 0xC0);
    await mem.loadByte(0x1005, 0x00);
    assert.deepStrictEqual(await disassemble(mem as any, 0x1004), ["CPY #$00", 2]);
  });

  it("should disassemble zero page instructions", async () => {
    const mem = new Mem();
    
    // LDA $42
    await mem.loadByte(0x1000, 0xA5);
    await mem.loadByte(0x1001, 0x42);
    assert.deepStrictEqual(await disassemble(mem as any, 0x1000), ["LDA $42", 2]);

    // STA $FF
    await mem.loadByte(0x1002, 0x85);
    await mem.loadByte(0x1003, 0xFF);
    assert.deepStrictEqual(await disassemble(mem as any, 0x1002), ["STA $FF", 2]);
  });

  it("should disassemble zero page,X and zero page,Y instructions", async () => {
    const mem = new Mem();
    
    // LDA $42,X
    await mem.loadByte(0x1000, 0xB5);
    await mem.loadByte(0x1001, 0x42);
    assert.deepStrictEqual(await disassemble(mem as any, 0x1000), ["LDA $42,X", 2]);

    // LDX $30,Y
    await mem.loadByte(0x1002, 0xB6);
    await mem.loadByte(0x1003, 0x30);
    assert.deepStrictEqual(await disassemble(mem as any, 0x1002), ["LDX $30,Y", 2]);
  });

  it("should disassemble absolute instructions", async () => {
    const mem = new Mem();
    
    // JMP $1234
    await mem.loadByte(0x1000, 0x4C);
    await mem.loadByte(0x1001, 0x34);
    await mem.loadByte(0x1002, 0x12);
    assert.deepStrictEqual(await disassemble(mem as any, 0x1000), ["JMP $1234", 3]);

    // LDA $ABCD
    await mem.loadByte(0x1003, 0xAD);
    await mem.loadByte(0x1004, 0xCD);
    await mem.loadByte(0x1005, 0xAB);
    assert.deepStrictEqual(await disassemble(mem as any, 0x1003), ["LDA $ABCD", 3]);
  });

  it("should disassemble absolute,X and absolute,Y instructions", async () => {
    const mem = new Mem();
    
    // LDA $1234,X
    await mem.loadByte(0x1000, 0xBD);
    await mem.loadByte(0x1001, 0x34);
    await mem.loadByte(0x1002, 0x12);
    assert.deepStrictEqual(await disassemble(mem as any, 0x1000), ["LDA $1234,X", 3]);

    // LDA $ABCD,Y
    await mem.loadByte(0x1003, 0xB9);
    await mem.loadByte(0x1004, 0xCD);
    await mem.loadByte(0x1005, 0xAB);
    assert.deepStrictEqual(await disassemble(mem as any, 0x1003), ["LDA $ABCD,Y", 3]);
  });

  it("should disassemble indirect instructions", async () => {
    const mem = new Mem();
    
    // JMP ($1234)
    await mem.loadByte(0x1000, 0x6C);
    await mem.loadByte(0x1001, 0x34);
    await mem.loadByte(0x1002, 0x12);
    assert.deepStrictEqual(await disassemble(mem as any, 0x1000), ["JMP ($1234)", 3]);
  });

  it("should disassemble indexed indirect instructions", async () => {
    const mem = new Mem();
    
    // LDA ($10,X)
    await mem.loadByte(0x1000, 0xA1);
    await mem.loadByte(0x1001, 0x10);
    assert.deepStrictEqual(await disassemble(mem as any, 0x1000), ["LDA ($10,X)", 2]);

    // STA ($20,X)
    await mem.loadByte(0x1002, 0x81);
    await mem.loadByte(0x1003, 0x20);
    assert.deepStrictEqual(await disassemble(mem as any, 0x1002), ["STA ($20,X)", 2]);
  });

  it("should disassemble indirect indexed instructions", async () => {
    const mem = new Mem();
    
    // LDA ($10),Y
    await mem.loadByte(0x1000, 0xB1);
    await mem.loadByte(0x1001, 0x10);
    assert.deepStrictEqual(await disassemble(mem as any, 0x1000), ["LDA ($10),Y", 2]);

    // STA ($30),Y
    await mem.loadByte(0x1002, 0x91);
    await mem.loadByte(0x1003, 0x30);
    assert.deepStrictEqual(await disassemble(mem as any, 0x1002), ["STA ($30),Y", 2]);
  });

  it("should disassemble relative branch instructions", async () => {
    const mem = new Mem();
    
    // BEQ +5 (branch forward 5 bytes)
    await mem.loadByte(0x1000, 0xF0);
    await mem.loadByte(0x1001, 0x05);
    assert.deepStrictEqual(await disassemble(mem as any, 0x1000), ["BEQ $1007", 2]);

    // BNE -10 (branch backward 10 bytes)
    await mem.loadByte(0x1002, 0xD0);
    await mem.loadByte(0x1003, 0xF6); // -10 in two's complement
    assert.deepStrictEqual(await disassemble(mem as any, 0x1002), ["BNE $0FFA", 2]);
  });

  it("should handle unknown opcodes", async () => {
    const mem = new Mem();
    
    // Unknown opcode
    await mem.loadByte(0x1000, 0xFF);
    assert.deepStrictEqual(await disassemble(mem as any, 0x1000), [".byte $FF", 1]);
  });

  it("should disassemble multiple instructions in sequence", async () => {
    const mem = new Mem();
    
    // Set up a small program
    // LDA #$42
    // TAX
    // INX
    // STX $10
    await mem.loadByte(0x1000, 0xA9);
    await mem.loadByte(0x1001, 0x42);
    await mem.loadByte(0x1002, 0xAA);
    await mem.loadByte(0x1003, 0xE8);
    await mem.loadByte(0x1004, 0x86);
    await mem.loadByte(0x1005, 0x10);

    // Disassemble each instruction
    assert.deepStrictEqual(await disassemble(mem as any, 0x1000), ["LDA #$42", 2]);
    assert.deepStrictEqual(await disassemble(mem as any, 0x1002), ["TAX", 1]);
    assert.deepStrictEqual(await disassemble(mem as any, 0x1003), ["INX", 1]);
    assert.deepStrictEqual(await disassemble(mem as any, 0x1004), ["STX $10", 2]);
  });
  
  it("should disassemble accumulator mode instructions", async () => {
    const mem = new Mem();
    
    // ASL A
    await mem.loadByte(0x1000, 0x0A);
    assert.deepStrictEqual(await disassemble(mem as any, 0x1000), ["ASL A", 1]);
    
    // LSR A
    await mem.loadByte(0x1001, 0x4A);
    assert.deepStrictEqual(await disassemble(mem as any, 0x1001), ["LSR A", 1]);
  });
});