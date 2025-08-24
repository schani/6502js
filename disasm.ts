import type { CPU } from "./cpu-interface";

// Addressing modes
enum AddressingMode {
  IMPLIED,
  ACCUMULATOR,
  IMMEDIATE,
  ZERO_PAGE,
  ZERO_PAGE_X,
  ZERO_PAGE_Y,
  RELATIVE,
  ABSOLUTE,
  ABSOLUTE_X,
  ABSOLUTE_Y,
  INDIRECT,
  INDEXED_INDIRECT, // (indirect,X)
  INDIRECT_INDEXED, // (indirect),Y
}

// Instruction table entry
interface Instruction {
  mnemonic: string;
  mode: AddressingMode;
  bytes: number;
}

// 6502 instruction set (opcode table)
const INSTRUCTIONS: { [opcode: number]: Instruction } = {
  // LDA
  0xA9: { mnemonic: "LDA", mode: AddressingMode.IMMEDIATE, bytes: 2 },
  0xA5: { mnemonic: "LDA", mode: AddressingMode.ZERO_PAGE, bytes: 2 },
  0xB5: { mnemonic: "LDA", mode: AddressingMode.ZERO_PAGE_X, bytes: 2 },
  0xAD: { mnemonic: "LDA", mode: AddressingMode.ABSOLUTE, bytes: 3 },
  0xBD: { mnemonic: "LDA", mode: AddressingMode.ABSOLUTE_X, bytes: 3 },
  0xB9: { mnemonic: "LDA", mode: AddressingMode.ABSOLUTE_Y, bytes: 3 },
  0xA1: { mnemonic: "LDA", mode: AddressingMode.INDEXED_INDIRECT, bytes: 2 },
  0xB1: { mnemonic: "LDA", mode: AddressingMode.INDIRECT_INDEXED, bytes: 2 },

  // LDX
  0xA2: { mnemonic: "LDX", mode: AddressingMode.IMMEDIATE, bytes: 2 },
  0xA6: { mnemonic: "LDX", mode: AddressingMode.ZERO_PAGE, bytes: 2 },
  0xB6: { mnemonic: "LDX", mode: AddressingMode.ZERO_PAGE_Y, bytes: 2 },
  0xAE: { mnemonic: "LDX", mode: AddressingMode.ABSOLUTE, bytes: 3 },
  0xBE: { mnemonic: "LDX", mode: AddressingMode.ABSOLUTE_Y, bytes: 3 },

  // LDY
  0xA0: { mnemonic: "LDY", mode: AddressingMode.IMMEDIATE, bytes: 2 },
  0xA4: { mnemonic: "LDY", mode: AddressingMode.ZERO_PAGE, bytes: 2 },
  0xB4: { mnemonic: "LDY", mode: AddressingMode.ZERO_PAGE_X, bytes: 2 },
  0xAC: { mnemonic: "LDY", mode: AddressingMode.ABSOLUTE, bytes: 3 },
  0xBC: { mnemonic: "LDY", mode: AddressingMode.ABSOLUTE_X, bytes: 3 },

  // STA
  0x85: { mnemonic: "STA", mode: AddressingMode.ZERO_PAGE, bytes: 2 },
  0x95: { mnemonic: "STA", mode: AddressingMode.ZERO_PAGE_X, bytes: 2 },
  0x8D: { mnemonic: "STA", mode: AddressingMode.ABSOLUTE, bytes: 3 },
  0x9D: { mnemonic: "STA", mode: AddressingMode.ABSOLUTE_X, bytes: 3 },
  0x99: { mnemonic: "STA", mode: AddressingMode.ABSOLUTE_Y, bytes: 3 },
  0x81: { mnemonic: "STA", mode: AddressingMode.INDEXED_INDIRECT, bytes: 2 },
  0x91: { mnemonic: "STA", mode: AddressingMode.INDIRECT_INDEXED, bytes: 2 },

  // STX
  0x86: { mnemonic: "STX", mode: AddressingMode.ZERO_PAGE, bytes: 2 },
  0x96: { mnemonic: "STX", mode: AddressingMode.ZERO_PAGE_Y, bytes: 2 },
  0x8E: { mnemonic: "STX", mode: AddressingMode.ABSOLUTE, bytes: 3 },

  // STY
  0x84: { mnemonic: "STY", mode: AddressingMode.ZERO_PAGE, bytes: 2 },
  0x94: { mnemonic: "STY", mode: AddressingMode.ZERO_PAGE_X, bytes: 2 },
  0x8C: { mnemonic: "STY", mode: AddressingMode.ABSOLUTE, bytes: 3 },

  // Register transfers
  0xAA: { mnemonic: "TAX", mode: AddressingMode.IMPLIED, bytes: 1 },
  0xA8: { mnemonic: "TAY", mode: AddressingMode.IMPLIED, bytes: 1 },
  0x8A: { mnemonic: "TXA", mode: AddressingMode.IMPLIED, bytes: 1 },
  0x98: { mnemonic: "TYA", mode: AddressingMode.IMPLIED, bytes: 1 },
  0xBA: { mnemonic: "TSX", mode: AddressingMode.IMPLIED, bytes: 1 },
  0x9A: { mnemonic: "TXS", mode: AddressingMode.IMPLIED, bytes: 1 },

  // Stack operations
  0x48: { mnemonic: "PHA", mode: AddressingMode.IMPLIED, bytes: 1 },
  0x68: { mnemonic: "PLA", mode: AddressingMode.IMPLIED, bytes: 1 },
  0x08: { mnemonic: "PHP", mode: AddressingMode.IMPLIED, bytes: 1 },
  0x28: { mnemonic: "PLP", mode: AddressingMode.IMPLIED, bytes: 1 },

  // Logical operations
  0x29: { mnemonic: "AND", mode: AddressingMode.IMMEDIATE, bytes: 2 },
  0x25: { mnemonic: "AND", mode: AddressingMode.ZERO_PAGE, bytes: 2 },
  0x35: { mnemonic: "AND", mode: AddressingMode.ZERO_PAGE_X, bytes: 2 },
  0x2D: { mnemonic: "AND", mode: AddressingMode.ABSOLUTE, bytes: 3 },
  0x3D: { mnemonic: "AND", mode: AddressingMode.ABSOLUTE_X, bytes: 3 },
  0x39: { mnemonic: "AND", mode: AddressingMode.ABSOLUTE_Y, bytes: 3 },
  0x21: { mnemonic: "AND", mode: AddressingMode.INDEXED_INDIRECT, bytes: 2 },
  0x31: { mnemonic: "AND", mode: AddressingMode.INDIRECT_INDEXED, bytes: 2 },

  0x09: { mnemonic: "ORA", mode: AddressingMode.IMMEDIATE, bytes: 2 },
  0x05: { mnemonic: "ORA", mode: AddressingMode.ZERO_PAGE, bytes: 2 },
  0x15: { mnemonic: "ORA", mode: AddressingMode.ZERO_PAGE_X, bytes: 2 },
  0x0D: { mnemonic: "ORA", mode: AddressingMode.ABSOLUTE, bytes: 3 },
  0x1D: { mnemonic: "ORA", mode: AddressingMode.ABSOLUTE_X, bytes: 3 },
  0x19: { mnemonic: "ORA", mode: AddressingMode.ABSOLUTE_Y, bytes: 3 },
  0x01: { mnemonic: "ORA", mode: AddressingMode.INDEXED_INDIRECT, bytes: 2 },
  0x11: { mnemonic: "ORA", mode: AddressingMode.INDIRECT_INDEXED, bytes: 2 },

  0x49: { mnemonic: "EOR", mode: AddressingMode.IMMEDIATE, bytes: 2 },
  0x45: { mnemonic: "EOR", mode: AddressingMode.ZERO_PAGE, bytes: 2 },
  0x55: { mnemonic: "EOR", mode: AddressingMode.ZERO_PAGE_X, bytes: 2 },
  0x4D: { mnemonic: "EOR", mode: AddressingMode.ABSOLUTE, bytes: 3 },
  0x5D: { mnemonic: "EOR", mode: AddressingMode.ABSOLUTE_X, bytes: 3 },
  0x59: { mnemonic: "EOR", mode: AddressingMode.ABSOLUTE_Y, bytes: 3 },
  0x41: { mnemonic: "EOR", mode: AddressingMode.INDEXED_INDIRECT, bytes: 2 },
  0x51: { mnemonic: "EOR", mode: AddressingMode.INDIRECT_INDEXED, bytes: 2 },

  // BIT
  0x24: { mnemonic: "BIT", mode: AddressingMode.ZERO_PAGE, bytes: 2 },
  0x2C: { mnemonic: "BIT", mode: AddressingMode.ABSOLUTE, bytes: 3 },

  // Arithmetic operations
  0x69: { mnemonic: "ADC", mode: AddressingMode.IMMEDIATE, bytes: 2 },
  0x65: { mnemonic: "ADC", mode: AddressingMode.ZERO_PAGE, bytes: 2 },
  0x75: { mnemonic: "ADC", mode: AddressingMode.ZERO_PAGE_X, bytes: 2 },
  0x6D: { mnemonic: "ADC", mode: AddressingMode.ABSOLUTE, bytes: 3 },
  0x7D: { mnemonic: "ADC", mode: AddressingMode.ABSOLUTE_X, bytes: 3 },
  0x79: { mnemonic: "ADC", mode: AddressingMode.ABSOLUTE_Y, bytes: 3 },
  0x61: { mnemonic: "ADC", mode: AddressingMode.INDEXED_INDIRECT, bytes: 2 },
  0x71: { mnemonic: "ADC", mode: AddressingMode.INDIRECT_INDEXED, bytes: 2 },

  0xE9: { mnemonic: "SBC", mode: AddressingMode.IMMEDIATE, bytes: 2 },
  0xE5: { mnemonic: "SBC", mode: AddressingMode.ZERO_PAGE, bytes: 2 },
  0xF5: { mnemonic: "SBC", mode: AddressingMode.ZERO_PAGE_X, bytes: 2 },
  0xED: { mnemonic: "SBC", mode: AddressingMode.ABSOLUTE, bytes: 3 },
  0xFD: { mnemonic: "SBC", mode: AddressingMode.ABSOLUTE_X, bytes: 3 },
  0xF9: { mnemonic: "SBC", mode: AddressingMode.ABSOLUTE_Y, bytes: 3 },
  0xE1: { mnemonic: "SBC", mode: AddressingMode.INDEXED_INDIRECT, bytes: 2 },
  0xF1: { mnemonic: "SBC", mode: AddressingMode.INDIRECT_INDEXED, bytes: 2 },

  // Compare operations
  0xC9: { mnemonic: "CMP", mode: AddressingMode.IMMEDIATE, bytes: 2 },
  0xC5: { mnemonic: "CMP", mode: AddressingMode.ZERO_PAGE, bytes: 2 },
  0xD5: { mnemonic: "CMP", mode: AddressingMode.ZERO_PAGE_X, bytes: 2 },
  0xCD: { mnemonic: "CMP", mode: AddressingMode.ABSOLUTE, bytes: 3 },
  0xDD: { mnemonic: "CMP", mode: AddressingMode.ABSOLUTE_X, bytes: 3 },
  0xD9: { mnemonic: "CMP", mode: AddressingMode.ABSOLUTE_Y, bytes: 3 },
  0xC1: { mnemonic: "CMP", mode: AddressingMode.INDEXED_INDIRECT, bytes: 2 },
  0xD1: { mnemonic: "CMP", mode: AddressingMode.INDIRECT_INDEXED, bytes: 2 },

  0xE0: { mnemonic: "CPX", mode: AddressingMode.IMMEDIATE, bytes: 2 },
  0xE4: { mnemonic: "CPX", mode: AddressingMode.ZERO_PAGE, bytes: 2 },
  0xEC: { mnemonic: "CPX", mode: AddressingMode.ABSOLUTE, bytes: 3 },

  0xC0: { mnemonic: "CPY", mode: AddressingMode.IMMEDIATE, bytes: 2 },
  0xC4: { mnemonic: "CPY", mode: AddressingMode.ZERO_PAGE, bytes: 2 },
  0xCC: { mnemonic: "CPY", mode: AddressingMode.ABSOLUTE, bytes: 3 },

  // Increment and decrement
  0xE8: { mnemonic: "INX", mode: AddressingMode.IMPLIED, bytes: 1 },
  0xC8: { mnemonic: "INY", mode: AddressingMode.IMPLIED, bytes: 1 },
  0xCA: { mnemonic: "DEX", mode: AddressingMode.IMPLIED, bytes: 1 },
  0x88: { mnemonic: "DEY", mode: AddressingMode.IMPLIED, bytes: 1 },

  0xE6: { mnemonic: "INC", mode: AddressingMode.ZERO_PAGE, bytes: 2 },
  0xF6: { mnemonic: "INC", mode: AddressingMode.ZERO_PAGE_X, bytes: 2 },
  0xEE: { mnemonic: "INC", mode: AddressingMode.ABSOLUTE, bytes: 3 },
  0xFE: { mnemonic: "INC", mode: AddressingMode.ABSOLUTE_X, bytes: 3 },

  0xC6: { mnemonic: "DEC", mode: AddressingMode.ZERO_PAGE, bytes: 2 },
  0xD6: { mnemonic: "DEC", mode: AddressingMode.ZERO_PAGE_X, bytes: 2 },
  0xCE: { mnemonic: "DEC", mode: AddressingMode.ABSOLUTE, bytes: 3 },
  0xDE: { mnemonic: "DEC", mode: AddressingMode.ABSOLUTE_X, bytes: 3 },

  // Shifts and rotates
  0x0A: { mnemonic: "ASL", mode: AddressingMode.ACCUMULATOR, bytes: 1 },
  0x06: { mnemonic: "ASL", mode: AddressingMode.ZERO_PAGE, bytes: 2 },
  0x16: { mnemonic: "ASL", mode: AddressingMode.ZERO_PAGE_X, bytes: 2 },
  0x0E: { mnemonic: "ASL", mode: AddressingMode.ABSOLUTE, bytes: 3 },
  0x1E: { mnemonic: "ASL", mode: AddressingMode.ABSOLUTE_X, bytes: 3 },

  0x4A: { mnemonic: "LSR", mode: AddressingMode.ACCUMULATOR, bytes: 1 },
  0x46: { mnemonic: "LSR", mode: AddressingMode.ZERO_PAGE, bytes: 2 },
  0x56: { mnemonic: "LSR", mode: AddressingMode.ZERO_PAGE_X, bytes: 2 },
  0x4E: { mnemonic: "LSR", mode: AddressingMode.ABSOLUTE, bytes: 3 },
  0x5E: { mnemonic: "LSR", mode: AddressingMode.ABSOLUTE_X, bytes: 3 },

  0x2A: { mnemonic: "ROL", mode: AddressingMode.ACCUMULATOR, bytes: 1 },
  0x26: { mnemonic: "ROL", mode: AddressingMode.ZERO_PAGE, bytes: 2 },
  0x36: { mnemonic: "ROL", mode: AddressingMode.ZERO_PAGE_X, bytes: 2 },
  0x2E: { mnemonic: "ROL", mode: AddressingMode.ABSOLUTE, bytes: 3 },
  0x3E: { mnemonic: "ROL", mode: AddressingMode.ABSOLUTE_X, bytes: 3 },

  0x6A: { mnemonic: "ROR", mode: AddressingMode.ACCUMULATOR, bytes: 1 },
  0x66: { mnemonic: "ROR", mode: AddressingMode.ZERO_PAGE, bytes: 2 },
  0x76: { mnemonic: "ROR", mode: AddressingMode.ZERO_PAGE_X, bytes: 2 },
  0x6E: { mnemonic: "ROR", mode: AddressingMode.ABSOLUTE, bytes: 3 },
  0x7E: { mnemonic: "ROR", mode: AddressingMode.ABSOLUTE_X, bytes: 3 },

  // Jumps and subroutines
  0x4C: { mnemonic: "JMP", mode: AddressingMode.ABSOLUTE, bytes: 3 },
  0x6C: { mnemonic: "JMP", mode: AddressingMode.INDIRECT, bytes: 3 },
  0x20: { mnemonic: "JSR", mode: AddressingMode.ABSOLUTE, bytes: 3 },
  0x60: { mnemonic: "RTS", mode: AddressingMode.IMPLIED, bytes: 1 },

  // Status flag operations
  0x18: { mnemonic: "CLC", mode: AddressingMode.IMPLIED, bytes: 1 },
  0x38: { mnemonic: "SEC", mode: AddressingMode.IMPLIED, bytes: 1 },
  0x58: { mnemonic: "CLI", mode: AddressingMode.IMPLIED, bytes: 1 },
  0x78: { mnemonic: "SEI", mode: AddressingMode.IMPLIED, bytes: 1 },
  0xB8: { mnemonic: "CLV", mode: AddressingMode.IMPLIED, bytes: 1 },
  0xD8: { mnemonic: "CLD", mode: AddressingMode.IMPLIED, bytes: 1 },
  0xF8: { mnemonic: "SED", mode: AddressingMode.IMPLIED, bytes: 1 },

  // Branch instructions
  0x90: { mnemonic: "BCC", mode: AddressingMode.RELATIVE, bytes: 2 },
  0xB0: { mnemonic: "BCS", mode: AddressingMode.RELATIVE, bytes: 2 },
  0xF0: { mnemonic: "BEQ", mode: AddressingMode.RELATIVE, bytes: 2 },
  0x30: { mnemonic: "BMI", mode: AddressingMode.RELATIVE, bytes: 2 },
  0xD0: { mnemonic: "BNE", mode: AddressingMode.RELATIVE, bytes: 2 },
  0x10: { mnemonic: "BPL", mode: AddressingMode.RELATIVE, bytes: 2 },
  0x50: { mnemonic: "BVC", mode: AddressingMode.RELATIVE, bytes: 2 },
  0x70: { mnemonic: "BVS", mode: AddressingMode.RELATIVE, bytes: 2 },

  // Other
  0x00: { mnemonic: "BRK", mode: AddressingMode.IMPLIED, bytes: 1 },
  0x40: { mnemonic: "RTI", mode: AddressingMode.IMPLIED, bytes: 1 },
  0xEA: { mnemonic: "NOP", mode: AddressingMode.IMPLIED, bytes: 1 },
};

