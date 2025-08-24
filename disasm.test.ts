import { describe, expect, it } from "bun:test";
import { disassemble } from "./disasm";

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
    expect(await disassemble(mem as any, 0x1000)).toEqual(["NOP", 1]);

    // TAX
    await mem.loadByte(0x1001, 0xAA);
    expect(await disassemble(mem as any, 0x1001)).toEqual(["TAX", 1]);

    // TXA
    await mem.loadByte(0x1002, 0x8A);
    expect(await disassemble(mem as any, 0x1002)).toEqual(["TXA", 1]);

    // INX
    await mem.loadByte(0x1003, 0xE8);
    expect(await disassemble(mem as any, 0x1003)).toEqual(["INX", 1]);
  });

  it("should disassemble immediate instructions", async () => {
    const mem = new Mem();
    
    // LDA #$42
    await mem.loadByte(0x1000, 0xA9);
    await mem.loadByte(0x1001, 0x42);
    expect(await disassemble(mem as any, 0x1000)).toEqual(["LDA #$42", 2]);

    // LDX #$FF
    await mem.loadByte(0x1002, 0xA2);
    await mem.loadByte(0x1003, 0xFF);
    expect(await disassemble(mem as any, 0x1002)).toEqual(["LDX #$FF", 2]);

    // CPY #$00
    await mem.loadByte(0x1004, 0xC0);
    await mem.loadByte(0x1005, 0x00);
    expect(await disassemble(mem as any, 0x1004)).toEqual(["CPY #$00", 2]);
  });

  it("should disassemble zero page instructions", async () => {
    const mem = new Mem();
    
    // LDA $42
    await mem.loadByte(0x1000, 0xA5);
    await mem.loadByte(0x1001, 0x42);
    expect(await disassemble(mem as any, 0x1000)).toEqual(["LDA $42", 2]);

    // STA $FF
    await mem.loadByte(0x1002, 0x85);
    await mem.loadByte(0x1003, 0xFF);
    expect(await disassemble(mem as any, 0x1002)).toEqual(["STA $FF", 2]);
  });

  it("should disassemble zero page,X and zero page,Y instructions", async () => {
    const mem = new Mem();
    
    // LDA $42,X
    await mem.loadByte(0x1000, 0xB5);
    await mem.loadByte(0x1001, 0x42);
    expect(await disassemble(mem as any, 0x1000)).toEqual(["LDA $42,X", 2]);

    // LDX $30,Y
    await mem.loadByte(0x1002, 0xB6);
    await mem.loadByte(0x1003, 0x30);
    expect(await disassemble(mem as any, 0x1002)).toEqual(["LDX $30,Y", 2]);
  });

  it("should disassemble absolute instructions", async () => {
    const mem = new Mem();
    
    // JMP $1234
    await mem.loadByte(0x1000, 0x4C);
    await mem.loadByte(0x1001, 0x34);
    await mem.loadByte(0x1002, 0x12);
    expect(await disassemble(mem as any, 0x1000)).toEqual(["JMP $1234", 3]);

    // LDA $ABCD
    await mem.loadByte(0x1003, 0xAD);
    await mem.loadByte(0x1004, 0xCD);
    await mem.loadByte(0x1005, 0xAB);
    expect(await disassemble(mem as any, 0x1003)).toEqual(["LDA $ABCD", 3]);
  });

  it("should disassemble absolute,X and absolute,Y instructions", async () => {
    const mem = new Mem();
    
    // LDA $1234,X
    await mem.loadByte(0x1000, 0xBD);
    await mem.loadByte(0x1001, 0x34);
    await mem.loadByte(0x1002, 0x12);
    expect(await disassemble(mem as any, 0x1000)).toEqual(["LDA $1234,X", 3]);

    // LDA $ABCD,Y
    await mem.loadByte(0x1003, 0xB9);
    await mem.loadByte(0x1004, 0xCD);
    await mem.loadByte(0x1005, 0xAB);
    expect(await disassemble(mem as any, 0x1003)).toEqual(["LDA $ABCD,Y", 3]);
  });

  it("should disassemble indirect instructions", async () => {
    const mem = new Mem();
    
    // JMP ($1234)
    await mem.loadByte(0x1000, 0x6C);
    await mem.loadByte(0x1001, 0x34);
    await mem.loadByte(0x1002, 0x12);
    expect(await disassemble(mem as any, 0x1000)).toEqual(["JMP ($1234)", 3]);
  });

  it("should disassemble indexed indirect instructions", async () => {
    const mem = new Mem();
    
    // LDA ($10,X)
    await mem.loadByte(0x1000, 0xA1);
    await mem.loadByte(0x1001, 0x10);
    expect(await disassemble(mem as any, 0x1000)).toEqual(["LDA ($10,X)", 2]);

    // STA ($20,X)
    await mem.loadByte(0x1002, 0x81);
    await mem.loadByte(0x1003, 0x20);
    expect(await disassemble(mem as any, 0x1002)).toEqual(["STA ($20,X)", 2]);
  });

  it("should disassemble indirect indexed instructions", async () => {
    const mem = new Mem();
    
    // LDA ($10),Y
    await mem.loadByte(0x1000, 0xB1);
    await mem.loadByte(0x1001, 0x10);
    expect(await disassemble(mem as any, 0x1000)).toEqual(["LDA ($10),Y", 2]);

    // STA ($30),Y
    await mem.loadByte(0x1002, 0x91);
    await mem.loadByte(0x1003, 0x30);
    expect(await disassemble(mem as any, 0x1002)).toEqual(["STA ($30),Y", 2]);
  });

  it("should disassemble relative branch instructions", async () => {
    const mem = new Mem();
    
    // BEQ +5 (branch forward 5 bytes)
    await mem.loadByte(0x1000, 0xF0);
    await mem.loadByte(0x1001, 0x05);
    expect(await disassemble(mem as any, 0x1000)).toEqual(["BEQ $1007", 2]);

    // BNE -10 (branch backward 10 bytes)
    await mem.loadByte(0x1002, 0xD0);
    await mem.loadByte(0x1003, 0xF6); // -10 in two's complement
    expect(await disassemble(mem as any, 0x1002)).toEqual(["BNE $0FFA", 2]);
  });

  it("should handle unknown opcodes", async () => {
    const mem = new Mem();
    
    // Unknown opcode
    await mem.loadByte(0x1000, 0xFF);
    expect(await disassemble(mem as any, 0x1000)).toEqual([".byte $FF", 1]);
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
    expect(await disassemble(mem as any, 0x1000)).toEqual(["LDA #$42", 2]);
    expect(await disassemble(mem as any, 0x1002)).toEqual(["TAX", 1]);
    expect(await disassemble(mem as any, 0x1003)).toEqual(["INX", 1]);
    expect(await disassemble(mem as any, 0x1004)).toEqual(["STX $10", 2]);
  });
  
  it("should disassemble accumulator mode instructions", async () => {
    const mem = new Mem();
    
    // ASL A
    await mem.loadByte(0x1000, 0x0A);
    expect(await disassemble(mem as any, 0x1000)).toEqual(["ASL A", 1]);
    
    // LSR A
    await mem.loadByte(0x1001, 0x4A);
    expect(await disassemble(mem as any, 0x1001)).toEqual(["LSR A", 1]);
  });
});