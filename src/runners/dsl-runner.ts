/**
 * dsl-runner.ts — Minimal line-based DSL to drive Microsoft BASIC
 * on the 6502 cores for debugging program entry/storage issues.
 *
 * Features:
 *  - One command per line
 *  - input <text>: queue text as keystrokes (use \n for Enter)
 *  - trace on|off: enable/disable per-instruction tracing
 *  - wait: run CPU until BASIC requests input (MONRDKEY)
 *
 * Usage:
 *   npm run dsl path/to/script.dsl [-- --cpu1|--cpu2|--pgcpu|--sync]
 *
 * ROM loading, register setup, and monitor-vector trapping live in
 * basic-harness.ts, shared with basic-runner.ts.
 */

import { readFileSync } from "fs";
import { exit } from "process";
import type { CPU } from "../core/cpu-interface.ts";
import { buildCPU, initBasic, handleTrap, type TrapIO } from "./basic-harness.ts";

class BasicHarness {
    cpu: CPU;
    trace = false;
    inputBuf: number[] = [];
    output = "";
    private io: TrapIO;

    constructor() {
        this.cpu = buildCPU(process.argv);
        this.io = {
            putChar: (c) => {
                this.output += String.fromCharCode(c);
            },
            getChar: () => this.inputBuf.shift(),
        };
    }

    async init(): Promise<void> {
        try {
            await initBasic(this.cpu);
        } catch (e) {
            console.error(String(e));
            exit(1);
        }
    }

    // Run until BASIC requests input at MONRDKEY.
    // Returns true if it stopped because input is needed; false if the
    // instruction budget ran out.
    async runUntilInputRequested(maxInstr = 5_000_000): Promise<boolean> {
        for (let i = 0; i < maxInstr; i++) {
            const result = await handleTrap(this.cpu, this.io);
            if (result === "need-input") return true;
            if (result === "handled") continue;
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
        console.error("Usage: npm run dsl path/to/script.dsl [-- --cpu1|--cpu2|--pgcpu|--sync]");
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

main().catch((e) => {
    console.error(String(e));
    exit(1);
});
