/*  tiny-6502.ts – "good-enough" 6502 core for MS BASIC
    — Mark Probst, 2025-04-24                                               */

import type { CPU, CPUState } from "./cpu-interface.ts";
import { createCPUState } from "./cpu-interface.ts";
import { CARRY, ZERO, INTERRUPT, DECIMAL, BREAK, UNUSED, OVERFLOW, NEGATIVE } from "./constants.ts";
import { defined } from "@glideapps/ts-necessities";
import { disassemble } from "../utils/disasm.ts";

/**
 * Lightweight implementation of the 6502 CPU
 */
export class CPU2 implements CPU {
    private state: CPUState;
    private mem: Uint8Array;

    constructor() {
        this.state = createCPUState();
        this.mem = new Uint8Array(65536);
    }

    /**
     * Get the current CPU state
     */
    async getState(): Promise<CPUState> {
        return this.state;
    }

    /**
     * Reset the CPU to initial state
     */
    async reset(): Promise<void> {
        const mem = this.mem;
        this.state = createCPUState();
        this.mem = mem;
    }

    /**
     * Execute a single CPU instruction
     * @param trace Whether to log trace information during execution
     */
    async step(trace = false): Promise<void> {
        await step6502(this.state, this.mem, this, trace);
    }

    /**
     * Load a byte into memory
     * @param address Memory address
     * @param value Byte value to load
     */
    async loadByte(address: number, value: number): Promise<void> {
        this.mem[address & 0xffff] = value & 0xff;
    }

    /**
     * Load a word (16-bit value) into memory
     * @param address Memory address for low byte
     * @param value 16-bit value to load
     */
    async loadWord(address: number, value: number): Promise<void> {
        this.mem[address & 0xffff] = value & 0xff;
        this.mem[(address + 1) & 0xffff] = (value >> 8) & 0xff;
    }

    /**
     * Read a byte from memory
     * @param address Memory address
     * @returns Byte value at address
     */
    async readByte(address: number): Promise<number> {
        return defined(this.mem[address & 0xffff]);
    }

    /**
     * Read a word (16-bit value) from memory
     * @param address Memory address of low byte
     * @returns 16-bit value
     */
    async readWord(address: number): Promise<number> {
        const lo = defined(this.mem[address & 0xffff]);
        const hi = defined(this.mem[(address + 1) & 0xffff]);
        return (hi << 8) | lo;
    }

    /**
     * Set the program counter
     * @param address New program counter value
     */
    async setProgramCounter(address: number): Promise<void> {
        this.state.pc = address & 0xffff;
    }

    /**
     * Set the accumulator register
     * @param value Value to set
     */
    async setAccumulator(value: number): Promise<void> {
        this.state.a = value & 0xff;
    }

    /**
     * Set the X index register
     * @param value Value to set
     */
    async setXRegister(value: number): Promise<void> {
        this.state.x = value & 0xff;
    }

    /**
     * Set the Y index register
     * @param value Value to set
     */
    async setYRegister(value: number): Promise<void> {
        this.state.y = value & 0xff;
    }

    /**
     * Set the stack pointer
     * @param value Value to set
     */
    async setStackPointer(value: number): Promise<void> {
        this.state.sp = value & 0xff;
    }

    /**
     * Set the status register
     * @param value Value to set
     */
    async setStatusRegister(value: number): Promise<void> {
        this.state.p = value & 0xff;
    }

    /**
     * Set status flag bits
     * @param mask Bit mask of flags to set
     */
    async setStatusFlag(mask: number): Promise<void> {
        this.state.p |= mask & 0xff;
    }

    /**
     * Clear status flag bits
     * @param mask Bit mask of flags to clear
     */
    async clearStatusFlag(mask: number): Promise<void> {
        this.state.p &= ~(mask & 0xff);
    }

}

/* ─────────────────── helpers ─────────────────── */

let CURRENT_MEM_CPU2: Uint8Array;
const rd = (s: CPUState, a: number) => defined(CURRENT_MEM_CPU2[a & 0xffff]);
const wr = (s: CPUState, a: number, v: number) => {
    CURRENT_MEM_CPU2[a & 0xffff] = v & 0xff;
};
const rd16 = (s: CPUState, a: number) => rd(s, a) | (rd(s, a + 1) << 8);
const rd16bug = (
    s: CPUState,
    a: number, // 6502 JMP-(addr) page-bug
) => rd(s, a) | (rd(s, (a & 0xff00) | ((a + 1) & 0xff)) << 8);

const push = (s: CPUState, v: number) => {
    wr(s, 0x100 | s.sp, v);
    s.sp = (s.sp - 1) & 0xff;
};
const pop = (s: CPUState) => {
    s.sp = (s.sp + 1) & 0xff;
    return rd(s, 0x100 | s.sp);
};

