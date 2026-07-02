import type { CPU, CPUState } from "../core/cpu-interface.ts";
import { CPU1 } from "../core/cpu1.ts";
import { disassemble } from "../utils/disasm.ts";
import { handleTrap, initBasicFromRom, type TrapIO } from "../runners/basic-traps.ts";

// BASIC ROM (OSI), served from the repository root
const ROM_PATH = "./data/osi.bin";

class DebuggerModel {
    cpu: CPU;
    running = false;
    breakpoints = new Set<number>();
    output: string = "";
    inputBuf: number[] = [];
    instrCount = 0;
    waitingForInput = false;
    memSnapshot: Uint8Array | null = null;
    lastDiffCount = 0;
    private io: TrapIO;

    constructor() {
        this.cpu = new CPU1();
        this.io = {
            putChar: (c) => {
                this.output += String.fromCharCode(c);
            },
            getChar: () => this.inputBuf.shift(),
        };
    }

    async init() {
        const res = await fetch(ROM_PATH);
        if (!res.ok) throw new Error(`Cannot fetch ${ROM_PATH}: ${res.status}`);
        const rom = new Uint8Array(await res.arrayBuffer());
        await initBasicFromRom(this.cpu, rom);
    }

    async setReg(name: keyof CPUState, valHex: string) {
        const v = parseInt(valHex, 16) >>> 0;
        if (Number.isNaN(v)) return;
        switch (name) {
            case "a":
                await this.cpu.setAccumulator(v);
                break;
            case "x":
                await this.cpu.setXRegister(v);
                break;
            case "y":
                await this.cpu.setYRegister(v);
                break;
            case "sp":
                await this.cpu.setStackPointer(v);
                break;
            case "p":
                await this.cpu.setStatusRegister(v);
                break;
            case "pc":
                await this.cpu.setProgramCounter(v);
                break;
        }
    }

    async step(): Promise<void> {
        const result = await handleTrap(this.cpu, this.io);
        if (result === "need-input") {
            this.waitingForInput = true;
            return;
        }
        if (result === "handled") {
            this.waitingForInput = false;
            return;
        }
        await this.cpu.step(false);
        this.instrCount++;
    }

    async runTick(maxInstr = 10000): Promise<boolean> {
        if (this.waitingForInput) return false;
        for (let i = 0; i < maxInstr; i++) {
            const pc = (await this.cpu.getState()).pc;
            if (this.breakpoints.has(pc)) return false;
            await this.step();
            if (!this.running) return false;
            if (this.waitingForInput) return false;
        }
        return true;
    }
}

// ---------------- UI wiring ----------------

const model = new DebuggerModel();

const $ = (id: string) => document.getElementById(id)!;
const fmt8 = (v: number) => v.toString(16).toUpperCase().padStart(2, "0");
const fmt16 = (v: number) => v.toString(16).toUpperCase().padStart(4, "0");

function renderRegs(s: CPUState) {
    (document.getElementById("reg-a") as HTMLInputElement).value = fmt8(s.a);
    (document.getElementById("reg-x") as HTMLInputElement).value = fmt8(s.x);
    (document.getElementById("reg-y") as HTMLInputElement).value = fmt8(s.y);
    (document.getElementById("reg-sp") as HTMLInputElement).value = fmt8(s.sp);
    (document.getElementById("reg-pc") as HTMLInputElement).value = fmt16(s.pc);
    (document.getElementById("reg-p") as HTMLInputElement).value = fmt8(s.p);
    const flagsSpec: Array<[string, number]> = [
        ["N", 0x80],
        ["V", 0x40],
        ["-", 0x20],
        ["B", 0x10],
        ["D", 0x08],
        ["I", 0x04],
        ["Z", 0x02],
        ["C", 0x01],
    ];
    const flags = flagsSpec
        .map(([n, m]) => (s.p & m ? n : n.toLowerCase()))
        .join("");
    $("flags").textContent = `Flags: ${flags}`;
}

