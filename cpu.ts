import { disassemble } from "./disasm";

// Status register flag bits
export const CARRY = 0x01;        // C - Bit 0
export const ZERO = 0x02;         // Z - Bit 1
export const INTERRUPT = 0x04;    // I - Bit 2
export const DECIMAL = 0x08;      // D - Bit 3
export const BREAK = 0x10;        // B - Bit 4
export const UNUSED = 0x20;       // - - Bit 5 (always 1)
export const OVERFLOW = 0x40;     // V - Bit 6
export const NEGATIVE = 0x80;     // N - Bit 7

export interface CPU {
    /** 8-bit regs */ a: number;
    x: number;
    y: number;
    /** stack ptr, status, program counter */
    sp: number;
    p: number;
    pc: number;
    /** 64 kB memory buffer */
    mem: Uint8Array;
}

export function createCPU(): CPU {
    return {
        a: 0,
        x: 0,
        y: 0,
        sp: 0xFD,             // Initialize stack pointer (0x01FD)
        p: INTERRUPT | UNUSED, // Status register with interrupt disabled and unused bit set
        pc: 0,
        mem: new Uint8Array(65536) // 64KB memory
    };
}

// Helper function to update zero and negative flags based on a value
function updateZeroAndNegativeFlags(cpu: CPU, value: number): void {
    // Clear existing zero and negative flags
    cpu.p &= ~(ZERO | NEGATIVE);
    
    // Set zero flag if value is zero
    if ((value & 0xFF) === 0) {
        cpu.p |= ZERO;
    }
    
    // Set negative flag if bit 7 is set
    if ((value & 0x80) !== 0) {
        cpu.p |= NEGATIVE;
    }
}

// Memory access helpers
function readByte(cpu: CPU, address: number): number {
    return cpu.mem[address & 0xFFFF] || 0;
}

function readWord(cpu: CPU, address: number): number {
    const lo = readByte(cpu, address);
    const hi = readByte(cpu, address + 1);
    return (hi << 8) | lo;
}

function writeByte(cpu: CPU, address: number, value: number): void {
    cpu.mem[address & 0xFFFF] = value & 0xFF;
}

function writeWord(cpu: CPU, address: number, value: number): void {
    writeByte(cpu, address, value & 0xFF);
    writeByte(cpu, address + 1, (value >> 8) & 0xFF);
}

// Export helper functions for testing
export { readByte, readWord, writeByte, writeWord };

// Stack operations
function pushByte(cpu: CPU, value: number): void {
    writeByte(cpu, 0x0100 + cpu.sp, value);
    cpu.sp = (cpu.sp - 1) & 0xFF;
}

function pushWord(cpu: CPU, value: number): void {
    pushByte(cpu, (value >> 8) & 0xFF);
    pushByte(cpu, value & 0xFF);
}

function pullByte(cpu: CPU): number {
    cpu.sp = (cpu.sp + 1) & 0xFF;
    return readByte(cpu, 0x0100 + cpu.sp);
}

function pullWord(cpu: CPU): number {
    const lo = pullByte(cpu);
    const hi = pullByte(cpu);
    return (hi << 8) | lo;
}

// Helper functions for address modes
function getZeroPageAddress(cpu: CPU): number {
    return readByte(cpu, cpu.pc++);
}

function getZeroPageXAddress(cpu: CPU): number {
    const zeroPageAddr = readByte(cpu, cpu.pc++);
    // Zero page X addressing wraps around in the zero page
    return (zeroPageAddr + cpu.x) & 0xFF;
}

function getZeroPageYAddress(cpu: CPU): number {
    const zeroPageAddr = readByte(cpu, cpu.pc++);
    // Zero page Y addressing wraps around in the zero page
    return (zeroPageAddr + cpu.y) & 0xFF;
}

function getAbsoluteAddress(cpu: CPU): number {
    const lowByte = readByte(cpu, cpu.pc++);
    const highByte = readByte(cpu, cpu.pc++);
    return (highByte << 8) | lowByte;
}

function getAbsoluteXAddress(cpu: CPU): { address: number, pageCrossed: boolean } {
    const baseAddress = getAbsoluteAddress(cpu);
    const effectiveAddress = (baseAddress + cpu.x) & 0xFFFF;
    // Check if page boundary crossed (high byte changed)
    const pageCrossed = (baseAddress & 0xFF00) !== (effectiveAddress & 0xFF00);
    return { address: effectiveAddress, pageCrossed };
}

function getAbsoluteYAddress(cpu: CPU): { address: number, pageCrossed: boolean } {
    const baseAddress = getAbsoluteAddress(cpu);
    const effectiveAddress = (baseAddress + cpu.y) & 0xFFFF;
    // Check if page boundary crossed (high byte changed)
    const pageCrossed = (baseAddress & 0xFF00) !== (effectiveAddress & 0xFF00);
    return { address: effectiveAddress, pageCrossed };
}

function getIndirectXAddress(cpu: CPU): number {
    const zeroPageAddr = readByte(cpu, cpu.pc++);
    const effectiveZeroPageAddr = (zeroPageAddr + cpu.x) & 0xFF;
    
    // Read the effective address from the zero page (wrapping around in the zero page)
    const lowByte = readByte(cpu, effectiveZeroPageAddr);
    const highByte = readByte(cpu, (effectiveZeroPageAddr + 1) & 0xFF);
    
    return (highByte << 8) | lowByte;
}

function getIndirectYAddress(cpu: CPU): { address: number, pageCrossed: boolean } {
    const zeroPageAddr = readByte(cpu, cpu.pc++);
    
    // Read the base address from the zero page (wrapping around in the zero page)
    const lowByte = readByte(cpu, zeroPageAddr);
    const highByte = readByte(cpu, (zeroPageAddr + 1) & 0xFF);
    
    const baseAddress = (highByte << 8) | lowByte;
    const effectiveAddress = (baseAddress + cpu.y) & 0xFFFF;
    
    // Check if page boundary crossed (high byte changed)
    const pageCrossed = (baseAddress & 0xFF00) !== (effectiveAddress & 0xFF00);
    
    return { address: effectiveAddress, pageCrossed };
}

function getIndirectAddress(cpu: CPU): number {
    const pointerAddress = getAbsoluteAddress(cpu);
    
    // Handle the 6502 indirect JMP bug when the pointer is at a page boundary
    const lowByte = readByte(cpu, pointerAddress);
    const highByteAddr = (pointerAddress & 0xFF) === 0xFF
        ? pointerAddress & 0xFF00 // Wrap around in the same page if at page boundary
        : pointerAddress + 1;
    const highByte = readByte(cpu, highByteAddr);
    
    return (highByte << 8) | lowByte;
}

// Arithmetic helpers
function addWithCarry(cpu: CPU, value: number): void {
    // Get current carry value
    const carry = cpu.p & CARRY ? 1 : 0;
    
    // Perform binary addition
    const result = cpu.a + value + carry;
    
    // Check for overflow in signed arithmetic
    // Overflow occurs when both operands have the same sign, but the result has a different sign
    const signBitA = cpu.a & 0x80;
    const signBitValue = value & 0x80;
    const signBitResult = result & 0x80;
    
    // Set overflow flag if the sign of the result is different from the signs of the operands
    if ((signBitA === signBitValue) && (signBitA !== signBitResult)) {
        cpu.p |= OVERFLOW;
    } else {
        cpu.p &= ~OVERFLOW;
    }
    
    // Set carry flag if result exceeds 8 bits
    if (result > 0xFF) {
        cpu.p |= CARRY;
    } else {
        cpu.p &= ~CARRY;
    }
    
    // Store result (truncated to 8 bits)
    cpu.a = result & 0xFF;
    
    // Update zero and negative flags
    updateZeroAndNegativeFlags(cpu, cpu.a);
}