const setZN = (s: CPUState, v: number) => {
    v &= 0xff;
    s.p = (s.p & ~(ZERO | NEGATIVE)) | (v === 0 ? ZERO : 0) | (v & 0x80);
    return v;
};

/* ADC / SBC with BCD if D-flag set */
const adc = (s: CPUState, v: number) => {
    const c = s.p & CARRY ? 1 : 0;
    if (s.p & DECIMAL) {
        /* BCD */
        let lo = (s.a & 0x0f) + (v & 0x0f) + c;
        let hi = (s.a >> 4) + (v >> 4);
        if (lo > 9) {
            lo -= 10;
            hi += 1;
        }
        s.p = (s.p & ~CARRY) | (hi > 9 ? CARRY : 0);
        if (hi > 9) hi -= 10;
        s.a = setZN(s, (hi << 4) | lo);
    } else {
        /* binary */
        const r = s.a + v + c;
        s.p =
            (s.p & ~(CARRY | OVERFLOW)) |
            (r > 0xff ? CARRY : 0) |
            (~(s.a ^ v) & (s.a ^ r) & 0x80 ? OVERFLOW : 0);
        s.a = setZN(s, r);
    }
};

const sbc = (s: CPUState, v: number) => {
    if (s.p & DECIMAL) {
        // BCD mode subtraction
        const borrowIn = s.p & CARRY ? 0 : 1; // carry set means no borrow

        let lo = (s.a & 0x0f) - (v & 0x0f) - borrowIn;
        let hiBorrow = 0;
        if (lo < 0) {
            lo += 10;
            hiBorrow = 1;
        }

        let hi = (s.a >> 4) - (v >> 4) - hiBorrow;
        if (hi < 0) {
            hi += 10;
            // borrow out, clear carry
            s.p &= ~CARRY;
        } else {
            // no borrow – set carry
            s.p |= CARRY;
        }

        s.a = setZN(s, ((hi & 0x0f) << 4) | (lo & 0x0f));
    } else {
        adc(s, ~v & 0xff);
    }
};

/* generic shift/rotate for memory, shared by multiple opcodes */
const shiftMemOp = (
    s: CPUState,
    addr: number,
    left: boolean,
    thruCarry: boolean,
) => {
    let v = rd(s, addr);
    const inC = s.p & CARRY ? 1 : 0;
    const outC = left ? (v >> 7) & 1 : v & 1;
    v = left
        ? ((v << 1) & 0xff) | (thruCarry ? inC : 0)
        : (v >> 1) | (thruCarry ? inC << 7 : 0);
    wr(s, addr, v);
    s.p = (s.p & ~CARRY) | outC;
    setZN(s, v);
};

/* ─────────────────── addressing helpers ─────────────────── */

const zp = (s: CPUState) => { const addr = s.pc; s.pc = (s.pc + 1) & 0xffff; return rd(s, addr) & 0xff; };
const abs16 = (s: CPUState) => {
    const a = rd16(s, s.pc);
    s.pc = (s.pc + 2) & 0xffff;
    return a;
};
const imm8 = (s: CPUState) => { const addr = s.pc; s.pc = (s.pc + 1) & 0xffff; return rd(s, addr); };
const indx = (s: CPUState) => {
    const addr = s.pc; s.pc = (s.pc + 1) & 0xffff;
    const p = (rd(s, addr) + s.x) & 0xff;
    return rd16(s, p);
};
const indy = (s: CPUState) => {
    const addr = s.pc; s.pc = (s.pc + 1) & 0xffff;
    const p = rd(s, addr) & 0xff;
    return (rd16(s, p) + s.y) & 0xffff;
};
const zpx = (s: CPUState) => (zp(s) + s.x) & 0xff;
const zpy = (s: CPUState) => (zp(s) + s.y) & 0xff;
const absx = (s: CPUState) => (abs16(s) + s.x) & 0xffff;
const absy = (s: CPUState) => (abs16(s) + s.y) & 0xffff;

/* ─────────────────── one-instruction executor ─────────────────── */