async function renderDisasm() {
    const s = await model.cpu.getState();
    const pc = s.pc;
    const windowLen = 512;
    const cache = new Uint8Array(65536);
    for (let i = 0; i < windowLen; i++) {
        cache[(pc + i) & 0xffff] =
            (await model.cpu.readByte((pc + i) & 0xffff)) & 0xff;
    }
    // A synchronous in-memory reader; disassemble only needs the two
    // read methods of the CPU interface.
    const reader = {
        readByte: async (addr: number) => cache[addr & 0xffff] || 0,
        readWord: async (addr: number) => {
            const lo = cache[addr & 0xffff] || 0;
            const hi = cache[(addr + 1) & 0xffff] || 0;
            return (hi << 8) | lo;
        },
    } as unknown as CPU;
    const lines: { addr: number; text: string; len: number }[] = [];
    let addr = pc;
    for (let i = 0; i < 40; i++) {
        const [asm, len] = await disassemble(reader, addr);
        lines.push({ addr, text: `${fmt16(addr)}: ${asm}`, len });
        addr = (addr + len) & 0xffff;
    }
    const d = $("disasm");
    d.innerHTML = lines
        .map((l) => {
            const isCur = l.addr === pc;
            const hasBp = model.breakpoints.has(l.addr);
            const cls = ["disasm-line", isCur ? "cur" : "", hasBp ? "bp" : ""]
                .filter(Boolean)
                .join(" ");
            const m = hasBp ? "● " : "  ";
            return `<div data-addr="${l.addr}" class="${cls}">${m}${l.text}</div>`;
        })
        .join("");
}

async function renderMemory(base: number) {
    const rows: string[] = [];
    const bytesPerRow = 16; // fixed width hex dump
    for (let r = 0; r < 16; r++) {
        const addr = (base + r * bytesPerRow) & 0xffff;
        const bytes: string[] = [];
        const chars: string[] = [];
        for (let i = 0; i < bytesPerRow; i++) {
            const b = (await model.cpu.readByte(addr + i)) & 0xff;
            const isChanged = model.memSnapshot
                ? model.memSnapshot[(addr + i) & 0xffff] !== b
                : false;
            const txt = fmt8(b);
            bytes.push(isChanged ? `<span class="changed">${txt}</span>` : txt);
            chars.push(b >= 32 && b < 127 ? String.fromCharCode(b) : ".");
        }
        rows.push(`${fmt16(addr)}  ${bytes.join(" ")}  |${chars.join("")}|`);
    }
    $("memory").textContent = rows.join("\n");
}

async function takeSnapshot() {
    const snap = new Uint8Array(65536);
    for (let i = 0; i < 65536; i++)
        snap[i] = (await model.cpu.readByte(i)) & 0xff;
    model.memSnapshot = snap;
    model.lastDiffCount = 0;
    $("diff-summary").textContent = `Snapshot taken.`;
    await renderAll();
}

async function compareSnapshot() {
    if (!model.memSnapshot) {
        $("diff-summary").textContent = `No snapshot. Take one first.`;
        return;
    }
    let changed = 0;
    type Block = { start: number; prev: number[]; curr: number[] };
    const blocks: Block[] = [];
    let i = 0;
    while (i < 65536) {
        const prev = model.memSnapshot[i]!;
        const cur = (await model.cpu.readByte(i)) & 0xff;
        if (prev !== cur) {
            const start = i;
            const prevBytes: number[] = [];
            const currBytes: number[] = [];
            while (i < 65536) {
                const pv = model.memSnapshot[i]!;
                const cv = (await model.cpu.readByte(i)) & 0xff;
                if (pv === cv) break;
                prevBytes.push(pv);
                currBytes.push(cv);
                i++;
                changed++;
            }
            blocks.push({ start, prev: prevBytes, curr: currBytes });
        } else {
            i++;
        }
    }
    model.lastDiffCount = changed;

    const toAscii = (arr: number[]) =>
        arr
            .map((b) => (b >= 32 && b < 127 ? String.fromCharCode(b) : "."))
            .join("");

    const lines: string[] = [];
    if (changed === 0) {
        lines.push("No differences since snapshot.");
    } else {
        lines.push(`Changed bytes: ${changed}. Blocks: ${blocks.length}`);
        const maxBlocks = 16;
        for (let bi = 0; bi < Math.min(blocks.length, maxBlocks); bi++) {
            const b = blocks[bi]!;
            const end = (b.start + b.curr.length - 1) & 0xffff;
            const prevHex = b.prev.map((x) => fmt8(x)).join(" ");
            const currHex = b.curr.map((x) => fmt8(x)).join(" ");
            const currTxt = toAscii(b.curr);
            lines.push(
                `\n$${fmt16(b.start)}-$${fmt16(end)} (len ${b.curr.length})`,
            );
            lines.push(`  prev: ${prevHex}`);
            lines.push(`  curr: ${currHex}`);
            lines.push(`  text: "${currTxt}"`);
        }
        if (blocks.length > maxBlocks) {
            lines.push(
                `\n… ${blocks.length - maxBlocks} more block(s) not shown`,
            );
        }
    }
    $("diff-summary").textContent = lines.join("\n");
    await renderAll();
}

