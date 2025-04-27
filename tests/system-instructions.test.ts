import { describe, expect, it } from "bun:test";
import { BREAK, CARRY, DECIMAL, INTERRUPT, NEGATIVE, OVERFLOW, UNUSED, ZERO, defined } from "../6502";
import { createCPU } from "./utils";

describe("System instructions", () => {
  it("should perform BRK instruction", () => {
    const cpu = createCPU();
    
    // Initial state
    cpu.setProgramCounter(0x1000);
    cpu.setStatusRegister(UNUSED); // Clear all other flags
    
    // Setup memory
    // Set IRQ/BRK vector at 0xFFFE-0xFFFF to point to 0x2000
    cpu.loadByte(0xFFFE, 0x00);
    cpu.loadByte(0xFFFF, 0x20);
    
    // Place BRK instruction at 0x1000
    cpu.loadByte(0x1000, 0x00); // BRK
    
    // Execute BRK
    const cycles = cpu.step();
    
    // Check cycles
    expect(cycles).toBe(7);
    
    // Check PC was set to IRQ/BRK vector
    expect(cpu.getProgramCounter()).toBe(0x2000);
    
    // Check stack has status and return address pushed correctly
    // BRK pushes the address of the next instruction (PC+2)
    // Stack grows downward, so we need to check values above the current SP
    const sp = cpu.getStackPointer();
    expect(cpu.readByte(0x0100 + sp + 1)).toBe(UNUSED | BREAK); // Status with B flag set
    expect(cpu.readByte(0x0100 + sp + 2)).toBe(0x02); // Low byte of PC+2
    expect(cpu.readByte(0x0100 + sp + 3)).toBe(0x10); // High byte of PC+2
    
    // Stack pointer should be decremented by 3
    expect(sp).toBe(0xFA); // 0xFD - 3
    
    // Interrupt flag should be set
    expect(cpu.isStatusFlagSet(INTERRUPT)).toBe(true);
  });

  it("should perform RTI instruction", () => {
    const cpu = createCPU();
    
    // Initial state
    cpu.setProgramCounter(0x2000);
    cpu.setStackPointer(0xFA); // Stack has 3 values already pushed
    cpu.setStatusRegister(UNUSED | INTERRUPT); // Interrupt disable set
    
    // Setup stack with return address 0x1002 and status 0x20 (UNUSED & no flags)
    cpu.loadByte(0x0100 + 0xFB, 0x20); // Status (UNUSED only)
    cpu.loadByte(0x0100 + 0xFC, 0x02); // Low byte of return address
    cpu.loadByte(0x0100 + 0xFD, 0x10); // High byte of return address
    
    // Place RTI instruction at 0x2000
    cpu.loadByte(0x2000, 0x40); // RTI
    
    // Execute RTI
    const cycles = cpu.step();
    
    // Check cycles
    expect(cycles).toBe(6);
    
    // Check PC was restored correctly
    expect(cpu.getProgramCounter()).toBe(0x1002);
    
    // Check status was restored (B flag should be ignored)
    expect(cpu.getStatusRegister()).toBe(UNUSED); // Just UNUSED bit
    
    // Stack pointer should be incremented by 3
    expect(cpu.getStackPointer()).toBe(0xFD);
  });
  
  it("should properly handle status flags with BRK/RTI", () => {
    const cpu = createCPU();
    
    // Set initial state with various flags
    cpu.setProgramCounter(0x3000);
    cpu.setStatusRegister(UNUSED | CARRY | ZERO | NEGATIVE | OVERFLOW | DECIMAL);
    
    // Setup IRQ/BRK vector
    cpu.loadByte(0xFFFE, 0x00);
    cpu.loadByte(0xFFFF, 0x40);
    
    // Place BRK and RTI instructions
    cpu.loadByte(0x3000, 0x00); // BRK
    cpu.loadByte(0x4000, 0x40); // RTI
    
    // Execute BRK
    cpu.step();
    
    // PC should now be at 0x4000
    expect(cpu.getProgramCounter()).toBe(0x4000);
    
    // Original status should be on stack with B flag set
    const sp = cpu.getStackPointer();
    const pushedStatus = defined(cpu.readByte(0x0100 + sp + 1));
    expect(pushedStatus & (UNUSED | CARRY | ZERO | NEGATIVE | OVERFLOW | DECIMAL | BREAK))
      .toBe(UNUSED | CARRY | ZERO | NEGATIVE | OVERFLOW | DECIMAL | BREAK);
    
    // I flag should be set in current processor status
    expect(cpu.isStatusFlagSet(INTERRUPT)).toBe(true);
    
    // Execute RTI
    cpu.step();
    
    // PC should be back at 0x3002 (BRK + 2)
    expect(cpu.getProgramCounter()).toBe(0x3002);
    
    // Status should be restored (except B flag, which is not a real flag)
    expect(cpu.getStatusRegister()).toBe(UNUSED | CARRY | ZERO | NEGATIVE | OVERFLOW | DECIMAL);
  });
});