export async function step6502(
    s: CPUState,
    mem: Uint8Array,
    cpuInterface: CPU | null,
    trace = false,
): Promise<void> {
    CURRENT_MEM_CPU2 = mem;
    const opPC = s.pc;
    const op = rd(s, s.pc); s.pc = (s.pc + 1) & 0xffff;

    if (trace && cpuInterface) {
        const [text] = await disassemble(cpuInterface, opPC);
        console.log(
            opPC.toString(16).padStart(4, "0"),
            op.toString(16).padStart(2, "0"),
            text.padEnd(15),
            `A=${s.a.toString(16).padStart(2, "0")} X=${s.x
                .toString(16)
                .padStart(2, "0")} Y=${s.y
                .toString(16)
                .padStart(2, "0")} P=${s.p
                .toString(16)
                .padStart(2, "0")} SP=${s.sp.toString(16).padStart(2, "0")}`,
        );
    }
    switch (op) {
        /* ---------- BRK - Force Break ---------- */
        case 0x00: {
            // BRK - Software Interrupt
            // PC has already been incremented once after opcode fetch
            // Push PC+1 to stack (which equals original PC+2)
            const nextPC = (s.pc + 1) & 0xffff;
            push(s, (nextPC >> 8) & 0xff);
            push(s, nextPC & 0xff);

            // Push status with break and unused flags set
            push(s, s.p | BREAK | UNUSED);

            // Set interrupt disable flag
            s.p |= INTERRUPT;

            // Load IRQ vector from 0xFFFE-0xFFFF and jump
            s.pc = rd16(s, 0xfffe);
            return;
        }

        /* ---------- load/store/transfer ---------- */
        case 0xa9:
            s.a = setZN(s, imm8(s));
            return; // LDA #
        case 0xa5:
            s.a = setZN(s, rd(s, zp(s)));
            return; // LDA zp
        case 0xb5:
            s.a = setZN(s, rd(s, zpx(s)));
            return;
        case 0xad:
            s.a = setZN(s, rd(s, abs16(s)));
            return;
        case 0xbd:
            s.a = setZN(s, rd(s, absx(s)));
            return;
        case 0xb9:
            s.a = setZN(s, rd(s, absy(s)));
            return;
        case 0xa1:
            s.a = setZN(s, rd(s, indx(s)));
            return;
        case 0xb1:
            s.a = setZN(s, rd(s, indy(s)));
            return;
        case 0xa2:
            s.x = setZN(s, imm8(s));
            return; // LDX #
        case 0xa6:
            s.x = setZN(s, rd(s, zp(s)));
            return;
        case 0xb6:
            s.x = setZN(s, rd(s, zpy(s)));
            return;
        case 0xae:
            s.x = setZN(s, rd(s, abs16(s)));
            return;
        case 0xbe:
            s.x = setZN(s, rd(s, absy(s)));
            return;
        case 0xa0:
            s.y = setZN(s, imm8(s));
            return; // LDY #
        case 0xa4:
            s.y = setZN(s, rd(s, zp(s)));
            return;
        case 0xb4:
            s.y = setZN(s, rd(s, zpx(s)));
            return;
        case 0xac:
            s.y = setZN(s, rd(s, abs16(s)));
            return;
        case 0xbc:
            s.y = setZN(s, rd(s, absx(s)));
            return;
        case 0x85:
            wr(s, zp(s), s.a);
            return; // STA
        case 0x95:
            wr(s, zpx(s), s.a);
            return;
        case 0x8d:
            wr(s, abs16(s), s.a);
            return;
        case 0x9d:
            wr(s, absx(s), s.a);
            return;
        case 0x99:
            wr(s, absy(s), s.a);
            return;
        case 0x81:
            wr(s, indx(s), s.a);
            return;
        case 0x91:
            wr(s, indy(s), s.a);
            return;
        case 0x86:
            wr(s, zp(s), s.x);
            return; // STX
        case 0x96:
            wr(s, zpy(s), s.x);
            return;
        case 0x8e:
            wr(s, abs16(s), s.x);
            return;
        case 0x84:
            wr(s, zp(s), s.y);
            return; // STY
        case 0x94:
            wr(s, zpx(s), s.y);
            return;
        case 0x8c:
            wr(s, abs16(s), s.y);
            return;
        case 0xaa:
            s.x = setZN(s, s.a);
            return; // TAX
        case 0x8a:
            s.a = setZN(s, s.x);
            return; // TXA
        case 0xa8:
            s.y = setZN(s, s.a);
            return; // TAY
        case 0x98:
            s.a = setZN(s, s.y);
            return; // TYA
        case 0xba:
            s.x = setZN(s, s.sp);
            return; // TSX
        case 0x9a:
            s.sp = s.x;
            return; // TXS

        /* ---------- minimal arithmetic & branch ops (added to fix test
           coverage) ---------- */
        /* These opcodes are implemented again here because the large
           *logical/arith* & *branch* handler blocks further below were
           originally placed outside of a dedicated `case` label, making
           them unreachable.  Rather than reshuffle a few hundred lines in
           this patch we just provide the handful of instructions required
           by the current test-suite in a correct, self-contained form. */

        /* ADC #imm */
        case 0x69: {
            const value = imm8(s);
            adc(s, value);
            return;
        }

        /* SBC #imm */
        case 0xe9: {
            const value = imm8(s);
            sbc(s, value);
            return;
        }

        /* SEC – set carry */
        case 0x38:
            s.p |= CARRY;
            return;
        /* BEQ – branch if zero set (relative) */
        case 0xf0: {
            const offset = imm8(s);
            if (s.p & ZERO) {
                /* Offset is signed 8-bit */
                const rel = offset < 0x80 ? offset : offset - 0x100;
                s.pc = (s.pc + rel) & 0xffff;
            }
            return;
        }

        /* ---------- additional opcodes for extended tests ---------- */

        /* INX */
        case 0xe8:
            s.x = setZN(s, (s.x + 1) & 0xff);
            return;
        /* ASL A – shift accumulator left */
        case 0x0a: {
            const old = s.a;
            s.p = (s.p & ~CARRY) | ((old >> 7) & 1);
            s.a = setZN(s, (old << 1) & 0xff);
            return;
        }

        /* LSR A – logical shift right */
        case 0x4a: {
            const old = s.a;
            s.p = (s.p & ~CARRY) | (old & 1);
            s.a = setZN(s, old >> 1);
            return;
        }

        /* ROL A – rotate left through carry */
        case 0x2a: {
            const old = s.a;
            const carryIn = s.p & CARRY ? 1 : 0;
            const outC = (old >> 7) & 1;
            s.a = setZN(s, ((old << 1) & 0xff) | carryIn);
            s.p = (s.p & ~CARRY) | outC;
            return;
        }

        /* ROR A – rotate right through carry */
        case 0x6a: {
            const old = s.a;
            const carryIn = s.p & CARRY ? 1 : 0;
            const outC = old & 1;
            s.a = setZN(s, (old >> 1) | (carryIn << 7));
            s.p = (s.p & ~CARRY) | outC;
            return;
        }

        /* CMP #imm */
        case 0xc9: {
            const val = imm8(s);
            const r = (s.a - val) & 0x1ff;
            s.p =
                (s.p & ~(CARRY | ZERO | NEGATIVE)) |
                (r < 0x100 ? CARRY : 0) |
                ((r & 0xff) === 0 ? ZERO : 0) |
                (r & 0x80);
            return;
        }

        /* CPX #imm */
        case 0xe0: {
            const val = imm8(s);
            const r = (s.x - val) & 0x1ff;
            s.p =
                (s.p & ~(CARRY | ZERO | NEGATIVE)) |
                (r < 0x100 ? CARRY : 0) |
                ((r & 0xff) === 0 ? ZERO : 0) |
                (r & 0x80);
            return;
        }

        /* CPX zero-page */
        case 0xe4: {
            const val = rd(s, zp(s));
            const r = (s.x - val) & 0x1ff;
            s.p =
                (s.p & ~(CARRY | ZERO | NEGATIVE)) |
                (r < 0x100 ? CARRY : 0) |
                ((r & 0xff) === 0 ? ZERO : 0) |
                (r & 0x80);
            return;
        }

        /* CPX absolute */
        case 0xec: {
            const val = rd(s, abs16(s));
            const r = (s.x - val) & 0x1ff;
            s.p =
                (s.p & ~(CARRY | ZERO | NEGATIVE)) |
                (r < 0x100 ? CARRY : 0) |
                ((r & 0xff) === 0 ? ZERO : 0) |
                (r & 0x80);
            return;
        }

        /* CPY absolute */
        case 0xcc: {
            const val = rd(s, abs16(s));
            const r = (s.y - val) & 0x1ff;
            s.p =
                (s.p & ~(CARRY | ZERO | NEGATIVE)) |
                (r < 0x100 ? CARRY : 0) |
                ((r & 0xff) === 0 ? ZERO : 0) |
                (r & 0x80);
            return;
        }

        /* CMP memory addressing modes */
        case 0xc5: {
            const val = rd(s, zp(s));
            const r = (s.a - val) & 0x1ff;
            s.p =
                (s.p & ~(CARRY | ZERO | NEGATIVE)) |
                (r < 0x100 ? CARRY : 0) |
                (r & 0xff ? 0 : ZERO) |
                (r & 0x80);
            return;
        }
        case 0xd5: {
            const val = rd(s, zpx(s));
            const r = (s.a - val) & 0x1ff;
            s.p =
                (s.p & ~(CARRY | ZERO | NEGATIVE)) |
                (r < 0x100 ? CARRY : 0) |
                (r & 0xff ? 0 : ZERO) |
                (r & 0x80);
            return;
        }
        case 0xcd: {
            const val = rd(s, abs16(s));
            const r = (s.a - val) & 0x1ff;
            s.p =
                (s.p & ~(CARRY | ZERO | NEGATIVE)) |
                (r < 0x100 ? CARRY : 0) |
                (r & 0xff ? 0 : ZERO) |
                (r & 0x80);
            return;
        }
        case 0xdd: {
            const val = rd(s, absx(s));
            const r = (s.a - val) & 0x1ff;
            s.p =
                (s.p & ~(CARRY | ZERO | NEGATIVE)) |
                (r < 0x100 ? CARRY : 0) |
                (r & 0xff ? 0 : ZERO) |
                (r & 0x80);
            return;
        }
        case 0xd9: {
            const val = rd(s, absy(s));
            const r = (s.a - val) & 0x1ff;
            s.p =
                (s.p & ~(CARRY | ZERO | NEGATIVE)) |
                (r < 0x100 ? CARRY : 0) |
                (r & 0xff ? 0 : ZERO) |
                (r & 0x80);
            return;
        }
        case 0xc1: {
            const val = rd(s, indx(s));
            const r = (s.a - val) & 0x1ff;
            s.p =
                (s.p & ~(CARRY | ZERO | NEGATIVE)) |
                (r < 0x100 ? CARRY : 0) |
                (r & 0xff ? 0 : ZERO) |
                (r & 0x80);
            return;
        }
        case 0xd1: {
            const val = rd(s, indy(s));
            const r = (s.a - val) & 0x1ff;
            s.p =
                (s.p & ~(CARRY | ZERO | NEGATIVE)) |
                (r < 0x100 ? CARRY : 0) |
                (r & 0xff ? 0 : ZERO) |
                (r & 0x80);
            return;
        }

        /* CPY #imm */
        case 0xc0: {
            const val = imm8(s);
            const r = (s.y - val) & 0x1ff;
            s.p =
                (s.p & ~(CARRY | ZERO | NEGATIVE)) |
                (r < 0x100 ? CARRY : 0) |
                ((r & 0xff) === 0 ? ZERO : 0) |
                (r & 0x80);
            return;
        }

        /* CPY zero-page */
        case 0xc4: {
            const val = rd(s, zp(s));
            const r = (s.y - val) & 0x1ff;
            s.p =
                (s.p & ~(CARRY | ZERO | NEGATIVE)) |
                (r < 0x100 ? CARRY : 0) |
                ((r & 0xff) === 0 ? ZERO : 0) |
                (r & 0x80);
            return;
        }

        /* BNE – branch if zero clear (relative) */
        case 0xd0: {
            const offset = imm8(s);
            if (!(s.p & ZERO)) {
                const rel = offset < 0x80 ? offset : offset - 0x100;
                s.pc = (s.pc + rel) & 0xffff;
            }
            return;
        }

        /* ---------- AND instructions (Logical AND with Accumulator) ---------- */
        case 0x29: {
            // AND immediate
            const value = imm8(s);
            s.a = setZN(s, s.a & value);
            return;
        }
        case 0x25: {
            // AND zero page
            const addr = zp(s);
            s.a = setZN(s, s.a & rd(s, addr));
            return;
        }
        case 0x35: {
            // AND zero page,X
            const addr = zpx(s);
            s.a = setZN(s, s.a & rd(s, addr));
            return;
        }
        case 0x2d: {
            // AND absolute
            const addr = abs16(s);
            s.a = setZN(s, s.a & rd(s, addr));
            return;
        }
        case 0x3d: {
            // AND absolute,X
            const addr = absx(s);
            s.a = setZN(s, s.a & rd(s, addr));
            return;
        }
        case 0x39: {
            // AND absolute,Y
            const addr = absy(s);
            s.a = setZN(s, s.a & rd(s, addr));
            return;
        }
        case 0x21: {
            // AND (indirect,X)
            const addr = indx(s);
            s.a = setZN(s, s.a & rd(s, addr));
            return;
        }
        case 0x31: {
            // AND (indirect),Y
            const addr = indy(s);
            s.a = setZN(s, s.a & rd(s, addr));
            return;
        }

        /* ---------- ORA instructions (Logical OR with Accumulator) ---------- */
        case 0x09: {
            // ORA immediate
            const value = imm8(s);
            s.a = setZN(s, s.a | value);
            return;
        }
        case 0x05: {
            // ORA zero page
            const addr = zp(s);
            s.a = setZN(s, s.a | rd(s, addr));
            return;
        }
        case 0x15: {
            // ORA zero page,X
            const addr = zpx(s);
            s.a = setZN(s, s.a | rd(s, addr));
            return;
        }
        case 0x0d: {
            // ORA absolute
            const addr = abs16(s);
            s.a = setZN(s, s.a | rd(s, addr));
            return;
        }
        case 0x1d: {
            // ORA absolute,X
            const addr = absx(s);
            s.a = setZN(s, s.a | rd(s, addr));
            return;
        }
        case 0x19: {
            // ORA absolute,Y
            const addr = absy(s);
            s.a = setZN(s, s.a | rd(s, addr));
            return;
        }
        case 0x01: {
            // ORA (indirect,X)
            const addr = indx(s);
            s.a = setZN(s, s.a | rd(s, addr));
            return;
        }
        case 0x11: {
            // ORA (indirect),Y
            const addr = indy(s);
            s.a = setZN(s, s.a | rd(s, addr));
            return;
        }

        /* ---------- EOR instructions (Logical Exclusive OR with Accumulator) ---------- */
        case 0x49: {
            // EOR immediate
            const value = imm8(s);
            s.a = setZN(s, s.a ^ value);
            return;
        }
        case 0x45: {
            // EOR zero page
            const addr = zp(s);
            s.a = setZN(s, s.a ^ rd(s, addr));
            return;
        }
        case 0x55: {
            // EOR zero page,X
            const addr = zpx(s);
            s.a = setZN(s, s.a ^ rd(s, addr));
            return;
        }
        case 0x4d: {
            // EOR absolute
            const addr = abs16(s);
            s.a = setZN(s, s.a ^ rd(s, addr));
            return;
        }
        case 0x5d: {
            // EOR absolute,X
            const addr = absx(s);
            s.a = setZN(s, s.a ^ rd(s, addr));
            return;
        }
        case 0x59: {
            // EOR absolute,Y
            const addr = absy(s);
            s.a = setZN(s, s.a ^ rd(s, addr));
            return;
        }
        case 0x41: {
            // EOR (indirect,X)
            const addr = indx(s);
            s.a = setZN(s, s.a ^ rd(s, addr));
            return;
        }
        case 0x51: {
            // EOR (indirect),Y
            const addr = indy(s);
            s.a = setZN(s, s.a ^ rd(s, addr));
            return;
        }

        /* ---------- ADC / SBC (zero-page) ---------- */
        case 0x65: {
            const addr = zp(s);
            adc(s, rd(s, addr));
            return;
        }
        case 0xe5: {
            const addr = zp(s);
            sbc(s, rd(s, addr));
            return;
        }

        /* ADC additional addressing modes */
        case 0x75: {
            const addr = zpx(s);
            adc(s, rd(s, addr));
            return;
        }
        case 0x7d: {
            const addr = absx(s);
            adc(s, rd(s, addr));
            return;
        }
        case 0x79: {
            const addr = absy(s);
            adc(s, rd(s, addr));
            return;
        }
        case 0x61: {
            const addr = indx(s);
            adc(s, rd(s, addr));
            return;
        }
        case 0x71: {
            const addr = indy(s);
            adc(s, rd(s, addr));
            return;
        }

        /* SBC additional addressing modes */
        case 0xf5: {
            const addr = zpx(s);
            sbc(s, rd(s, addr));
            return;
        }
        case 0xf9: {
            const addr = absy(s);
            sbc(s, rd(s, addr));
            return;
        }
        case 0xe1: {
            const addr = indx(s);
            sbc(s, rd(s, addr));
            return;
        }
        case 0xf1: {
            const addr = indy(s);
            sbc(s, rd(s, addr));
            return;
        }

        /* BIT – Zero-page & Absolute */
        case 0x24: {
            const v = rd(s, zp(s));
            s.p =
                (s.p & ~(NEGATIVE | OVERFLOW | ZERO)) |
                (v & 0xc0) |
                ((s.a & v) === 0 ? ZERO : 0);
            return;
        }
        case 0x2c: {
            const v = rd(s, abs16(s));
            s.p =
                (s.p & ~(NEGATIVE | OVERFLOW | ZERO)) |
                (v & 0xc0) |
                ((s.a & v) === 0 ? ZERO : 0);
            return;
        }

        /* ---------- Shifts & Rotates : Zero-page only ---------- */
        /* ASL $zp */
        case 0x06: {
            const addr = zp(s);
            const val = rd(s, addr);
            const outC = (val >> 7) & 1;
            const res = (val << 1) & 0xff;
            wr(s, addr, res);
            s.p = (s.p & ~CARRY) | outC;
            setZN(s, res);
            return;
        }
        /* LSR $zp */
        case 0x46: {
            const addr = zp(s);
            const val = rd(s, addr);
            const outC = val & 1;
            const res = val >> 1;
            wr(s, addr, res);
            s.p = (s.p & ~CARRY) | outC;
            setZN(s, res);
            return;
        }
        /* ROL $zp */
        case 0x26: {
            const addr = zp(s);
            const val = rd(s, addr);
            const inC = s.p & CARRY ? 1 : 0;
            const outC = (val >> 7) & 1;
            const res = ((val << 1) & 0xff) | inC;
            wr(s, addr, res);
            s.p = (s.p & ~CARRY) | outC;
            setZN(s, res);
            return;
        }
        /* ROR $zp */
        case 0x66: {
            const addr = zp(s);
            const val = rd(s, addr);
            const inC = s.p & CARRY ? 1 : 0;
            const outC = val & 1;
            const res = (val >> 1) | (inC << 7);
            wr(s, addr, res);
            s.p = (s.p & ~CARRY) | outC;
            setZN(s, res);
            return;
        }

        /* ASL $zp,X */
        case 0x16:
            shiftMemOp(s, zpx(s), true, false);
            return;
        /* LSR $zp,X */
        case 0x56:
            shiftMemOp(s, zpx(s), false, false);
            return;
        /* ROL $zp,X */
        case 0x36:
            shiftMemOp(s, zpx(s), true, true);
            return;
        /* ROR $zp,X */
        case 0x76:
            shiftMemOp(s, zpx(s), false, true);
            return;
        /* ---------- Shifts & Rotates : Absolute & Absolute,X ---------- */
        case 0x0e:
            shiftMemOp(s, abs16(s), true, false);
            return; // ASL abs
        case 0x1e:
            shiftMemOp(s, absx(s), true, false);
            return; // ASL abs,X
        case 0x4e:
            shiftMemOp(s, abs16(s), false, false);
            return; // LSR abs
        case 0x5e:
            shiftMemOp(s, absx(s), false, false);
            return; // LSR abs,X
        case 0x2e:
            shiftMemOp(s, abs16(s), true, true);
            return; // ROL abs
        case 0x3e:
            shiftMemOp(s, absx(s), true, true);
            return; // ROL abs,X
        case 0x6e:
            shiftMemOp(s, abs16(s), false, true); // ROR abs
            return;
        case 0x7e:
            shiftMemOp(s, absx(s), false, true); // ROR abs,X
            return;

        /* ---------- INC / DEC other addressing modes ---------- */
        case 0xf6: { // INC zp,X
            const a = zpx(s);
            const v = (rd(s, a) + 1) & 0xff;
            wr(s, a, v);
            setZN(s, v);
            return;
        }
        case 0xfe: { // INC abs,X
            const a = absx(s);
            const v = (rd(s, a) + 1) & 0xff;
            wr(s, a, v);
            setZN(s, v);
            return;
        }
        case 0xee: { // INC abs
            const a = abs16(s);
            const v = (rd(s, a) + 1) & 0xff;
            wr(s, a, v);
            setZN(s, v);
            return;
        }

        case 0xd6: { // DEC zp,X
            const a = zpx(s);
            const v = (rd(s, a) - 1) & 0xff;
            wr(s, a, v);
            setZN(s, v);
            return;
        }
        case 0xde: { // DEC abs,X
            const a = absx(s);
            const v = (rd(s, a) - 1) & 0xff;
            wr(s, a, v);
            setZN(s, v);
            return;
        }
        case 0xce: { // DEC abs
            const a = abs16(s);
            const v = (rd(s, a) - 1) & 0xff;
            wr(s, a, v);
            setZN(s, v);
            return;
        }

        /* ---------- Other Branches ---------- */
        case 0xb0: {
            // BCS
            const off = imm8(s);
            if (s.p & CARRY) {
                const rel = off < 0x80 ? off : off - 0x100;
                s.pc = (s.pc + rel) & 0xffff;
            }
            return;
        }
        case 0x50: {
            // BVC
            const off = imm8(s);
            if (!(s.p & OVERFLOW)) {
                const rel = off < 0x80 ? off : off - 0x100;
                s.pc = (s.pc + rel) & 0xffff;
            }
            return;
        }
        case 0x70: {
            // BVS
            const off = imm8(s);
            if (s.p & OVERFLOW) {
                const rel = off < 0x80 ? off : off - 0x100;
                s.pc = (s.pc + rel) & 0xffff;
            }
            return;
        }
        case 0x30: {
            // BMI
            const off = imm8(s);
            if (s.p & NEGATIVE) {
                const rel = off < 0x80 ? off : off - 0x100;
                s.pc = (s.pc + rel) & 0xffff;
            }
            return;
        }
        case 0x10: {
            // BPL
            const off = imm8(s);
            if (!(s.p & NEGATIVE)) {
                const rel = off < 0x80 ? off : off - 0x100;
                s.pc = (s.pc + rel) & 0xffff;
            }
            return;
        }

        /* ---------- Quick top-level handlers for remaining failing tests ---------- */

        /* ADC absolute */
        case 0x6d: {
            const addr = abs16(s);
            adc(s, rd(s, addr));
            return;
        }

        /* SBC absolute */
        case 0xed: {
            const addr = abs16(s);
            sbc(s, rd(s, addr));
            return;
        }

        /* JMP absolute */
        case 0x4c: {
            const target = abs16(s);
            s.pc = target;
            return;
        }

        /* JMP (indirect) – with 6502 page-boundary bug */
        case 0x6c: {
            const ptr = abs16(s);
            s.pc = rd16bug(s, ptr);
            return;
        }

        /* SBC abs,X */
        case 0xfd: {
            const addr = absx(s);
            sbc(s, rd(s, addr));
            return;
        }

        /* ---------- Stack shortcuts ---------- */
        case 0x48: // PHA
            push(s, s.a);
            return;
        case 0x68: // PLA
            s.a = setZN(s, pop(s));
            return;
        /* ---------- Subroutine handling ---------- */
        case 0x20: {
            // JSR abs - Jump to Subroutine
            // According to 6502 spec, JSR pushes PC+2-1 to stack (next instruction address - 1)
            // Save original PC before it's modified
            const oldPC = s.pc;

            // Get the target address (this advances PC by 2 internally)
            const targetAddress = abs16(s);

            // Calculate return address exactly as in CPU1
            const returnAddress = oldPC + 2 - 1;

            // Push high byte first, then low byte
            push(s, (returnAddress >> 8) & 0xff); // High byte
            push(s, returnAddress & 0xff); // Low byte

            // Jump to the target address
            s.pc = targetAddress;
            return;
        }
        case 0x60: {
            // RTS - Return from Subroutine
            // Pull 16-bit address from stack (low byte first, then high byte)
            const lo = pop(s);
            const hi = pop(s);

            // Set PC to the address plus 1 (per 6502 spec)
            // This corresponds to the original PC+2 value when JSR was called
            s.pc = ((hi << 8) | lo) + 1;
            return;
        }

        /* RTI - Return from Interrupt */
        case 0x40: {
            // Pull status register from stack (ignore B flag, keep U flag set)
            s.p = (pop(s) & ~BREAK) | UNUSED;

            // Pull program counter from stack (low byte first, then high byte)
            const lo = pop(s);
            const hi = pop(s);
            s.pc = (hi << 8) | lo;
            return;
        }

        /* PHP / PLP */
        case 0x08:
            push(s, s.p | BREAK | UNUSED);
            return;
        case 0x28:
            s.p = (pop(s) & ~BREAK) | UNUSED;
            // Removed setZN call - the PLP instruction doesn't affect Z/N based on A
            return;
        /* ---------- INC / DEC memory (zero-page) ---------- */
        case 0xe6: {
            const addr = zp(s);
            const res = (rd(s, addr) + 1) & 0xff;
            wr(s, addr, res);
            setZN(s, res);
            return;
        }
        case 0xc6: {
            const addr = zp(s);
            const res = (rd(s, addr) - 1) & 0xff;
            wr(s, addr, res);
            setZN(s, res);
            return;
        }

        /* ---------- Flag ops ---------- */
        case 0x18: // CLC
            s.p &= ~CARRY;
            return;
        case 0x58: // CLI – clear Interrupt Disable
            s.p &= ~INTERRUPT;
            return;
        case 0x78: // SEI – set Interrupt Disable
            s.p |= INTERRUPT;
            return;
        case 0xb8: // CLV – clear overflow
            s.p &= ~OVERFLOW;
            return;
        case 0xf8: // SED – set decimal flag
            s.p |= DECIMAL;
            return;
        case 0xd8: // CLD – clear decimal flag
            s.p &= ~DECIMAL;
            return;
        /* ---------- Branches ---------- */
        case 0x90: {
            // BCC
            const off = imm8(s);
            if (!(s.p & CARRY)) {
                const rel = off < 0x80 ? off : off - 0x100;
                s.pc = (s.pc + rel) & 0xffff;
            }
            return;
        }

        /* DEX - Decrement X register */
        case 0xca: {
            s.x = (s.x - 1) & 0xff;
            setZN(s, s.x);
            return;
        }

        /* INY - Increment Y register */
        case 0xc8: {
            s.y = (s.y + 1) & 0xff;
            setZN(s, s.y);
            return;
        }

        /* DEY - Decrement Y register */
        case 0x88: {
            s.y = (s.y - 1) & 0xff;
            setZN(s, s.y);
            return;
        }

        /* NOP - No Operation */
        case 0xea:
            return;
    }

    throw new Error(
        `Unknown opcode at ${s.pc.toString(16)}: ${op.toString(16)}`,
    );
}