function subtractWithCarry(cpu: CPU, value: number): void {
    // Get current carry value (inverted for subtraction; carry clear means borrow)
    const borrow = cpu.p & CARRY ? 0 : 1;
    
    // 6502 subtracts by adding the one's complement with carry
    // A = A - M - !C = A + ~M + C
    const result = cpu.a + (~value & 0xFF) + (1 - borrow);
    
    // Check for overflow in signed arithmetic
    // Overflow occurs when operands have different signs and the result has a sign different from A
    const signBitA = cpu.a & 0x80;
    const signBitValue = value & 0x80;
    const signBitResult = result & 0x80;
    
    // Set overflow flag if the sign of the result is different from the sign of A
    // and the sign of the operand is different from the sign of A
    if ((signBitA !== signBitValue) && (signBitA !== signBitResult)) {
        cpu.p |= OVERFLOW;
    } else {
        cpu.p &= ~OVERFLOW;
    }
    
    // Set carry flag if no borrow needed (result is positive in 9-bit context)
    // Note: Carry flag is inverted in SBC (C=1 means no borrow)
    if ((result & 0x100) !== 0) {
        cpu.p |= CARRY;
    } else {
        cpu.p &= ~CARRY;
    }
    
    // Store result (truncated to 8 bits)
    cpu.a = result & 0xFF;
    
    // Update zero and negative flags
    updateZeroAndNegativeFlags(cpu, cpu.a);
}

function compare(cpu: CPU, register: number, value: number): void {
    // Perform subtraction without storing the result
    const result = (register - value) & 0xFF;
    
    // Set carry flag if register >= value
    if (register >= value) {
        cpu.p |= CARRY;
    } else {
        cpu.p &= ~CARRY;
    }
    
    // Update zero and negative flags based on result
    updateZeroAndNegativeFlags(cpu, result);
}

/**
 * Formats the CPU status register as a string showing the flag states
 * @param cpu The CPU to get the status from
 * @returns A string representation of the status flags (NV-BDIZC)
 */
function getStatusString(cpu: CPU): string {
    // Format is NV-BDIZC
    return (
        (cpu.p & NEGATIVE ? 'N' : 'n') +
        (cpu.p & OVERFLOW ? 'V' : 'v') +
        '-' +
        (cpu.p & BREAK ? 'B' : 'b') +
        (cpu.p & DECIMAL ? 'D' : 'd') +
        (cpu.p & INTERRUPT ? 'I' : 'i') +
        (cpu.p & ZERO ? 'Z' : 'z') +
        (cpu.p & CARRY ? 'C' : 'c')
    );
}

