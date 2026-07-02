import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { CARRY, ZERO, OVERFLOW, NEGATIVE } from "../core/constants.ts";
import { createCPU } from "./utils.ts";
import type { CPU } from "../core/cpu-interface.ts";

const BRANCHES = [
    { op: 0x90, name: "BCC", flag: CARRY, takenWhenSet: false },
    { op: 0xb0, name: "BCS", flag: CARRY, takenWhenSet: true },
    { op: 0xf0, name: "BEQ", flag: ZERO, takenWhenSet: true },
    { op: 0xd0, name: "BNE", flag: ZERO, takenWhenSet: false },
    { op: 0x30, name: "BMI", flag: NEGATIVE, takenWhenSet: true },
    { op: 0x10, name: "BPL", flag: NEGATIVE, takenWhenSet: false },
    { op: 0x50, name: "BVC", flag: OVERFLOW, takenWhenSet: false },
    { op: 0x70, name: "BVS", flag: OVERFLOW, takenWhenSet: true },
] as const;

// Execute one branch instruction at `base` with the given offset byte and
// flag state, and return the resulting program counter.
async function runBranch(
    cpu: CPU,
    op: number,
    base: number,
    offset: number,
    flag: number,
    flagSet: boolean,
): Promise<number> {
    await cpu.loadByte(base, op);
    await cpu.loadByte(base + 1, offset);
    if (flagSet) await cpu.setStatusFlag(flag);
    else await cpu.clearStatusFlag(flag);
    await cpu.setProgramCounter(base);
    await cpu.step();
    return (await cpu.getState()).pc;
}

describe("Branch instructions", () => {
    for (const { op, name, flag, takenWhenSet } of BRANCHES) {
        it(`${name} should branch only when taken and handle all offsets`, async () => {
            const cpu = createCPU();

            // Taken, small positive offset
            assert.strictEqual(
                await runBranch(cpu, op, 0x1000, 0x10, flag, takenWhenSet),
                0x1012,
                `${name} taken`,
            );

            // Not taken: PC just advances past the instruction
            assert.strictEqual(
                await runBranch(cpu, op, 0x1000, 0x10, flag, !takenWhenSet),
                0x1002,
                `${name} not taken`,
            );

            // Taken, small negative offset (-3)
            assert.strictEqual(
                await runBranch(cpu, op, 0x1010, 0xfd, flag, takenWhenSet),
                0x100f,
                `${name} negative offset`,
            );

            // Taken, forward across a page boundary
            assert.strictEqual(
                await runBranch(cpu, op, 0x10f0, 0x20, flag, takenWhenSet),
                0x1112,
                `${name} forward page cross`,
            );

            // Taken, backward across a page boundary (-128)
            assert.strictEqual(
                await runBranch(cpu, op, 0x1010, 0x80, flag, takenWhenSet),
                0x0f92,
                `${name} backward page cross`,
            );
        });
    }

    it("should branch back to the instruction itself with offset -2", async () => {
        const cpu = createCPU();
        // BCC with offset -2 lands back on the BCC opcode
        assert.strictEqual(
            await runBranch(cpu, 0x90, 0x0080, 0xfe, CARRY, false),
            0x0080,
        );
    });
});
