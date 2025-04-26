import { describe, expect, it } from "bun:test";
import { type CPU, createCPU } from "./cpu";
import { disassemble } from "./disasm";

describe("6502 disassembler", () => {
  it("should disassemble single-byte instructions", () => {
    const cpu = createCPU();
    
    // NOP
    cpu.mem[0x1000] = 0xEA;
    expect(disassemble(cpu, 0x1000)).toEqual(["NOP", 1]);

    // TAX
    cpu.mem[0x1001] = 0xAA;
    expect(disassemble(cpu, 0x1001)).toEqual(["TAX", 1]);

    // TXA
    cpu.mem[0x1002] = 0x8A;
    expect(disassemble(cpu, 0x1002)).toEqual(["TXA", 1]);

    // INX
    cpu.mem[0x1003] = 0xE8;
    expect(disassemble(cpu, 0x1003)).toEqual(["INX", 1]);
  });

  it("should disassemble immediate instructions", () => {
    const cpu = createCPU();
    
    // LDA #$42
    cpu.mem[0x1000] = 0xA9;
    cpu.mem[0x1001] = 0x42;
    expect(disassemble(cpu, 0x1000)).toEqual(["LDA #$42", 2]);

    // LDX #$FF
    cpu.mem[0x1002] = 0xA2;
    cpu.mem[0x1003] = 0xFF;
    expect(disassemble(cpu, 0x1002)).toEqual(["LDX #$FF", 2]);

    // CPY #$00
    cpu.mem[0x1004] = 0xC0;
    cpu.mem[0x1005] = 0x00;
    expect(disassemble(cpu, 0x1004)).toEqual(["CPY #$00", 2]);
  });

  it("should disassemble zero page instructions", () => {
    const cpu = createCPU();
    
    // LDA $42
    cpu.mem[0x1000] = 0xA5;
    cpu.mem[0x1001] = 0x42;
    expect(disassemble(cpu, 0x1000)).toEqual(["LDA $42", 2]);

    // STA $FF
    cpu.mem[0x1002] = 0x85;
    cpu.mem[0x1003] = 0xFF;
    expect(disassemble(cpu, 0x1002)).toEqual(["STA $FF", 2]);
  });

  it("should disassemble zero page,X and zero page,Y instructions", () => {
    const cpu = createCPU();
    
    // LDA $42,X
    cpu.mem[0x1000] = 0xB5;
    cpu.mem[0x1001] = 0x42;
    expect(disassemble(cpu, 0x1000)).toEqual(["LDA $42,X", 2]);

    // LDX $30,Y
    cpu.mem[0x1002] = 0xB6;
    cpu.mem[0x1003] = 0x30;
    expect(disassemble(cpu, 0x1002)).toEqual(["LDX $30,Y", 2]);
  });

  it("should disassemble absolute instructions", () => {
    const cpu = createCPU();
    
    // JMP $1234
    cpu.mem[0x1000] = 0x4C;
    cpu.mem[0x1001] = 0x34;
    cpu.mem[0x1002] = 0x12;
    expect(disassemble(cpu, 0x1000)).toEqual(["JMP $1234", 3]);

    // LDA $ABCD
    cpu.mem[0x1003] = 0xAD;
    cpu.mem[0x1004] = 0xCD;
    cpu.mem[0x1005] = 0xAB;
    expect(disassemble(cpu, 0x1003)).toEqual(["LDA $ABCD", 3]);
  });

  it("should disassemble absolute,X and absolute,Y instructions", () => {
    const cpu = createCPU();
    
    // LDA $1234,X
    cpu.mem[0x1000] = 0xBD;
    cpu.mem[0x1001] = 0x34;
    cpu.mem[0x1002] = 0x12;
    expect(disassemble(cpu, 0x1000)).toEqual(["LDA $1234,X", 3]);

    // LDA $ABCD,Y
    cpu.mem[0x1003] = 0xB9;
    cpu.mem[0x1004] = 0xCD;
    cpu.mem[0x1005] = 0xAB;
    expect(disassemble(cpu, 0x1003)).toEqual(["LDA $ABCD,Y", 3]);
  });

  it("should disassemble indirect instructions", () => {
    const cpu = createCPU();
    
    // JMP ($1234)
    cpu.mem[0x1000] = 0x6C;
    cpu.mem[0x1001] = 0x34;
    cpu.mem[0x1002] = 0x12;
    expect(disassemble(cpu, 0x1000)).toEqual(["JMP ($1234)", 3]);
  });

  it("should disassemble indexed indirect instructions", () => {
    const cpu = createCPU();
    
    // LDA ($10,X)
    cpu.mem[0x1000] = 0xA1;
    cpu.mem[0x1001] = 0x10;
    expect(disassemble(cpu, 0x1000)).toEqual(["LDA ($10,X)", 2]);

    // STA ($20,X)
    cpu.mem[0x1002] = 0x81;
    cpu.mem[0x1003] = 0x20;
    expect(disassemble(cpu, 0x1002)).toEqual(["STA ($20,X)", 2]);
  });

  it("should disassemble indirect indexed instructions", () => {
    const cpu = createCPU();
    
    // LDA ($10),Y
    cpu.mem[0x1000] = 0xB1;
    cpu.mem[0x1001] = 0x10;
    expect(disassemble(cpu, 0x1000)).toEqual(["LDA ($10),Y", 2]);

    // STA ($30),Y
    cpu.mem[0x1002] = 0x91;
    cpu.mem[0x1003] = 0x30;
    expect(disassemble(cpu, 0x1002)).toEqual(["STA ($30),Y", 2]);
  });

  it("should disassemble relative branch instructions", () => {
    const cpu = createCPU();
    
    // BEQ +5 (branch forward 5 bytes)
    cpu.mem[0x1000] = 0xF0;
    cpu.mem[0x1001] = 0x05;
    expect(disassemble(cpu, 0x1000)).toEqual(["BEQ $1007", 2]);

    // BNE -10 (branch backward 10 bytes)
    cpu.mem[0x1002] = 0xD0;
    cpu.mem[0x1003] = 0xF6; // -10 in two's complement
    expect(disassemble(cpu, 0x1002)).toEqual(["BNE $0FFA", 2]);
  });

  it("should handle unknown opcodes", () => {
    const cpu = createCPU();
    
    // Unknown opcode
    cpu.mem[0x1000] = 0xFF;
    expect(disassemble(cpu, 0x1000)).toEqual([".byte $FF", 1]);
  });

  it("should disassemble multiple instructions in sequence", () => {
    const cpu = createCPU();
    
    // Set up a small program
    // LDA #$42
    // TAX
    // INX
    // STX $10
    cpu.mem[0x1000] = 0xA9;
    cpu.mem[0x1001] = 0x42;
    cpu.mem[0x1002] = 0xAA;
    cpu.mem[0x1003] = 0xE8;
    cpu.mem[0x1004] = 0x86;
    cpu.mem[0x1005] = 0x10;

    // Disassemble each instruction
    expect(disassemble(cpu, 0x1000)).toEqual(["LDA #$42", 2]);
    expect(disassemble(cpu, 0x1002)).toEqual(["TAX", 1]);
    expect(disassemble(cpu, 0x1003)).toEqual(["INX", 1]);
    expect(disassemble(cpu, 0x1004)).toEqual(["STX $10", 2]);
  });
  
  it("should disassemble accumulator mode instructions", () => {
    const cpu = createCPU();
    
    // ASL A
    cpu.mem[0x1000] = 0x0A;
    expect(disassemble(cpu, 0x1000)).toEqual(["ASL A", 1]);
    
    // LSR A
    cpu.mem[0x1001] = 0x4A;
    expect(disassemble(cpu, 0x1001)).toEqual(["LSR A", 1]);
  });
});