/**
 * Disassembles a 6502 instruction at the given address
 * @param cpu The CPU containing memory to read
 * @param addr The address to disassemble from
 * @returns A tuple of [disassembled instruction string, instruction length in bytes]
 */
export async function disassemble(
  cpu: CPU,
  addr: number,
): Promise<[asm: string, len: number]> {
  const opcode = await cpu.readByte(addr);
  const instruction = INSTRUCTIONS[opcode];

  if (!instruction) {
    // Unknown opcode, show as data byte
    return [`.byte $${opcode.toString(16).padStart(2, "0").toUpperCase()}`, 1];
  }

  let operandValue = 0;
  let targetAddress = 0;

  // Extract operand values based on addressing mode
  switch (instruction.mode) {
    case AddressingMode.IMPLIED:
    case AddressingMode.ACCUMULATOR:
      // No operands
      break;

    case AddressingMode.IMMEDIATE:
      operandValue = await cpu.readByte(addr + 1);
      break;

    case AddressingMode.ZERO_PAGE:
    case AddressingMode.ZERO_PAGE_X:
    case AddressingMode.ZERO_PAGE_Y:
    case AddressingMode.INDEXED_INDIRECT:
    case AddressingMode.INDIRECT_INDEXED:
      operandValue = await cpu.readByte(addr + 1);
      break;

    case AddressingMode.ABSOLUTE:
    case AddressingMode.ABSOLUTE_X:
    case AddressingMode.ABSOLUTE_Y:
    case AddressingMode.INDIRECT:
      operandValue = await cpu.readWord(addr + 1);
      break;

    case AddressingMode.RELATIVE:
      operandValue = await cpu.readByte(addr + 1);
      // Calculate target address (PC + 2 + signed offset)
      if (operandValue & 0x80) {
        // Negative offset
        targetAddress = (addr + 2 + (operandValue - 256)) & 0xFFFF;
      } else {
        // Positive offset
        targetAddress = (addr + 2 + operandValue) & 0xFFFF;
      }
      break;
  }

  // Format the instruction based on addressing mode
  let formattedInstruction = instruction.mnemonic;

  switch (instruction.mode) {
    case AddressingMode.IMPLIED:
      // No operand, just the mnemonic
      break;

    case AddressingMode.ACCUMULATOR:
      formattedInstruction += " A";
      break;

    case AddressingMode.IMMEDIATE:
      formattedInstruction += ` #$${operandValue.toString(16).padStart(2, "0").toUpperCase()}`;
      break;

    case AddressingMode.ZERO_PAGE:
      formattedInstruction += ` $${operandValue.toString(16).padStart(2, "0").toUpperCase()}`;
      break;

    case AddressingMode.ZERO_PAGE_X:
      formattedInstruction += ` $${operandValue.toString(16).padStart(2, "0").toUpperCase()},X`;
      break;

    case AddressingMode.ZERO_PAGE_Y:
      formattedInstruction += ` $${operandValue.toString(16).padStart(2, "0").toUpperCase()},Y`;
      break;

    case AddressingMode.ABSOLUTE:
      formattedInstruction += ` $${operandValue.toString(16).padStart(4, "0").toUpperCase()}`;
      break;

    case AddressingMode.ABSOLUTE_X:
      formattedInstruction += ` $${operandValue.toString(16).padStart(4, "0").toUpperCase()},X`;
      break;

    case AddressingMode.ABSOLUTE_Y:
      formattedInstruction += ` $${operandValue.toString(16).padStart(4, "0").toUpperCase()},Y`;
      break;

    case AddressingMode.INDIRECT:
      formattedInstruction += ` ($${operandValue.toString(16).padStart(4, "0").toUpperCase()})`;
      break;

    case AddressingMode.INDEXED_INDIRECT:
      formattedInstruction += ` ($${operandValue.toString(16).padStart(2, "0").toUpperCase()},X)`;
      break;

    case AddressingMode.INDIRECT_INDEXED:
      formattedInstruction += ` ($${operandValue.toString(16).padStart(2, "0").toUpperCase()}),Y`;
      break;

    case AddressingMode.RELATIVE:
      // Display the calculated target address for branches
      formattedInstruction += ` $${targetAddress.toString(16).padStart(4, "0").toUpperCase()}`;
      break;
  }

  return [formattedInstruction, instruction.bytes];
}