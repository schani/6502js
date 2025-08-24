import { getAccumulator, getXRegister, getYRegister, getProgramCounter, getStackPointer, getStatusRegister } from "./tests/utils";
/**
 * dsl-runner.ts — Minimal line-based DSL to drive Microsoft BASIC
 * on the JS 6502 core for debugging program entry/storage issues.
 *
 * Features:
 *  - One command per line
 *  - input <text>: queue text as keystrokes (use \n for Enter)
 *  - trace on|off: enable/disable per-instruction tracing
 *  - wait: run CPU until BASIC requests input (MONRDKEY)
 *
 * Usage:
 *   bun run dsl-runner.ts path/to/script.dsl [--cpu1|--cpu2|--sync] [--debug]
 */

import { readFileSync } from "fs";
import { exit } from "process";
import type { CPU } from "./cpu-interface";
import { CPU1 } from "./cpu1";
import { CPU2 } from "./cpu2";
import { SyncCPU } from "./sync-cpu";

// BASIC ROM (OSI)
const ROM_PATH = "./osi.bin";
const ROM_ADDR = 0xa000;
const COLD_START = 0xbd11;
const MONRDKEY = 0xffeb;
const MONCOUT = 0xffee;
const ISCNTC = 0xffb7;
const LOAD = 0xffb9;
const SAVE = 0xffbc;

// CLI flags
const USE_CPU1 = process.argv.includes("--cpu1");
const USE_CPU2 = process.argv.includes("--cpu2");
const USE_SYNC = process.argv.includes("--sync");

function buildCPU(): CPU {
  if (USE_SYNC) return new SyncCPU();
  if (USE_CPU2) return new CPU2();
  return new CPU1();
}

async function pop16(cpu: CPU): Promise<number> {
  const sp1 = (await getStackPointer(cpu) + 1) & 0xff;
  await cpu.setStackPointer(sp1);
  const lo = await cpu.readByte(0x0100 + await getStackPointer(cpu));
  const sp2 = (await getStackPointer(cpu) + 1) & 0xff;
  await cpu.setStackPointer(sp2);
  const hi = await cpu.readByte(0x0100 + await getStackPointer(cpu));
  return (hi << 8) | lo;
}

class BasicHarness {
  cpu: CPU;
  trace = false;
  inputBuf: number[] = [];
  output = "";

  constructor() {
    this.cpu = buildCPU();
  }

  async init(): Promise<void> {
    // Load ROM
    let rom: Buffer;
    try {
      rom = readFileSync(ROM_PATH);
    } catch (e) {
      console.error(`Cannot read ${ROM_PATH}.`);
      exit(1);
    }
    for (let i = 0; i < rom.length; i++) {
      const b = rom[i];
      if (b === undefined) break;
      await this.cpu.loadByte((ROM_ADDR + i) & 0xffff, b);
    }
    // Reset machine state, jump to cold start
    await this.cpu.setAccumulator(0);
    await this.cpu.setXRegister(0);
    await this.cpu.setYRegister(0);
    await this.cpu.setStackPointer(0xfd);
    await this.cpu.setStatusRegister(0x24);
    await this.cpu.setProgramCounter(COLD_START);
  }

  // Run until BASIC requests input at MONRDKEY.
  // Returns true if it stopped because input is needed; false if stopped for other reasons (unlikely here).
  async runUntilInputRequested(maxInstr = 5_000_000): Promise<boolean> {
    for (let i = 0; i < maxInstr; i++) {
      const pc = await getProgramCounter(this.cpu);
      if (
        pc === MONRDKEY || pc === MONCOUT || pc === ISCNTC || pc === LOAD || pc === SAVE
      ) {
        const ret = (await pop16(this.cpu) + 1) & 0xffff;
        if (pc === MONCOUT) {
          const c = await getAccumulator(this.cpu) & 0xff;
          this.output += String.fromCharCode(c);
          await this.cpu.setProgramCounter(ret);
          continue;
        }
        if (pc === MONRDKEY) {
          if (this.inputBuf.length === 0) {
            // Leave PC where it is so a subsequent input can resume
            return true; // waiting for input
          }
          const c = this.inputBuf.shift()!;
          await this.cpu.setAccumulator(c & 0xff);
          await this.cpu.setProgramCounter(ret);
          continue;
        }
        // Other stubs (ISCNTC/LOAD/SAVE): do nothing, just return
        await this.cpu.setProgramCounter(ret);
        continue;
      }

      await this.cpu.step(this.trace);
    }
    return false;
  }