export function step6502(cpu: CPU, trace = false): number /* cycles */ {
    // Save the current PC for trace output before it gets incremented
    const currentPC = cpu.pc;
    
    // Fetch opcode
    const opcode = readByte(cpu, cpu.pc++);
    let cycles = 0;
    
    if (trace) {
        // Disassemble the current instruction at the current PC
        const [asmInstruction, instructionLength] = disassemble(cpu, currentPC);
        
        // Format CPU state with register values
        const stateStr = `A:${cpu.a.toString(16).padStart(2, '0').toUpperCase()} ` +
                         `X:${cpu.x.toString(16).padStart(2, '0').toUpperCase()} ` +
                         `Y:${cpu.y.toString(16).padStart(2, '0').toUpperCase()} ` + 
                         `SP:${cpu.sp.toString(16).padStart(2, '0').toUpperCase()} ` +
                         `P:${cpu.p.toString(16).padStart(2, '0').toUpperCase()} [${getStatusString(cpu)}]`;
        
        // Log the PC, instruction, and CPU state
        console.log(
            `${currentPC.toString(16).padStart(4, '0').toUpperCase()}: ` +
            `${asmInstruction.padEnd(12)} | ${stateStr}`
        );
    }
    
    switch (opcode) {
        // LDA - Load Accumulator
        case 0xA9: { // LDA Immediate
            const value = readByte(cpu, cpu.pc++);
            cpu.a = value;
            updateZeroAndNegativeFlags(cpu, cpu.a);
            cycles = 2;
            break;
        }
        case 0xA5: { // LDA Zero Page
            const zeroPageAddr = getZeroPageAddress(cpu);
            cpu.a = readByte(cpu, zeroPageAddr);
            updateZeroAndNegativeFlags(cpu, cpu.a);
            cycles = 3;
            break;
        }
        case 0xB5: { // LDA Zero Page,X
            const addr = getZeroPageXAddress(cpu);
            cpu.a = readByte(cpu, addr);
            updateZeroAndNegativeFlags(cpu, cpu.a);
            cycles = 4;
            break;
        }
        case 0xAD: { // LDA Absolute
            const addr = getAbsoluteAddress(cpu);
            cpu.a = readByte(cpu, addr);
            updateZeroAndNegativeFlags(cpu, cpu.a);
            cycles = 4;
            break;
        }
        case 0xBD: { // LDA Absolute,X
            const { address, pageCrossed } = getAbsoluteXAddress(cpu);
            cpu.a = readByte(cpu, address);
            updateZeroAndNegativeFlags(cpu, cpu.a);
            cycles = 4 + (pageCrossed ? 1 : 0);
            break;
        }
        case 0xB9: { // LDA Absolute,Y
            const { address, pageCrossed } = getAbsoluteYAddress(cpu);
            cpu.a = readByte(cpu, address);
            updateZeroAndNegativeFlags(cpu, cpu.a);
            cycles = 4 + (pageCrossed ? 1 : 0);
            break;
        }
        case 0xA1: { // LDA (Indirect,X)
            const addr = getIndirectXAddress(cpu);
            cpu.a = readByte(cpu, addr);
            updateZeroAndNegativeFlags(cpu, cpu.a);
            cycles = 6;
            break;
        }
        case 0xB1: { // LDA (Indirect),Y
            const { address, pageCrossed } = getIndirectYAddress(cpu);
            cpu.a = readByte(cpu, address);
            updateZeroAndNegativeFlags(cpu, cpu.a);
            cycles = 5 + (pageCrossed ? 1 : 0);
            break;
        }
        
        // LDX - Load X Register
        case 0xA2: { // LDX Immediate
            const value = readByte(cpu, cpu.pc++);
            cpu.x = value;
            updateZeroAndNegativeFlags(cpu, cpu.x);
            cycles = 2;
            break;
        }
        case 0xA6: { // LDX Zero Page
            const zeroPageAddr = getZeroPageAddress(cpu);
            cpu.x = readByte(cpu, zeroPageAddr);
            updateZeroAndNegativeFlags(cpu, cpu.x);
            cycles = 3;
            break;
        }
        case 0xB6: { // LDX Zero Page,Y
            const addr = getZeroPageYAddress(cpu);
            cpu.x = readByte(cpu, addr);
            updateZeroAndNegativeFlags(cpu, cpu.x);
            cycles = 4;
            break;
        }
        case 0xAE: { // LDX Absolute
            const addr = getAbsoluteAddress(cpu);
            cpu.x = readByte(cpu, addr);
            updateZeroAndNegativeFlags(cpu, cpu.x);
            cycles = 4;
            break;
        }
        case 0xBE: { // LDX Absolute,Y
            const { address, pageCrossed } = getAbsoluteYAddress(cpu);
            cpu.x = readByte(cpu, address);
            updateZeroAndNegativeFlags(cpu, cpu.x);
            cycles = 4 + (pageCrossed ? 1 : 0);
            break;
        }
        
        // LDY - Load Y Register
        case 0xA0: { // LDY Immediate
            const value = readByte(cpu, cpu.pc++);
            cpu.y = value;
            updateZeroAndNegativeFlags(cpu, cpu.y);
            cycles = 2;
            break;
        }
        case 0xA4: { // LDY Zero Page
            const zeroPageAddr = getZeroPageAddress(cpu);
            cpu.y = readByte(cpu, zeroPageAddr);
            updateZeroAndNegativeFlags(cpu, cpu.y);
            cycles = 3;
            break;
        }
        case 0xB4: { // LDY Zero Page,X
            const addr = getZeroPageXAddress(cpu);
            cpu.y = readByte(cpu, addr);
            updateZeroAndNegativeFlags(cpu, cpu.y);
            cycles = 4;
            break;
        }
        case 0xAC: { // LDY Absolute
            const addr = getAbsoluteAddress(cpu);
            cpu.y = readByte(cpu, addr);
            updateZeroAndNegativeFlags(cpu, cpu.y);
            cycles = 4;
            break;
        }
        case 0xBC: { // LDY Absolute,X
            const { address, pageCrossed } = getAbsoluteXAddress(cpu);
            cpu.y = readByte(cpu, address);
            updateZeroAndNegativeFlags(cpu, cpu.y);
            cycles = 4 + (pageCrossed ? 1 : 0);
            break;
        }
        
        // STA - Store Accumulator
        case 0x85: { // STA Zero Page
            const zeroPageAddr = getZeroPageAddress(cpu);
            writeByte(cpu, zeroPageAddr, cpu.a);
            cycles = 3;
            break;
        }
        case 0x95: { // STA Zero Page,X
            const addr = getZeroPageXAddress(cpu);
            writeByte(cpu, addr, cpu.a);
            cycles = 4;
            break;
        }
        case 0x8D: { // STA Absolute
            const addr = getAbsoluteAddress(cpu);
            writeByte(cpu, addr, cpu.a);
            cycles = 4;
            break;
        }
        case 0x9D: { // STA Absolute,X
            const { address } = getAbsoluteXAddress(cpu);
            writeByte(cpu, address, cpu.a);
            cycles = 5; // Always 5 cycles, no page boundary check for stores
            break;
        }
        case 0x99: { // STA Absolute,Y
            const { address } = getAbsoluteYAddress(cpu);
            writeByte(cpu, address, cpu.a);
            cycles = 5; // Always 5 cycles, no page boundary check for stores
            break;
        }
        case 0x81: { // STA (Indirect,X)
            const addr = getIndirectXAddress(cpu);
            writeByte(cpu, addr, cpu.a);
            cycles = 6;
            break;
        }
        case 0x91: { // STA (Indirect),Y
            const { address } = getIndirectYAddress(cpu);
            writeByte(cpu, address, cpu.a);
            cycles = 6; // Always 6 cycles, no page boundary check for stores
            break;
        }
        
        // STX - Store X Register
        case 0x86: { // STX Zero Page
            const zeroPageAddr = getZeroPageAddress(cpu);
            writeByte(cpu, zeroPageAddr, cpu.x);
            cycles = 3;
            break;
        }
        case 0x96: { // STX Zero Page,Y
            const addr = getZeroPageYAddress(cpu);
            writeByte(cpu, addr, cpu.x);
            cycles = 4;
            break;
        }
        case 0x8E: { // STX Absolute
            const addr = getAbsoluteAddress(cpu);
            writeByte(cpu, addr, cpu.x);
            cycles = 4;
            break;
        }
        
        // STY - Store Y Register
        case 0x84: { // STY Zero Page
            const zeroPageAddr = getZeroPageAddress(cpu);
            writeByte(cpu, zeroPageAddr, cpu.y);
            cycles = 3;
            break;
        }
        case 0x94: { // STY Zero Page,X
            const addr = getZeroPageXAddress(cpu);
            writeByte(cpu, addr, cpu.y);
            cycles = 4;
            break;
        }
        case 0x8C: { // STY Absolute
            const addr = getAbsoluteAddress(cpu);
            writeByte(cpu, addr, cpu.y);
            cycles = 4;
            break;
        }
        
        // Register Transfer Instructions
        case 0xAA: { // TAX - Transfer Accumulator to X
            cpu.x = cpu.a;
            updateZeroAndNegativeFlags(cpu, cpu.x);
            cycles = 2;
            break;
        }
        case 0xA8: { // TAY - Transfer Accumulator to Y
            cpu.y = cpu.a;
            updateZeroAndNegativeFlags(cpu, cpu.y);
            cycles = 2;
            break;
        }
        case 0x8A: { // TXA - Transfer X to Accumulator
            cpu.a = cpu.x;
            updateZeroAndNegativeFlags(cpu, cpu.a);
            cycles = 2;
            break;
        }
        case 0x98: { // TYA - Transfer Y to Accumulator
            cpu.a = cpu.y;
            updateZeroAndNegativeFlags(cpu, cpu.a);
            cycles = 2;
            break;
        }
        case 0xBA: { // TSX - Transfer Stack Pointer to X
            cpu.x = cpu.sp;
            updateZeroAndNegativeFlags(cpu, cpu.x);
            cycles = 2;
            break;
        }
        case 0x9A: { // TXS - Transfer X to Stack Pointer
            cpu.sp = cpu.x;
            // Note: This instruction does not affect any flags
            cycles = 2;
            break;
        }
        
        // Stack operations
        case 0x48: { // PHA - Push Accumulator on Stack
            pushByte(cpu, cpu.a);
            cycles = 3;
            break;
        }
        case 0x68: { // PLA - Pull Accumulator from Stack
            cpu.a = pullByte(cpu);
            updateZeroAndNegativeFlags(cpu, cpu.a);
            cycles = 4;
            break;
        }
        case 0x08: { // PHP - Push Processor Status on Stack
            // When pushing status to stack, the B flag and unused flag are set
            pushByte(cpu, cpu.p | BREAK | UNUSED);
            cycles = 3;
            break;
        }
        case 0x28: { // PLP - Pull Processor Status from Stack
            // When pulling status from stack, the B flag is ignored and unused is set
            cpu.p = (pullByte(cpu) & ~BREAK) | UNUSED;
            cycles = 4;
            break;
        }
        
        // Logical operations
        case 0x29: { // AND Immediate
            const value = readByte(cpu, cpu.pc++);
            cpu.a &= value;
            updateZeroAndNegativeFlags(cpu, cpu.a);
            cycles = 2;
            break;
        }
        case 0x25: { // AND Zero Page
            const addr = getZeroPageAddress(cpu);
            cpu.a &= readByte(cpu, addr);
            updateZeroAndNegativeFlags(cpu, cpu.a);
            cycles = 3;
            break;
        }
        case 0x35: { // AND Zero Page,X
            const addr = getZeroPageXAddress(cpu);
            cpu.a &= readByte(cpu, addr);
            updateZeroAndNegativeFlags(cpu, cpu.a);
            cycles = 4;
            break;
        }
        case 0x2D: { // AND Absolute
            const addr = getAbsoluteAddress(cpu);
            cpu.a &= readByte(cpu, addr);
            updateZeroAndNegativeFlags(cpu, cpu.a);
            cycles = 4;
            break;
        }
        case 0x3D: { // AND Absolute,X
            const { address, pageCrossed } = getAbsoluteXAddress(cpu);
            cpu.a &= readByte(cpu, address);
            updateZeroAndNegativeFlags(cpu, cpu.a);
            cycles = 4 + (pageCrossed ? 1 : 0);
            break;
        }
        case 0x39: { // AND Absolute,Y
            const { address, pageCrossed } = getAbsoluteYAddress(cpu);
            cpu.a &= readByte(cpu, address);
            updateZeroAndNegativeFlags(cpu, cpu.a);
            cycles = 4 + (pageCrossed ? 1 : 0);
            break;
        }
        case 0x21: { // AND (Indirect,X)
            const addr = getIndirectXAddress(cpu);
            cpu.a &= readByte(cpu, addr);
            updateZeroAndNegativeFlags(cpu, cpu.a);
            cycles = 6;
            break;
        }
        case 0x31: { // AND (Indirect),Y
            const { address, pageCrossed } = getIndirectYAddress(cpu);
            cpu.a &= readByte(cpu, address);
            updateZeroAndNegativeFlags(cpu, cpu.a);
            cycles = 5 + (pageCrossed ? 1 : 0);
            break;
        }
        
        case 0x09: { // ORA Immediate
            const value = readByte(cpu, cpu.pc++);
            cpu.a |= value;
            updateZeroAndNegativeFlags(cpu, cpu.a);
            cycles = 2;
            break;
        }
        case 0x05: { // ORA Zero Page
            const addr = getZeroPageAddress(cpu);
            cpu.a |= readByte(cpu, addr);
            updateZeroAndNegativeFlags(cpu, cpu.a);
            cycles = 3;
            break;
        }
        case 0x15: { // ORA Zero Page,X
            const addr = getZeroPageXAddress(cpu);
            cpu.a |= readByte(cpu, addr);
            updateZeroAndNegativeFlags(cpu, cpu.a);
            cycles = 4;
            break;
        }
        case 0x0D: { // ORA Absolute
            const addr = getAbsoluteAddress(cpu);
            cpu.a |= readByte(cpu, addr);
            updateZeroAndNegativeFlags(cpu, cpu.a);
            cycles = 4;
            break;
        }
        case 0x1D: { // ORA Absolute,X
            const { address, pageCrossed } = getAbsoluteXAddress(cpu);
            cpu.a |= readByte(cpu, address);
            updateZeroAndNegativeFlags(cpu, cpu.a);
            cycles = 4 + (pageCrossed ? 1 : 0);
            break;
        }
        case 0x19: { // ORA Absolute,Y
            const { address, pageCrossed } = getAbsoluteYAddress(cpu);
            cpu.a |= readByte(cpu, address);
            updateZeroAndNegativeFlags(cpu, cpu.a);
            cycles = 4 + (pageCrossed ? 1 : 0);
            break;
        }
        case 0x01: { // ORA (Indirect,X)
            const addr = getIndirectXAddress(cpu);
            cpu.a |= readByte(cpu, addr);
            updateZeroAndNegativeFlags(cpu, cpu.a);
            cycles = 6;
            break;
        }
        case 0x11: { // ORA (Indirect),Y
            const { address, pageCrossed } = getIndirectYAddress(cpu);
            cpu.a |= readByte(cpu, address);
            updateZeroAndNegativeFlags(cpu, cpu.a);
            cycles = 5 + (pageCrossed ? 1 : 0);
            break;
        }
        
        case 0x49: { // EOR Immediate
            const value = readByte(cpu, cpu.pc++);
            cpu.a ^= value;
            updateZeroAndNegativeFlags(cpu, cpu.a);
            cycles = 2;
            break;
        }
        case 0x45: { // EOR Zero Page
            const addr = getZeroPageAddress(cpu);
            cpu.a ^= readByte(cpu, addr);
            updateZeroAndNegativeFlags(cpu, cpu.a);
            cycles = 3;
            break;
        }
        case 0x55: { // EOR Zero Page,X
            const addr = getZeroPageXAddress(cpu);
            cpu.a ^= readByte(cpu, addr);
            updateZeroAndNegativeFlags(cpu, cpu.a);
            cycles = 4;
            break;
        }
        case 0x4D: { // EOR Absolute
            const addr = getAbsoluteAddress(cpu);
            cpu.a ^= readByte(cpu, addr);
            updateZeroAndNegativeFlags(cpu, cpu.a);
            cycles = 4;
            break;
        }
        case 0x5D: { // EOR Absolute,X
            const { address, pageCrossed } = getAbsoluteXAddress(cpu);
            cpu.a ^= readByte(cpu, address);
            updateZeroAndNegativeFlags(cpu, cpu.a);
            cycles = 4 + (pageCrossed ? 1 : 0);
            break;
        }
        case 0x59: { // EOR Absolute,Y
            const { address, pageCrossed } = getAbsoluteYAddress(cpu);
            cpu.a ^= readByte(cpu, address);
            updateZeroAndNegativeFlags(cpu, cpu.a);
            cycles = 4 + (pageCrossed ? 1 : 0);
            break;
        }
        case 0x41: { // EOR (Indirect,X)
            const addr = getIndirectXAddress(cpu);
            cpu.a ^= readByte(cpu, addr);
            updateZeroAndNegativeFlags(cpu, cpu.a);
            cycles = 6;
            break;
        }
        case 0x51: { // EOR (Indirect),Y
            const { address, pageCrossed } = getIndirectYAddress(cpu);
            cpu.a ^= readByte(cpu, address);
            updateZeroAndNegativeFlags(cpu, cpu.a);
            cycles = 5 + (pageCrossed ? 1 : 0);
            break;
        }
        
        case 0x24: { // BIT Zero Page
            const addr = getZeroPageAddress(cpu);
            const value = readByte(cpu, addr);
            
            // Set V flag to bit 6 of memory value
            if ((value & 0x40) !== 0) {
                cpu.p |= OVERFLOW;
            } else {
                cpu.p &= ~OVERFLOW;
            }
            
            // Set N flag to bit 7 of memory value
            if ((value & 0x80) !== 0) {
                cpu.p |= NEGATIVE;
            } else {
                cpu.p &= ~NEGATIVE;
            }
            
            // Set Z flag based on the result of A & value
            if ((cpu.a & value) === 0) {
                cpu.p |= ZERO;
            } else {
                cpu.p &= ~ZERO;
            }
            
            cycles = 3;
            break;
        }
        case 0x2C: { // BIT Absolute
            const addr = getAbsoluteAddress(cpu);
            const value = readByte(cpu, addr);
            
            // Set V flag to bit 6 of memory value
            if ((value & 0x40) !== 0) {
                cpu.p |= OVERFLOW;
            } else {
                cpu.p &= ~OVERFLOW;
            }
            
            // Set N flag to bit 7 of memory value
            if ((value & 0x80) !== 0) {
                cpu.p |= NEGATIVE;
            } else {
                cpu.p &= ~NEGATIVE;
            }
            
            // Set Z flag based on the result of A & value
            if ((cpu.a & value) === 0) {
                cpu.p |= ZERO;
            } else {
                cpu.p &= ~ZERO;
            }
            
            cycles = 4;
            break;
        }
        
        // Arithmetic operations
        case 0x69: { // ADC Immediate
            const value = readByte(cpu, cpu.pc++);
            addWithCarry(cpu, value);
            cycles = 2;
            break;
        }
        case 0x65: { // ADC Zero Page
            const addr = getZeroPageAddress(cpu);
            const value = readByte(cpu, addr);
            addWithCarry(cpu, value);
            cycles = 3;
            break;
        }
        case 0x75: { // ADC Zero Page,X
            const addr = getZeroPageXAddress(cpu);
            const value = readByte(cpu, addr);
            addWithCarry(cpu, value);
            cycles = 4;
            break;
        }
        case 0x6D: { // ADC Absolute
            const addr = getAbsoluteAddress(cpu);
            const value = readByte(cpu, addr);
            addWithCarry(cpu, value);
            cycles = 4;
            break;
        }
        case 0x7D: { // ADC Absolute,X
            const { address, pageCrossed } = getAbsoluteXAddress(cpu);
            const value = readByte(cpu, address);
            addWithCarry(cpu, value);
            cycles = 4 + (pageCrossed ? 1 : 0);
            break;
        }
        case 0x79: { // ADC Absolute,Y
            const { address, pageCrossed } = getAbsoluteYAddress(cpu);
            const value = readByte(cpu, address);
            addWithCarry(cpu, value);
            cycles = 4 + (pageCrossed ? 1 : 0);
            break;
        }
        case 0x61: { // ADC (Indirect,X)
            const addr = getIndirectXAddress(cpu);
            const value = readByte(cpu, addr);
            addWithCarry(cpu, value);
            cycles = 6;
            break;
        }
        case 0x71: { // ADC (Indirect),Y
            const { address, pageCrossed } = getIndirectYAddress(cpu);
            const value = readByte(cpu, address);
            addWithCarry(cpu, value);
            cycles = 5 + (pageCrossed ? 1 : 0);
            break;
        }
        
        case 0xE9: { // SBC Immediate
            const value = readByte(cpu, cpu.pc++);
            subtractWithCarry(cpu, value);
            cycles = 2;
            break;
        }
        case 0xE5: { // SBC Zero Page
            const addr = getZeroPageAddress(cpu);
            const value = readByte(cpu, addr);
            subtractWithCarry(cpu, value);
            cycles = 3;
            break;
        }
        case 0xF5: { // SBC Zero Page,X
            const addr = getZeroPageXAddress(cpu);
            const value = readByte(cpu, addr);
            subtractWithCarry(cpu, value);
            cycles = 4;
            break;
        }
        case 0xED: { // SBC Absolute
            const addr = getAbsoluteAddress(cpu);
            const value = readByte(cpu, addr);
            subtractWithCarry(cpu, value);
            cycles = 4;
            break;
        }
        case 0xFD: { // SBC Absolute,X
            const { address, pageCrossed } = getAbsoluteXAddress(cpu);
            const value = readByte(cpu, address);
            subtractWithCarry(cpu, value);
            cycles = 4 + (pageCrossed ? 1 : 0);
            break;
        }
        case 0xF9: { // SBC Absolute,Y
            const { address, pageCrossed } = getAbsoluteYAddress(cpu);
            const value = readByte(cpu, address);
            subtractWithCarry(cpu, value);
            cycles = 4 + (pageCrossed ? 1 : 0);
            break;
        }
        case 0xE1: { // SBC (Indirect,X)
            const addr = getIndirectXAddress(cpu);
            const value = readByte(cpu, addr);
            subtractWithCarry(cpu, value);
            cycles = 6;
            break;
        }
        case 0xF1: { // SBC (Indirect),Y
            const { address, pageCrossed } = getIndirectYAddress(cpu);
            const value = readByte(cpu, address);
            subtractWithCarry(cpu, value);
            cycles = 5 + (pageCrossed ? 1 : 0);
            break;
        }
        
        case 0xC9: { // CMP Immediate
            const value = readByte(cpu, cpu.pc++);
            compare(cpu, cpu.a, value);
            cycles = 2;
            break;
        }
        case 0xC5: { // CMP Zero Page
            const addr = getZeroPageAddress(cpu);
            const value = readByte(cpu, addr);
            compare(cpu, cpu.a, value);
            cycles = 3;
            break;
        }
        case 0xD5: { // CMP Zero Page,X
            const addr = getZeroPageXAddress(cpu);
            const value = readByte(cpu, addr);
            compare(cpu, cpu.a, value);
            cycles = 4;
            break;
        }
        case 0xCD: { // CMP Absolute
            const addr = getAbsoluteAddress(cpu);
            const value = readByte(cpu, addr);
            compare(cpu, cpu.a, value);
            cycles = 4;
            break;
        }
        case 0xDD: { // CMP Absolute,X
            const { address, pageCrossed } = getAbsoluteXAddress(cpu);
            const value = readByte(cpu, address);
            compare(cpu, cpu.a, value);
            cycles = 4 + (pageCrossed ? 1 : 0);
            break;
        }
        case 0xD9: { // CMP Absolute,Y
            const { address, pageCrossed } = getAbsoluteYAddress(cpu);
            const value = readByte(cpu, address);
            compare(cpu, cpu.a, value);
            cycles = 4 + (pageCrossed ? 1 : 0);
            break;
        }
        case 0xC1: { // CMP (Indirect,X)
            const addr = getIndirectXAddress(cpu);
            const value = readByte(cpu, addr);
            compare(cpu, cpu.a, value);
            cycles = 6;
            break;
        }
        case 0xD1: { // CMP (Indirect),Y
            const { address, pageCrossed } = getIndirectYAddress(cpu);
            const value = readByte(cpu, address);
            compare(cpu, cpu.a, value);
            cycles = 5 + (pageCrossed ? 1 : 0);
            break;
        }
        
        case 0xE0: { // CPX Immediate
            const value = readByte(cpu, cpu.pc++);
            compare(cpu, cpu.x, value);
            cycles = 2;
            break;
        }
        case 0xE4: { // CPX Zero Page
            const addr = getZeroPageAddress(cpu);
            const value = readByte(cpu, addr);
            compare(cpu, cpu.x, value);
            cycles = 3;
            break;
        }
        case 0xEC: { // CPX Absolute
            const addr = getAbsoluteAddress(cpu);
            const value = readByte(cpu, addr);
            compare(cpu, cpu.x, value);
            cycles = 4;
            break;
        }
        
        case 0xC0: { // CPY Immediate
            const value = readByte(cpu, cpu.pc++);
            compare(cpu, cpu.y, value);
            cycles = 2;
            break;
        }
        case 0xC4: { // CPY Zero Page
            const addr = getZeroPageAddress(cpu);
            const value = readByte(cpu, addr);
            compare(cpu, cpu.y, value);
            cycles = 3;
            break;
        }
        case 0xCC: { // CPY Absolute
            const addr = getAbsoluteAddress(cpu);
            const value = readByte(cpu, addr);
            compare(cpu, cpu.y, value);
            cycles = 4;
            break;
        }
        
        // Increment and decrement operations
        case 0xE8: { // INX
            cpu.x = (cpu.x + 1) & 0xFF;
            updateZeroAndNegativeFlags(cpu, cpu.x);
            cycles = 2;
            break;
        }
        
        case 0xC8: { // INY
            cpu.y = (cpu.y + 1) & 0xFF;
            updateZeroAndNegativeFlags(cpu, cpu.y);
            cycles = 2;
            break;
        }
        
        case 0xCA: { // DEX
            cpu.x = (cpu.x - 1) & 0xFF;
            updateZeroAndNegativeFlags(cpu, cpu.x);
            cycles = 2;
            break;
        }
        
        case 0x88: { // DEY
            cpu.y = (cpu.y - 1) & 0xFF;
            updateZeroAndNegativeFlags(cpu, cpu.y);
            cycles = 2;
            break;
        }
        
        case 0xE6: { // INC Zero Page
            const addr = getZeroPageAddress(cpu);
            const value = (readByte(cpu, addr) + 1) & 0xFF;
            writeByte(cpu, addr, value);
            updateZeroAndNegativeFlags(cpu, value);
            cycles = 5;
            break;
        }
        
        case 0xF6: { // INC Zero Page,X
            const addr = getZeroPageXAddress(cpu);
            const value = (readByte(cpu, addr) + 1) & 0xFF;
            writeByte(cpu, addr, value);
            updateZeroAndNegativeFlags(cpu, value);
            cycles = 6;
            break;
        }
        
        case 0xEE: { // INC Absolute
            const addr = getAbsoluteAddress(cpu);
            const value = (readByte(cpu, addr) + 1) & 0xFF;
            writeByte(cpu, addr, value);
            updateZeroAndNegativeFlags(cpu, value);
            cycles = 6;
            break;
        }
        
        case 0xFE: { // INC Absolute,X
            const { address } = getAbsoluteXAddress(cpu);
            const value = (readByte(cpu, address) + 1) & 0xFF;
            writeByte(cpu, address, value);
            updateZeroAndNegativeFlags(cpu, value);
            cycles = 7;
            break;
        }
        
        case 0xC6: { // DEC Zero Page
            const addr = getZeroPageAddress(cpu);
            const value = (readByte(cpu, addr) - 1) & 0xFF;
            writeByte(cpu, addr, value);
            updateZeroAndNegativeFlags(cpu, value);
            cycles = 5;
            break;
        }
        
        case 0xD6: { // DEC Zero Page,X
            const addr = getZeroPageXAddress(cpu);
            const value = (readByte(cpu, addr) - 1) & 0xFF;
            writeByte(cpu, addr, value);
            updateZeroAndNegativeFlags(cpu, value);
            cycles = 6;
            break;
        }
        
        case 0xCE: { // DEC Absolute
            const addr = getAbsoluteAddress(cpu);
            const value = (readByte(cpu, addr) - 1) & 0xFF;
            writeByte(cpu, addr, value);
            updateZeroAndNegativeFlags(cpu, value);
            cycles = 6;
            break;
        }
        
        case 0xDE: { // DEC Absolute,X
            const { address } = getAbsoluteXAddress(cpu);
            const value = (readByte(cpu, address) - 1) & 0xFF;
            writeByte(cpu, address, value);
            updateZeroAndNegativeFlags(cpu, value);
            cycles = 7;
            break;
        }
        
        // Shift and rotate instructions
        case 0x0A: { // ASL A (Accumulator)
            // Get the bit that will be shifted out
            const carry = (cpu.a & 0x80) !== 0;
            
            // Shift left
            cpu.a = (cpu.a << 1) & 0xFF;
            
            // Set carry flag based on the bit that was shifted out
            if (carry) {
                cpu.p |= CARRY;
            } else {
                cpu.p &= ~CARRY;
            }
            
            updateZeroAndNegativeFlags(cpu, cpu.a);
            cycles = 2;
            break;
        }
        case 0x06: { // ASL Zero Page
            const addr = getZeroPageAddress(cpu);
            const value = readByte(cpu, addr);
            
            // Get the bit that will be shifted out
            const carry = (value & 0x80) !== 0;
            
            // Shift left
            const result = (value << 1) & 0xFF;
            writeByte(cpu, addr, result);
            
            // Set carry flag based on the bit that was shifted out
            if (carry) {
                cpu.p |= CARRY;
            } else {
                cpu.p &= ~CARRY;
            }
            
            updateZeroAndNegativeFlags(cpu, result);
            cycles = 5;
            break;
        }
        case 0x16: { // ASL Zero Page,X
            const addr = getZeroPageXAddress(cpu);
            const value = readByte(cpu, addr);
            
            // Get the bit that will be shifted out
            const carry = (value & 0x80) !== 0;
            
            // Shift left
            const result = (value << 1) & 0xFF;
            writeByte(cpu, addr, result);
            
            // Set carry flag based on the bit that was shifted out
            if (carry) {
                cpu.p |= CARRY;
            } else {
                cpu.p &= ~CARRY;
            }
            
            updateZeroAndNegativeFlags(cpu, result);
            cycles = 6;
            break;
        }
        case 0x0E: { // ASL Absolute
            const addr = getAbsoluteAddress(cpu);
            const value = readByte(cpu, addr);
            
            // Get the bit that will be shifted out
            const carry = (value & 0x80) !== 0;
            
            // Shift left
            const result = (value << 1) & 0xFF;
            writeByte(cpu, addr, result);
            
            // Set carry flag based on the bit that was shifted out
            if (carry) {
                cpu.p |= CARRY;
            } else {
                cpu.p &= ~CARRY;
            }
            
            updateZeroAndNegativeFlags(cpu, result);
            cycles = 6;
            break;
        }
        case 0x1E: { // ASL Absolute,X
            const { address } = getAbsoluteXAddress(cpu);
            const value = readByte(cpu, address);
            
            // Get the bit that will be shifted out
            const carry = (value & 0x80) !== 0;
            
            // Shift left
            const result = (value << 1) & 0xFF;
            writeByte(cpu, address, result);
            
            // Set carry flag based on the bit that was shifted out
            if (carry) {
                cpu.p |= CARRY;
            } else {
                cpu.p &= ~CARRY;
            }
            
            updateZeroAndNegativeFlags(cpu, result);
            cycles = 7;
            break;
        }
        
        case 0x4A: { // LSR A (Accumulator)
            // Get the bit that will be shifted out
            const carry = (cpu.a & 0x01) !== 0;
            
            // Shift right
            cpu.a = (cpu.a >> 1) & 0xFF;
            
            // Set carry flag based on the bit that was shifted out
            if (carry) {
                cpu.p |= CARRY;
            } else {
                cpu.p &= ~CARRY;
            }
            
            updateZeroAndNegativeFlags(cpu, cpu.a);
            cycles = 2;
            break;
        }
        case 0x46: { // LSR Zero Page
            const addr = getZeroPageAddress(cpu);
            const value = readByte(cpu, addr);
            
            // Get the bit that will be shifted out
            const carry = (value & 0x01) !== 0;
            
            // Shift right
            const result = (value >> 1) & 0xFF;
            writeByte(cpu, addr, result);
            
            // Set carry flag based on the bit that was shifted out
            if (carry) {
                cpu.p |= CARRY;
            } else {
                cpu.p &= ~CARRY;
            }
            
            updateZeroAndNegativeFlags(cpu, result);
            cycles = 5;
            break;
        }
        case 0x56: { // LSR Zero Page,X
            const addr = getZeroPageXAddress(cpu);
            const value = readByte(cpu, addr);
            
            // Get the bit that will be shifted out
            const carry = (value & 0x01) !== 0;
            
            // Shift right
            const result = (value >> 1) & 0xFF;
            writeByte(cpu, addr, result);
            
            // Set carry flag based on the bit that was shifted out
            if (carry) {
                cpu.p |= CARRY;
            } else {
                cpu.p &= ~CARRY;
            }
            
            updateZeroAndNegativeFlags(cpu, result);
            cycles = 6;
            break;
        }
        case 0x4E: { // LSR Absolute
            const addr = getAbsoluteAddress(cpu);
            const value = readByte(cpu, addr);
            
            // Get the bit that will be shifted out
            const carry = (value & 0x01) !== 0;
            
            // Shift right
            const result = (value >> 1) & 0xFF;
            writeByte(cpu, addr, result);
            
            // Set carry flag based on the bit that was shifted out
            if (carry) {
                cpu.p |= CARRY;
            } else {
                cpu.p &= ~CARRY;
            }
            
            updateZeroAndNegativeFlags(cpu, result);
            cycles = 6;
            break;
        }
        case 0x5E: { // LSR Absolute,X
            const { address } = getAbsoluteXAddress(cpu);
            const value = readByte(cpu, address);
            
            // Get the bit that will be shifted out
            const carry = (value & 0x01) !== 0;
            
            // Shift right
            const result = (value >> 1) & 0xFF;
            writeByte(cpu, address, result);
            
            // Set carry flag based on the bit that was shifted out
            if (carry) {
                cpu.p |= CARRY;
            } else {
                cpu.p &= ~CARRY;
            }
            
            updateZeroAndNegativeFlags(cpu, result);
            cycles = 7;
            break;
        }
        
        case 0x2A: { // ROL A (Accumulator)
            // Get the current state of the carry flag
            const oldCarry = (cpu.p & CARRY) !== 0 ? 1 : 0;
            
            // Get the bit that will be shifted out
            const newCarry = (cpu.a & 0x80) !== 0;
            
            // Rotate left: shift left and add old carry to bit 0
            cpu.a = ((cpu.a << 1) | oldCarry) & 0xFF;
            
            // Set carry flag based on the bit that was shifted out
            if (newCarry) {
                cpu.p |= CARRY;
            } else {
                cpu.p &= ~CARRY;
            }
            
            updateZeroAndNegativeFlags(cpu, cpu.a);
            cycles = 2;
            break;
        }
        case 0x26: { // ROL Zero Page
            const addr = getZeroPageAddress(cpu);
            const value = readByte(cpu, addr);
            
            // Get the current state of the carry flag
            const oldCarry = (cpu.p & CARRY) !== 0 ? 1 : 0;
            
            // Get the bit that will be shifted out
            const newCarry = (value & 0x80) !== 0;
            
            // Rotate left: shift left and add old carry to bit 0
            const result = ((value << 1) | oldCarry) & 0xFF;
            writeByte(cpu, addr, result);
            
            // Set carry flag based on the bit that was shifted out
            if (newCarry) {
                cpu.p |= CARRY;
            } else {
                cpu.p &= ~CARRY;
            }
            
            updateZeroAndNegativeFlags(cpu, result);
            cycles = 5;
            break;
        }
        case 0x36: { // ROL Zero Page,X
            const addr = getZeroPageXAddress(cpu);
            const value = readByte(cpu, addr);
            
            // Get the current state of the carry flag
            const oldCarry = (cpu.p & CARRY) !== 0 ? 1 : 0;
            
            // Get the bit that will be shifted out
            const newCarry = (value & 0x80) !== 0;
            
            // Rotate left: shift left and add old carry to bit 0
            const result = ((value << 1) | oldCarry) & 0xFF;
            writeByte(cpu, addr, result);
            
            // Set carry flag based on the bit that was shifted out
            if (newCarry) {
                cpu.p |= CARRY;
            } else {
                cpu.p &= ~CARRY;
            }
            
            updateZeroAndNegativeFlags(cpu, result);
            cycles = 6;
            break;
        }
        case 0x2E: { // ROL Absolute
            const addr = getAbsoluteAddress(cpu);
            const value = readByte(cpu, addr);
            
            // Get the current state of the carry flag
            const oldCarry = (cpu.p & CARRY) !== 0 ? 1 : 0;
            
            // Get the bit that will be shifted out
            const newCarry = (value & 0x80) !== 0;
            
            // Rotate left: shift left and add old carry to bit 0
            const result = ((value << 1) | oldCarry) & 0xFF;
            writeByte(cpu, addr, result);
            
            // Set carry flag based on the bit that was shifted out
            if (newCarry) {
                cpu.p |= CARRY;
            } else {
                cpu.p &= ~CARRY;
            }
            
            updateZeroAndNegativeFlags(cpu, result);
            cycles = 6;
            break;
        }
        case 0x3E: { // ROL Absolute,X
            const { address } = getAbsoluteXAddress(cpu);
            const value = readByte(cpu, address);
            
            // Get the current state of the carry flag
            const oldCarry = (cpu.p & CARRY) !== 0 ? 1 : 0;
            
            // Get the bit that will be shifted out
            const newCarry = (value & 0x80) !== 0;
            
            // Rotate left: shift left and add old carry to bit 0
            const result = ((value << 1) | oldCarry) & 0xFF;
            writeByte(cpu, address, result);
            
            // Set carry flag based on the bit that was shifted out
            if (newCarry) {
                cpu.p |= CARRY;
            } else {
                cpu.p &= ~CARRY;
            }
            
            updateZeroAndNegativeFlags(cpu, result);
            cycles = 7;
            break;
        }
        
        case 0x6A: { // ROR A (Accumulator)
            // Get the current state of the carry flag
            const oldCarry = (cpu.p & CARRY) !== 0 ? 0x80 : 0;
            
            // Get the bit that will be shifted out
            const newCarry = (cpu.a & 0x01) !== 0;
            
            // Rotate right: shift right and add old carry to bit 7
            cpu.a = ((cpu.a >> 1) | oldCarry) & 0xFF;
            
            // Set carry flag based on the bit that was shifted out
            if (newCarry) {
                cpu.p |= CARRY;
            } else {
                cpu.p &= ~CARRY;
            }
            
            updateZeroAndNegativeFlags(cpu, cpu.a);
            cycles = 2;
            break;
        }
        case 0x66: { // ROR Zero Page
            const addr = getZeroPageAddress(cpu);
            const value = readByte(cpu, addr);
            
            // Get the current state of the carry flag
            const oldCarry = (cpu.p & CARRY) !== 0 ? 0x80 : 0;
            
            // Get the bit that will be shifted out
            const newCarry = (value & 0x01) !== 0;
            
            // Rotate right: shift right and add old carry to bit 7
            const result = ((value >> 1) | oldCarry) & 0xFF;
            writeByte(cpu, addr, result);
            
            // Set carry flag based on the bit that was shifted out
            if (newCarry) {
                cpu.p |= CARRY;
            } else {
                cpu.p &= ~CARRY;
            }
            
            updateZeroAndNegativeFlags(cpu, result);
            cycles = 5;
            break;
        }
        case 0x76: { // ROR Zero Page,X
            const addr = getZeroPageXAddress(cpu);
            const value = readByte(cpu, addr);
            
            // Get the current state of the carry flag
            const oldCarry = (cpu.p & CARRY) !== 0 ? 0x80 : 0;
            
            // Get the bit that will be shifted out
            const newCarry = (value & 0x01) !== 0;
            
            // Rotate right: shift right and add old carry to bit 7
            const result = ((value >> 1) | oldCarry) & 0xFF;
            writeByte(cpu, addr, result);
            
            // Set carry flag based on the bit that was shifted out
            if (newCarry) {
                cpu.p |= CARRY;
            } else {
                cpu.p &= ~CARRY;
            }
            
            updateZeroAndNegativeFlags(cpu, result);
            cycles = 6;
            break;
        }
        case 0x6E: { // ROR Absolute
            const addr = getAbsoluteAddress(cpu);
            const value = readByte(cpu, addr);
            
            // Get the current state of the carry flag
            const oldCarry = (cpu.p & CARRY) !== 0 ? 0x80 : 0;
            
            // Get the bit that will be shifted out
            const newCarry = (value & 0x01) !== 0;
            
            // Rotate right: shift right and add old carry to bit 7
            const result = ((value >> 1) | oldCarry) & 0xFF;
            writeByte(cpu, addr, result);
            
            // Set carry flag based on the bit that was shifted out
            if (newCarry) {
                cpu.p |= CARRY;
            } else {
                cpu.p &= ~CARRY;
            }
            
            updateZeroAndNegativeFlags(cpu, result);
            cycles = 6;
            break;
        }
        case 0x7E: { // ROR Absolute,X
            const { address } = getAbsoluteXAddress(cpu);
            const value = readByte(cpu, address);
            
            // Get the current state of the carry flag
            const oldCarry = (cpu.p & CARRY) !== 0 ? 0x80 : 0;
            
            // Get the bit that will be shifted out
            const newCarry = (value & 0x01) !== 0;
            
            // Rotate right: shift right and add old carry to bit 7
            const result = ((value >> 1) | oldCarry) & 0xFF;
            writeByte(cpu, address, result);
            
            // Set carry flag based on the bit that was shifted out
            if (newCarry) {
                cpu.p |= CARRY;
            } else {
                cpu.p &= ~CARRY;
            }
            
            updateZeroAndNegativeFlags(cpu, result);
            cycles = 7;
            break;
        }
        
        // Jump and subroutine calls
        case 0x4C: { // JMP Absolute
            cpu.pc = getAbsoluteAddress(cpu);
            cycles = 3;
            break;
        }
        
        case 0x6C: { // JMP Indirect
            cpu.pc = getIndirectAddress(cpu);
            cycles = 5;
            break;
        }
        
        case 0x20: { // JSR Absolute
            // PC is already pointing to the second byte of instruction
            // We need to push PC+1 (which will point to the next instruction)
            // BUT the 6502 actually pushes the address BEFORE the next instruction
            const returnAddress = cpu.pc + 1 - 2;
            pushWord(cpu, returnAddress);
            
            // Jump to the target address
            cpu.pc = getAbsoluteAddress(cpu);
            cycles = 6;
            break;
        }
        
        case 0x60: { // RTS
            // Pull return address from stack and add 1 
            // The address on the stack is actually PC-1, so we need to add 2
            // to get to the instruction after the JSR
            cpu.pc = pullWord(cpu) + 2;
            cycles = 6;
            break;
        }
        
        // Status flag operations
        case 0x18: { // CLC - Clear Carry Flag
            cpu.p &= ~CARRY;
            cycles = 2;
            break;
        }
        
        case 0x38: { // SEC - Set Carry Flag
            cpu.p |= CARRY;
            cycles = 2;
            break;
        }
        
        case 0x58: { // CLI - Clear Interrupt Disable
            cpu.p &= ~INTERRUPT;
            cycles = 2;
            break;
        }
        
        case 0x78: { // SEI - Set Interrupt Disable
            cpu.p |= INTERRUPT;
            cycles = 2;
            break;
        }
        
        case 0xB8: { // CLV - Clear Overflow Flag
            cpu.p &= ~OVERFLOW;
            cycles = 2;
            break;
        }
        
        case 0xD8: { // CLD - Clear Decimal Mode
            cpu.p &= ~DECIMAL;
            cycles = 2;
            break;
        }
        
        case 0xF8: { // SED - Set Decimal Mode
            cpu.p |= DECIMAL;
            cycles = 2;
            break;
        }
        
        // Branch instructions
        case 0x90: { // BCC - Branch if Carry Clear
            const offset = readByte(cpu, cpu.pc++);
            if ((cpu.p & CARRY) === 0) {
                const oldPc = cpu.pc;
                // Branch offset is signed
                cpu.pc = (cpu.pc + ((offset & 0x80) ? (offset - 256) : offset)) & 0xFFFF;
                cycles = 3 + ((oldPc & 0xFF00) !== (cpu.pc & 0xFF00) ? 1 : 0);
            } else {
                cycles = 2;
            }
            break;
        }
        
        case 0xB0: { // BCS - Branch if Carry Set
            const offset = readByte(cpu, cpu.pc++);
            if ((cpu.p & CARRY) !== 0) {
                const oldPc = cpu.pc;
                // Branch offset is signed
                cpu.pc = (cpu.pc + ((offset & 0x80) ? (offset - 256) : offset)) & 0xFFFF;
                cycles = 3 + ((oldPc & 0xFF00) !== (cpu.pc & 0xFF00) ? 1 : 0);
            } else {
                cycles = 2;
            }
            break;
        }
        
        case 0xF0: { // BEQ - Branch if Equal (Zero Set)
            const offset = readByte(cpu, cpu.pc++);
            if ((cpu.p & ZERO) !== 0) {
                const oldPc = cpu.pc;
                // Branch offset is signed
                cpu.pc = (cpu.pc + ((offset & 0x80) ? (offset - 256) : offset)) & 0xFFFF;
                cycles = 3 + ((oldPc & 0xFF00) !== (cpu.pc & 0xFF00) ? 1 : 0);
            } else {
                cycles = 2;
            }
            break;
        }
        
        case 0xD0: { // BNE - Branch if Not Equal (Zero Clear)
            const offset = readByte(cpu, cpu.pc++);
            if ((cpu.p & ZERO) === 0) {
                const oldPc = cpu.pc;
                // Branch offset is signed
                cpu.pc = (cpu.pc + ((offset & 0x80) ? (offset - 256) : offset)) & 0xFFFF;
                cycles = 3 + ((oldPc & 0xFF00) !== (cpu.pc & 0xFF00) ? 1 : 0);
            } else {
                cycles = 2;
            }
            break;
        }
        
        case 0x30: { // BMI - Branch if Minus (Negative Set)
            const offset = readByte(cpu, cpu.pc++);
            if ((cpu.p & NEGATIVE) !== 0) {
                const oldPc = cpu.pc;
                // Branch offset is signed
                cpu.pc = (cpu.pc + ((offset & 0x80) ? (offset - 256) : offset)) & 0xFFFF;
                cycles = 3 + ((oldPc & 0xFF00) !== (cpu.pc & 0xFF00) ? 1 : 0);
            } else {
                cycles = 2;
            }
            break;
        }
        
        case 0x10: { // BPL - Branch if Plus (Negative Clear)
            const offset = readByte(cpu, cpu.pc++);
            if ((cpu.p & NEGATIVE) === 0) {
                const oldPc = cpu.pc;
                // Branch offset is signed
                cpu.pc = (cpu.pc + ((offset & 0x80) ? (offset - 256) : offset)) & 0xFFFF;
                cycles = 3 + ((oldPc & 0xFF00) !== (cpu.pc & 0xFF00) ? 1 : 0);
            } else {
                cycles = 2;
            }
            break;
        }
        
        case 0x50: { // BVC - Branch if Overflow Clear
            const offset = readByte(cpu, cpu.pc++);
            if ((cpu.p & OVERFLOW) === 0) {
                const oldPc = cpu.pc;
                // Branch offset is signed
                cpu.pc = (cpu.pc + ((offset & 0x80) ? (offset - 256) : offset)) & 0xFFFF;
                cycles = 3 + ((oldPc & 0xFF00) !== (cpu.pc & 0xFF00) ? 1 : 0);
            } else {
                cycles = 2;
            }
            break;
        }
        
        case 0x70: { // BVS - Branch if Overflow Set
            const offset = readByte(cpu, cpu.pc++);
            if ((cpu.p & OVERFLOW) !== 0) {
                const oldPc = cpu.pc;
                // Branch offset is signed
                cpu.pc = (cpu.pc + ((offset & 0x80) ? (offset - 256) : offset)) & 0xFFFF;
                cycles = 3 + ((oldPc & 0xFF00) !== (cpu.pc & 0xFF00) ? 1 : 0);
            } else {
                cycles = 2;
            }
            break;
        }
        
        // System functions
        case 0x00: { // BRK - Force Interrupt
            // PC increments by 1 already when opcode is fetched, need to increment by 1 more
            // (BRK is a 2-byte instruction, 2nd byte is padding)
            cpu.pc++;
            
            // Push program counter (effectively PC+2 from original BRK position)
            pushWord(cpu, cpu.pc);
            
            // Push processor status with B flag set
            pushByte(cpu, cpu.p | BREAK | UNUSED);
            
            // Set the interrupt disable flag
            cpu.p |= INTERRUPT;
            
            // Load interrupt vector from FFFE-FFFF
            cpu.pc = readWord(cpu, 0xFFFE);
            
            cycles = 7;
            break;
        }
        
        case 0x40: { // RTI - Return from Interrupt
            // Pull processor status from stack (ignore B flag, keep UNUSED set)
            cpu.p = (pullByte(cpu) & ~BREAK) | UNUSED;
            
            // Pull program counter from stack (low byte first, then high byte)
            cpu.pc = pullWord(cpu);
            
            cycles = 6;
            break;
        }
        
        case 0xEA: { // NOP - No Operation
            cycles = 2;
            break;
        }
        
        default:
            if (trace) {
                console.log(`Unknown opcode: ${opcode.toString(16)}`);
            }
            // Default to 2 cycles for unknown instructions
            cycles = 2;
            break;
    }
    
    return cycles;
}
