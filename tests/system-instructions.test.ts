import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
    BREAK,
    CARRY,
    DECIMAL,
    INTERRUPT,
    NEGATIVE,
    OVERFLOW,
    UNUSED,
    ZERO,
} from "../constants.ts";
import { createCPU, getStackPointer, getStatusRegister } from "./utils.ts";
import { defined } from "@glideapps/ts-necessities";

describe("System instructions", () => {
    it("should perform BRK instruction", async () => {
        const cpu = createCPU();

        // Initial state
        await cpu.setProgramCounter(0x1000);
        await cpu.setStatusRegister(UNUSED); // Clear all other flags

        // Setup memory
        // Set IRQ/BRK vector at 0xFFFE-0xFFFF to point to 0x2000
        await cpu.loadByte(0xfffe, 0x00);
        await cpu.loadByte(0xffff, 0x20);

        // Place BRK instruction at 0x1000
        await cpu.loadByte(0x1000, 0x00); // BRK

        // Execute BRK
        const cycles = await cpu.step();

        // Check cycles
        assert.strictEqual(cycles, 7);

        // Check PC was set to IRQ/BRK vector
        assert.strictEqual((await cpu.getState()).pc, 0x2000);

        // Check stack has status and return address pushed correctly
        // BRK pushes the address of the next instruction (PC+2)
        // Stack grows downward, so we need to check values above the current SP
        const sp = (await cpu.getState()).sp;
        assert.strictEqual(await cpu.readByte(0x0100 + sp + 1), UNUSED | BREAK); // Status with B flag set
        assert.strictEqual(await cpu.readByte(0x0100 + sp + 2), 0x02); // Low byte of PC+2
        assert.strictEqual(await cpu.readByte(0x0100 + sp + 3), 0x10); // High byte of PC+2

        // Stack pointer should be decremented by 3
        assert.strictEqual(sp, 0xfa); // 0xFD - 3

        // Interrupt flag should be set
        assert.strictEqual(((await cpu.getState()).p & INTERRUPT) !== 0, true);
    });

    it("should perform RTI instruction", async () => {
        const cpu = createCPU();

        // Initial state
        await cpu.setProgramCounter(0x2000);
        await cpu.setStackPointer(0xfa); // Stack has 3 values already pushed
        await cpu.setStatusRegister(UNUSED | INTERRUPT); // Interrupt disable set

        // Setup stack with return address 0x1002 and status 0x20 (UNUSED & no flags)
        await cpu.loadByte(0x0100 + 0xfb, 0x20); // Status (UNUSED only)
        await cpu.loadByte(0x0100 + 0xfc, 0x02); // Low byte of return address
        await cpu.loadByte(0x0100 + 0xfd, 0x10); // High byte of return address

        // Place RTI instruction at 0x2000
        await cpu.loadByte(0x2000, 0x40); // RTI

        // Execute RTI
        const cycles = await cpu.step();

        // Check cycles
        assert.strictEqual(cycles, 6);

        // Check PC was restored correctly
        assert.strictEqual((await cpu.getState()).pc, 0x1002);

        // Check status was restored (B flag should be ignored)
        assert.strictEqual(await getStatusRegister(cpu), UNUSED); // Just UNUSED bit

        // Stack pointer should be incremented by 3
        assert.strictEqual(await getStackPointer(cpu), 0xfd);
    });

    it("should properly handle status flags with BRK/RTI", async () => {
        const cpu = createCPU();

        // Set initial state with various flags
        await cpu.setProgramCounter(0x3000);
        await cpu.setStatusRegister(
            UNUSED | CARRY | ZERO | NEGATIVE | OVERFLOW | DECIMAL,
        );

        // Setup IRQ/BRK vector
        await cpu.loadByte(0xfffe, 0x00);
        await cpu.loadByte(0xffff, 0x40);

        // Place BRK and RTI instructions
        await cpu.loadByte(0x3000, 0x00); // BRK
        await cpu.loadByte(0x4000, 0x40); // RTI

        // Execute BRK
        await cpu.step();

        // PC should now be at 0x4000
        assert.strictEqual((await cpu.getState()).pc, 0x4000);

        // Original status should be on stack with B flag set
        const sp = (await cpu.getState()).sp;
        const pushedStatus = defined(await cpu.readByte(0x0100 + sp + 1));
        assert.strictEqual(
            pushedStatus &
                (UNUSED | CARRY | ZERO | NEGATIVE | OVERFLOW | DECIMAL | BREAK),
            UNUSED | CARRY | ZERO | NEGATIVE | OVERFLOW | DECIMAL | BREAK);

        // I flag should be set in current processor status
        assert.strictEqual(((await cpu.getState()).p & INTERRUPT) !== 0, true);

        // Execute RTI
        await cpu.step();

        // PC should be back at 0x3002 (BRK + 2)
        assert.strictEqual((await cpu.getState()).pc, 0x3002);

        // Status should be restored (except B flag, which is not a real flag)
        assert.strictEqual(await getStatusRegister(cpu), 
            UNUSED | CARRY | ZERO | NEGATIVE | OVERFLOW | DECIMAL,
        );
    });
});
