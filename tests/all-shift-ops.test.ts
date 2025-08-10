import { describe, expect, it } from "bun:test";
import { CARRY, ZERO, NEGATIVE } from "../6502";
import { createCPU } from "./utils";

// This test is a comprehensive test of all shift and rotate operations
// to achieve 100% line coverage
describe("All Shift and Rotate Operations for 100% Coverage", () => {
  it("should test every shift and rotate operation with all edge cases", async () => {
    // Create an array of all the shift/rotate opcodes
    const opcodes = [
      // ASL - Arithmetic Shift Left
      0x0A, // ASL A
      0x06, // ASL Zero Page
      0x16, // ASL Zero Page,X
      0x0E, // ASL Absolute
      0x1E, // ASL Absolute,X
      
      // LSR - Logical Shift Right
      0x4A, // LSR A
      0x46, // LSR Zero Page
      0x56, // LSR Zero Page,X
      0x4E, // LSR Absolute
      0x5E, // LSR Absolute,X
      
      // ROL - Rotate Left
      0x2A, // ROL A
      0x26, // ROL Zero Page
      0x36, // ROL Zero Page,X
      0x2E, // ROL Absolute
      0x3E, // ROL Absolute,X
      
      // ROR - Rotate Right
      0x6A, // ROR A
      0x66, // ROR Zero Page
      0x76, // ROR Zero Page,X
      0x6E, // ROR Absolute
      0x7E, // ROR Absolute,X
    ];
    
    // Test each opcode with different values and flag combinations
    for (const opcode of opcodes) {
      // For both initial carry states
      for (const initialCarry of [true, false]) {
        // Test with values that set/clear carry flags
        for (const value of [0x01, 0x02, 0x40, 0x80, 0xAA, 0x55, 0xFF, 0x00]) {
          const cpu = createCPU();
          
          // Set up the CPU
          await cpu.setProgramCounter(0);
          await cpu.loadByte(0, opcode);
          
          // Set up initial carry flag
          if (initialCarry) {
            await cpu.setStatusFlag(CARRY);
          } else {
            await cpu.clearStatusFlag(CARRY);
          }
          
          // Set up memory/registers based on the addressing mode
          let memLocation = 0; // Where the value is stored or will be stored
          
          if (opcode === 0x0A || opcode === 0x4A || opcode === 0x2A || opcode === 0x6A) {
            // Accumulator mode
            await cpu.setAccumulator(value);
          } else if (opcode === 0x06 || opcode === 0x46 || opcode === 0x26 || opcode === 0x66) {
            // Zero Page
            await cpu.loadByte(1, 0x50); // Zero page address
            await cpu.loadByte(0x50, value);
            memLocation = 0x50;
          } else if (opcode === 0x16 || opcode === 0x56 || opcode === 0x36 || opcode === 0x76) {
            // Zero Page,X
            await cpu.loadByte(1, 0x50); // Zero page address
            await cpu.setXRegister(0x05);  // X register offset
            await cpu.loadByte(0x55, value); // 0x50 + 0x05 = 0x55
            memLocation = 0x55;
          } else if (opcode === 0x0E || opcode === 0x4E || opcode === 0x2E || opcode === 0x6E) {
            // Absolute
            await cpu.loadByte(1, 0x00); // Low byte of address
            await cpu.loadByte(2, 0x20); // High byte of address
            await cpu.loadByte(0x2000, value);
            memLocation = 0x2000;
          } else if (opcode === 0x1E || opcode === 0x5E || opcode === 0x3E || opcode === 0x7E) {
            // Absolute,X
            await cpu.loadByte(1, 0x00); // Low byte of address
            await cpu.loadByte(2, 0x20); // High byte of address
            await cpu.setXRegister(0x10);  // X register offset
            await cpu.loadByte(0x2010, value); // 0x2000 + 0x10 = 0x2010
            memLocation = 0x2010;
          }
          
          // Execute the instruction
          await cpu.step();
          
          // Now verify the result based on the opcode and input
          if (opcode === 0x0A || opcode === 0x06 || opcode === 0x16 || opcode === 0x0E || opcode === 0x1E) {
            // ASL - Shift left, bit 0 becomes 0, bit 7 goes to carry
            const result = ((value << 1) & 0xFF);
            const shouldSetCarry = (value & 0x80) !== 0;
            
            // Check carry flag
            expect(((await cpu.getState()).p & CARRY) !== 0).toBe(shouldSetCarry);
            
            // Check the result
            if (opcode === 0x0A) {
               expect(await cpu.getAccumulator()).toBe(result);            } else {
               expect(await cpu.readByte(memLocation)).toBe(result);            }
          } else if (opcode === 0x4A || opcode === 0x46 || opcode === 0x56 || opcode === 0x4E || opcode === 0x5E) {
            // LSR - Shift right, bit 7 becomes 0, bit 0 goes to carry
            const result = ((value >> 1) & 0xFF);
            const shouldSetCarry = (value & 0x01) !== 0;
            
            // Check carry flag
            expect(((await cpu.getState()).p & CARRY) !== 0).toBe(shouldSetCarry);
            
            // Check the result
            if (opcode === 0x4A) {
               expect(await cpu.getAccumulator()).toBe(result);            } else {
               expect(await cpu.readByte(memLocation)).toBe(result);            }
          } else if (opcode === 0x2A || opcode === 0x26 || opcode === 0x36 || opcode === 0x2E || opcode === 0x3E) {
            // ROL - Rotate left, bit 7 goes to carry, carry goes to bit 0
            const carryBit = initialCarry ? 1 : 0;
            const result = ((value << 1) | carryBit) & 0xFF;
            const shouldSetCarry = (value & 0x80) !== 0;
            
            // Check carry flag
            expect(((await cpu.getState()).p & CARRY) !== 0).toBe(shouldSetCarry);
            
            // Check the result
            if (opcode === 0x2A) {
               expect(await cpu.getAccumulator()).toBe(result);            } else {
               expect(await cpu.readByte(memLocation)).toBe(result);            }
          } else if (opcode === 0x6A || opcode === 0x66 || opcode === 0x76 || opcode === 0x6E || opcode === 0x7E) {
            // ROR - Rotate right, bit 0 goes to carry, carry goes to bit 7
            const carryBit = initialCarry ? 0x80 : 0;
            const result = ((value >> 1) | carryBit) & 0xFF;
            const shouldSetCarry = (value & 0x01) !== 0;
            
            // Check carry flag
            expect(((await cpu.getState()).p & CARRY) !== 0).toBe(shouldSetCarry);
            
            // Check the result
            if (opcode === 0x6A) {
               expect(await cpu.getAccumulator()).toBe(result);            } else {
               expect(await cpu.readByte(memLocation)).toBe(result);            }
          }
        }
      }
    }
  });
});