  enqueueText(s: string): void {
    const bytes = decodeEscapesToBytes(s);
    this.inputBuf.push(...bytes);
  }
}

function decodeEscapesToBytes(src: string): number[] {
  // Support \n (CR for BASIC), \\ and \xHH; default to literal chars
  const out: number[] = [];
  for (let i = 0; i < src.length; i++) {
    const ch = src[i]!;
    if (ch !== "\\") {
      out.push(ch.charCodeAt(0) & 0xff);
      continue;
    }
    // escape
    i++;
    if (i >= src.length) { out.push("\\".charCodeAt(0)); break; }
    const e = src[i]!;
    switch (e) {
      case "n": out.push(0x0d); break; // Enter for BASIC
      case "r": out.push(0x0d); break; // treat as CR
      case "t": out.push(0x09); break;
      case "\\": out.push(0x5c); break;
      case "x": {
        const h1 = src[i+1];
        const h2 = src[i+2];
        if (h1 && h2 && /[0-9a-fA-F]/.test(h1) && /[0-9a-fA-F]/.test(h2)) {
          const v = parseInt(h1 + h2, 16) & 0xff;
          out.push(v);
          i += 2;
        } else {
          out.push("x".charCodeAt(0));
        }
        break;
      }
      default:
        out.push(e.charCodeAt(0) & 0xff);
        break;
    }
  }
  return out;
}

type Command =
  | { kind: "trace"; on: boolean }
  | { kind: "input"; text: string }
  | { kind: "wait" };

function parseDSL(src: string): Command[] {
  const lines = src.split(/\r?\n/);
  const cmds: Command[] = [];
  for (let ln = 0; ln < lines.length; ln++) {
    const raw = lines[ln]!.trim();
    if (!raw || raw.startsWith("#")) continue;
    const lower = raw.toLowerCase();
    if (lower === "trace on") { cmds.push({ kind: "trace", on: true }); continue; }
    if (lower === "trace off") { cmds.push({ kind: "trace", on: false }); continue; }
    if (lower === "wait") { cmds.push({ kind: "wait" }); continue; }
    if (lower.startsWith("input ") || lower.startsWith("type ")) {
      const text = raw.slice(raw.indexOf(" ")+1);
      cmds.push({ kind: "input", text });
      continue;
    }
    throw new Error(`Unknown command on line ${ln+1}: ${raw}`);
  }
  return cmds;
}

async function main() {
  const script = process.argv.find(a => a.endsWith(".dsl") || a.endsWith(".txt"));
  if (!script) {
    console.error("Usage: bun run dsl-runner.ts path/to/script.dsl [--cpu1|--cpu2|--sync]");
    exit(2);
  }
  const src = readFileSync(script, "utf8");
  const cmds = parseDSL(src);

  const h = new BasicHarness();
  await h.init();

  for (const c of cmds) {
    switch (c.kind) {
      case "trace":
        h.trace = c.on;
        console.log(`TRACE ${c.on ? "ON" : "OFF"}`);
        break;
      case "input":
        h.enqueueText(c.text);
        console.log(`INPUT ${JSON.stringify(c.text)}`);
        break;
      case "wait": {
        const waiting = await h.runUntilInputRequested();
        if (!waiting) console.log("WAIT done (no input needed)");
        else console.log("WAIT: BASIC requests input");
        break;
      }
    }
  }

  // Print any captured output at the end
  if (h.output) {
    console.log("\n--- OUTPUT ---\n" + h.output);
  }
}

main();

