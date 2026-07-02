import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { CARRY, ZERO, NEGATIVE } from "../core/constants.ts";
import { createCPU } from "./utils.ts";
import type { CPU } from "../core/cpu-interface.ts";

type Mode = "acc" | "zp" | "zpx" | "abs" | "absx";

interface ShiftOp {
    name: string;
    opcodes: Record<Mode, number>;
    // Expected result and carry-out for a value and incoming carry
    apply: (v: number, carryIn: number) => { result: number; carryOut: number };
}

const OPS: ShiftOp[] = [
    {
        name: "ASL",
        opcodes: { acc: 0x0a, zp: 0x06, zpx: 0x16, abs: 0x0e, absx: 0x1e },
        apply: (v) => ({ result: (v << 1) & 0xff, carryOut: (v >> 7) & 1 }),
    },
    {
        name: "LSR",
        opcodes: { acc: 0x4a, zp: 0x46, zpx: 0x56, abs: 0x4e, absx: 0x5e },
        apply: (v) => ({ result: v >> 1, carryOut: v & 1 }),
    },
    {
        name: "ROL",
        opcodes: { acc: 0x2a, zp: 0x26, zpx: 0x36, abs: 0x2e, absx: 0x3e },
        apply: (v, c) => ({ result: ((v << 1) & 0xff) | c, carryOut: (v >> 7) & 1 }),
    },
    {
        name: "ROR",
        opcodes: { acc: 0x6a, zp: 0x66, zpx: 0x76, abs: 0x6e, absx: 0x7e },
        apply: (v, c) => ({ result: (v >> 1) | (c << 7), carryOut: v & 1 }),
    },
];

// Values chosen to exercise carry-out, zero results, and negative results
const VALUES = [0x00, 0x01, 0x40, 0x55, 0x80, 0xff];

// Execute one shift/rotate at 0x1000 in the given addressing mode and
// return the resulting operand value and CPU state.
async function runShift(
    cpu: CPU,
    mode: Mode,
    opcode: number,
    value: number,
    carryIn: number,
): Promise<{ result: number; p: number }> {
    const base = 0x1000;
    await cpu.loadByte(base, opcode);
    if (carryIn) await cpu.setStatusFlag(CARRY);
    else await cpu.clearStatusFlag(CARRY);

    let target = -1; // memory address holding the operand, -1 for accumulator
    switch (mode) {
        case "acc":
            await cpu.setAccumulator(value);
            break;
        case "zp":
            await cpu.loadByte(base + 1, 0x50);
            target = 0x0050;
            break;
        case "zpx":
            await cpu.loadByte(base + 1, 0x50);
            await cpu.setXRegister(0x05);
            target = 0x0055;
            break;
        case "abs":
            await cpu.loadByte(base + 1, 0x00);
            await cpu.loadByte(base + 2, 0x20);
            target = 0x2000;
            break;
        case "absx":
            await cpu.loadByte(base + 1, 0x00);
            await cpu.loadByte(base + 2, 0x20);
            await cpu.setXRegister(0x05);
            target = 0x2005;
            break;
    }
    if (target >= 0) await cpu.loadByte(target, value);

    await cpu.setProgramCounter(base);
    await cpu.step();

    const state = await cpu.getState();
    const result = target >= 0 ? await cpu.readByte(target) : state.a;
    return { result, p: state.p };
}

describe("Shift and rotate instructions", () => {
    for (const op of OPS) {
        for (const mode of Object.keys(op.opcodes) as Mode[]) {
            it(`${op.name} ${mode} should shift correctly for all edge values`, async () => {
                const cpu = createCPU();
                for (const value of VALUES) {
                    for (const carryIn of [0, 1]) {
                        const expected = op.apply(value, carryIn);
                        const { result, p } = await runShift(
                            cpu,
                            mode,
                            op.opcodes[mode],
                            value,
                            carryIn,
                        );
                        const label = `${op.name} ${mode} value=$${value.toString(16)} C=${carryIn}`;
                        assert.strictEqual(result, expected.result, `${label}: result`);
                        assert.strictEqual(
                            (p & CARRY) !== 0,
                            expected.carryOut === 1,
                            `${label}: carry out`,
                        );
                        assert.strictEqual(
                            (p & ZERO) !== 0,
                            expected.result === 0,
                            `${label}: zero flag`,
                        );
                        assert.strictEqual(
                            (p & NEGATIVE) !== 0,
                            (expected.result & 0x80) !== 0,
                            `${label}: negative flag`,
                        );
                    }
                }
            });
        }
    }

    it("should wrap Zero Page,X addressing within the zero page", async () => {
        const cpu = createCPU();
        // ASL $FF,X with X=$10 shifts $000F, not $010F
        await cpu.loadByte(0x1000, 0x16); // ASL zp,X
        await cpu.loadByte(0x1001, 0xff);
        await cpu.loadByte(0x000f, 0x01);
        await cpu.setXRegister(0x10);
        await cpu.clearStatusFlag(CARRY);
        await cpu.setProgramCounter(0x1000);
        await cpu.step();
        assert.strictEqual(await cpu.readByte(0x000f), 0x02);
    });
});