function renderConsole() {
    const out = $("console-out") as HTMLTextAreaElement;
    out.value = model.output;
    out.scrollTop = out.scrollHeight;
}

async function renderAll() {
    const state = await model.cpu.getState();
    renderRegs(state);
    await renderDisasm();
    const baseHex = (document.getElementById("mem-base") as HTMLInputElement)
        .value;
    const base = parseInt(baseHex, 16) || 0xa000;
    await renderMemory(base);
    renderConsole();
    const waiting = model.waitingForInput;
    $("status").textContent = waiting
        ? `Waiting for input… PC=$${fmt16(state.pc)} instr=${model.instrCount} (queue=${model.inputBuf.length})`
        : `PC=$${fmt16(state.pc)}  instr=${model.instrCount}`;

    // Toggle controls based on state
    const btnRun = $("btn-run");
    const btnPause = $("btn-pause");
    const btnStep = $("btn-step");
    if (waiting) {
        btnRun.setAttribute("disabled", "true");
        btnStep.setAttribute("disabled", "true");
        btnPause.setAttribute("disabled", "true");
    } else {
        if (model.running) {
            btnRun.setAttribute("disabled", "true");
            btnPause.removeAttribute("disabled");
            btnStep.setAttribute("disabled", "true");
        } else {
            btnRun.removeAttribute("disabled");
            btnPause.setAttribute("disabled", "true");
            btnStep.removeAttribute("disabled");
        }
    }
}

async function main() {
    await model.init();
    // Wire controls
    $("btn-reset").addEventListener("click", async () => {
        await model.init();
        await renderAll();
    });
    $("btn-step").addEventListener("click", async () => {
        if (model.waitingForInput) return;
        await model.step();
        await renderAll();
    });
    $("btn-run").addEventListener("click", () => {
        if (model.waitingForInput) return; // cannot start while blocked
        model.running = true;
        $("btn-run").setAttribute("disabled", "true");
        $("btn-pause").removeAttribute("disabled");
        scheduleRunLoop();
    });
    $("btn-pause").addEventListener("click", () => {
        model.running = false;
        $("btn-pause").setAttribute("disabled", "true");
        $("btn-run").removeAttribute("disabled");
    });
    $("mem-go").addEventListener("click", () => {
        renderAll();
    });
    $("mem-snapshot").addEventListener("click", async () => {
        await takeSnapshot();
    });
    $("mem-compare").addEventListener("click", async () => {
        await compareSnapshot();
    });
    $("send").addEventListener("click", async () => {
        const inp = $("console-in") as HTMLInputElement;
        const s = inp.value + "\r";
        for (const ch of s) model.inputBuf.push(ch.charCodeAt(0) & 0xff);
        inp.value = "";
        // If waiting at MONRDKEY, consume immediately
        if (model.waitingForInput) {
            await model.step();
            await renderAll();
            if (model.running) scheduleRunLoop();
        }
    });
    $("disasm").addEventListener("click", async (e) => {
        const t = e.target as HTMLElement;
        const row = t.closest(".disasm-line") as HTMLElement | null;
        if (!row || !row.dataset.addr) return;
        const addr = parseInt(row.dataset.addr, 10);
        if (model.breakpoints.has(addr)) model.breakpoints.delete(addr);
        else model.breakpoints.add(addr);
        await renderDisasm();
    });

    // Editable register inputs
    for (const id of ["a", "x", "y", "sp", "pc", "p"]) {
        const el = document.getElementById(`reg-${id}`) as HTMLInputElement;
        el.addEventListener("change", () =>
            model.setReg(id as keyof CPUState, el.value),
        );
    }

    // Simple run loop scheduler shared between controls and input
    let rafScheduled = false;
    async function runLoopTick() {
        rafScheduled = false;
        if (!model.running) return;
        const keep = await model.runTick(20000);
        await renderAll();
        if (model.waitingForInput) {
            return;
        }
        if (keep && model.running) scheduleRunLoop();
    }
    function scheduleRunLoop() {
        if (rafScheduled) return;
        rafScheduled = true;
        requestAnimationFrame(runLoopTick);
    }

    await renderAll();
}

main();
