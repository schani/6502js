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

export function step6502(s: CPU, trace = false): number /* cycles (approx) */ {
    // FIXME: implement
}
