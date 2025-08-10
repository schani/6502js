import { describe, expect, it } from "bun:test";
import { disassemble } from "./disasm";

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

describe("6502 disassembler", () => {
  it("should disassemble single-byte instructions", () => {
    const mem = new Mem();
    
    // NOP
    mem.loadByte(0x1000, 0xEA);
    expect(disassemble(mem as any, 0x1000)).toEqual(["NOP", 1]);

    // TAX
    mem.loadByte(0x1001, 0xAA);
    expect(disassemble(mem as any, 0x1001)).toEqual(["TAX", 1]);

    // TXA
    mem.loadByte(0x1002, 0x8A);
    expect(disassemble(mem as any, 0x1002)).toEqual(["TXA", 1]);

    // INX
    mem.loadByte(0x1003, 0xE8);
    expect(disassemble(mem as any, 0x1003)).toEqual(["INX", 1]);
  });

  it("should disassemble immediate instructions", () => {
    const mem = new Mem();
    
    // LDA #$42
    mem.loadByte(0x1000, 0xA9);
    mem.loadByte(0x1001, 0x42);
    expect(disassemble(mem as any, 0x1000)).toEqual(["LDA #$42", 2]);

    // LDX #$FF
    mem.loadByte(0x1002, 0xA2);
    mem.loadByte(0x1003, 0xFF);
    expect(disassemble(mem as any, 0x1002)).toEqual(["LDX #$FF", 2]);

    // CPY #$00
    mem.loadByte(0x1004, 0xC0);
    mem.loadByte(0x1005, 0x00);
    expect(disassemble(mem as any, 0x1004)).toEqual(["CPY #$00", 2]);
  });

  it("should disassemble zero page instructions", () => {
    const mem = new Mem();
    
    // LDA $42
    mem.loadByte(0x1000, 0xA5);
    mem.loadByte(0x1001, 0x42);
    expect(disassemble(mem as any, 0x1000)).toEqual(["LDA $42", 2]);

    // STA $FF
    mem.loadByte(0x1002, 0x85);
    mem.loadByte(0x1003, 0xFF);
    expect(disassemble(mem as any, 0x1002)).toEqual(["STA $FF", 2]);
  });

  it("should disassemble zero page,X and zero page,Y instructions", () => {
    const mem = new Mem();
    
    // LDA $42,X
    mem.loadByte(0x1000, 0xB5);
    mem.loadByte(0x1001, 0x42);
    expect(disassemble(mem as any, 0x1000)).toEqual(["LDA $42,X", 2]);

    // LDX $30,Y
    mem.loadByte(0x1002, 0xB6);
    mem.loadByte(0x1003, 0x30);
    expect(disassemble(mem as any, 0x1002)).toEqual(["LDX $30,Y", 2]);
  });

  it("should disassemble absolute instructions", () => {
    const mem = new Mem();
    
    // JMP $1234
    mem.loadByte(0x1000, 0x4C);
    mem.loadByte(0x1001, 0x34);
    mem.loadByte(0x1002, 0x12);
    expect(disassemble(mem as any, 0x1000)).toEqual(["JMP $1234", 3]);

    // LDA $ABCD
    mem.loadByte(0x1003, 0xAD);
    mem.loadByte(0x1004, 0xCD);
    mem.loadByte(0x1005, 0xAB);
    expect(disassemble(mem as any, 0x1003)).toEqual(["LDA $ABCD", 3]);
  });

  it("should disassemble absolute,X and absolute,Y instructions", () => {
    const mem = new Mem();
    
    // LDA $1234,X
    mem.loadByte(0x1000, 0xBD);
    mem.loadByte(0x1001, 0x34);
    mem.loadByte(0x1002, 0x12);
    expect(disassemble(mem as any, 0x1000)).toEqual(["LDA $1234,X", 3]);

    // LDA $ABCD,Y
    mem.loadByte(0x1003, 0xB9);
    mem.loadByte(0x1004, 0xCD);
    mem.loadByte(0x1005, 0xAB);
    expect(disassemble(mem as any, 0x1003)).toEqual(["LDA $ABCD,Y", 3]);
  });

  it("should disassemble indirect instructions", () => {
    const mem = new Mem();
    
    // JMP ($1234)
    mem.loadByte(0x1000, 0x6C);
    mem.loadByte(0x1001, 0x34);
    mem.loadByte(0x1002, 0x12);
    expect(disassemble(mem as any, 0x1000)).toEqual(["JMP ($1234)", 3]);
  });

  it("should disassemble indexed indirect instructions", () => {
    const mem = new Mem();
    
    // LDA ($10,X)
    mem.loadByte(0x1000, 0xA1);
    mem.loadByte(0x1001, 0x10);
    expect(disassemble(mem as any, 0x1000)).toEqual(["LDA ($10,X)", 2]);

    // STA ($20,X)
    mem.loadByte(0x1002, 0x81);
    mem.loadByte(0x1003, 0x20);
    expect(disassemble(mem as any, 0x1002)).toEqual(["STA ($20,X)", 2]);
  });

  it("should disassemble indirect indexed instructions", () => {
    const mem = new Mem();
    
    // LDA ($10),Y
    mem.loadByte(0x1000, 0xB1);
    mem.loadByte(0x1001, 0x10);
    expect(disassemble(mem as any, 0x1000)).toEqual(["LDA ($10),Y", 2]);

    // STA ($30),Y
    mem.loadByte(0x1002, 0x91);
    mem.loadByte(0x1003, 0x30);
    expect(disassemble(mem as any, 0x1002)).toEqual(["STA ($30),Y", 2]);
  });

  it("should disassemble relative branch instructions", () => {
    const mem = new Mem();
    
    // BEQ +5 (branch forward 5 bytes)
    mem.loadByte(0x1000, 0xF0);
    mem.loadByte(0x1001, 0x05);
    expect(disassemble(mem as any, 0x1000)).toEqual(["BEQ $1007", 2]);

    // BNE -10 (branch backward 10 bytes)
    mem.loadByte(0x1002, 0xD0);
    mem.loadByte(0x1003, 0xF6); // -10 in two's complement
    expect(disassemble(mem as any, 0x1002)).toEqual(["BNE $0FFA", 2]);
  });

  it("should handle unknown opcodes", () => {
    const mem = new Mem();
    
    // Unknown opcode
    mem.loadByte(0x1000, 0xFF);
    expect(disassemble(mem as any, 0x1000)).toEqual([".byte $FF", 1]);
  });

  it("should disassemble multiple instructions in sequence", () => {
    const mem = new Mem();
    
    // Set up a small program
    // LDA #$42
    // TAX
    // INX
    // STX $10
    mem.loadByte(0x1000, 0xA9);
    mem.loadByte(0x1001, 0x42);
    mem.loadByte(0x1002, 0xAA);
    mem.loadByte(0x1003, 0xE8);
    mem.loadByte(0x1004, 0x86);
    mem.loadByte(0x1005, 0x10);

    // Disassemble each instruction
    expect(disassemble(mem as any, 0x1000)).toEqual(["LDA #$42", 2]);
    expect(disassemble(mem as any, 0x1002)).toEqual(["TAX", 1]);
    expect(disassemble(mem as any, 0x1003)).toEqual(["INX", 1]);
    expect(disassemble(mem as any, 0x1004)).toEqual(["STX $10", 2]);
  });
  
  it("should disassemble accumulator mode instructions", () => {
    const mem = new Mem();
    
    // ASL A
    mem.loadByte(0x1000, 0x0A);
    expect(disassemble(mem as any, 0x1000)).toEqual(["ASL A", 1]);
    
    // LSR A
    mem.loadByte(0x1001, 0x4A);
    expect(disassemble(mem as any, 0x1001)).toEqual(["LSR A", 1]);
  });
});