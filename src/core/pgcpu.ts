import type { CPU, CPUState } from "./cpu-interface.ts";
import { PGlite } from "@electric-sql/pglite";

export class PGCPU implements CPU {
  private static sharedDb: PGlite | null = null;
  private static nextId = 0;
  private db!: PGlite;
  private cpuId: number;
  private ready: Promise<void>;

  constructor(cpuId = -1) {
    this.cpuId = cpuId >= 0 ? cpuId : PGCPU.nextId++;
    this.ready = this.init();
  }

  private async init() {
    if (PGCPU.sharedDb) {
      this.db = PGCPU.sharedDb;
    } else {
      this.db = await PGlite.create();
      PGCPU.sharedDb = this.db;
      // Ensure schema and stored procedures exist
      await this.db.exec(`
      -- Tables
      CREATE TABLE IF NOT EXISTS cpu_state (
        cpu_id integer PRIMARY KEY,
        a smallint NOT NULL CHECK (a BETWEEN 0 AND 255),
        x smallint NOT NULL CHECK (x BETWEEN 0 AND 255),
        y smallint NOT NULL CHECK (y BETWEEN 0 AND 255),
        sp smallint NOT NULL CHECK (sp BETWEEN 0 AND 255),
        p smallint NOT NULL CHECK (p BETWEEN 0 AND 255),
        pc integer NOT NULL CHECK (pc BETWEEN 0 AND 65535)
      );

      CREATE TABLE IF NOT EXISTS memory (
        cpu_id integer NOT NULL,
        address integer NOT NULL CHECK (address BETWEEN 0 AND 65535),
        byte smallint NOT NULL CHECK (byte BETWEEN 0 AND 255),
        PRIMARY KEY (cpu_id, address)
      );

      -- Helper: mask8
      CREATE OR REPLACE FUNCTION mask8(v integer) RETURNS integer AS $$
      BEGIN
        RETURN (v & 255);
      END; $$ LANGUAGE plpgsql IMMUTABLE;

      -- Helper: mask16
      CREATE OR REPLACE FUNCTION mask16(v integer) RETURNS integer AS $$
      BEGIN
        RETURN (v & 65535);
      END; $$ LANGUAGE plpgsql IMMUTABLE;

      -- Memory helpers
      CREATE OR REPLACE FUNCTION read_byte(cpu integer, addr integer) RETURNS integer AS $$
      DECLARE v integer;
      BEGIN
        addr := mask16(addr);
        SELECT byte INTO v FROM memory WHERE cpu_id = cpu AND address = addr;
        RETURN COALESCE(v, 0);
      END; $$ LANGUAGE plpgsql;

      CREATE OR REPLACE FUNCTION load_byte(cpu integer, addr integer, val integer) RETURNS void AS $$
      BEGIN
        addr := mask16(addr);
        val := mask8(val);
        INSERT INTO memory(cpu_id, address, byte) VALUES (cpu, addr, val)
        ON CONFLICT (cpu_id, address) DO UPDATE SET byte = EXCLUDED.byte;
      END; $$ LANGUAGE plpgsql;

      CREATE OR REPLACE FUNCTION read_word(cpu integer, addr integer) RETURNS integer AS $$
      DECLARE lo integer; hi integer; a1 integer;
      BEGIN
        lo := read_byte(cpu, addr);
        a1 := (addr + 1) & 65535;
        hi := read_byte(cpu, a1);
        RETURN (hi << 8) | lo;
      END; $$ LANGUAGE plpgsql;

      CREATE OR REPLACE FUNCTION load_word(cpu integer, addr integer, val integer) RETURNS void AS $$
      DECLARE a0 integer; a1 integer; lo integer; hi integer;
      BEGIN
        a0 := addr & 65535;
        a1 := (addr + 1) & 65535;
        lo := val & 255;
        hi := (val >> 8) & 255;
        PERFORM load_byte(cpu, a0, lo);
        PERFORM load_byte(cpu, a1, hi);
      END; $$ LANGUAGE plpgsql;

      -- CPU state helpers
      CREATE OR REPLACE FUNCTION get_state(cpu integer)
      RETURNS TABLE (a smallint, x smallint, y smallint, sp smallint, p smallint, pc integer) AS $$
      BEGIN
        RETURN QUERY SELECT s.a, s.x, s.y, s.sp, s.p, s.pc FROM cpu_state s WHERE s.cpu_id = cpu;
      END; $$ LANGUAGE plpgsql;

      CREATE OR REPLACE FUNCTION reset(cpu integer) RETURNS void AS $$
      BEGIN
        INSERT INTO cpu_state(cpu_id, a, x, y, sp, p, pc)
        VALUES (cpu, 0, 0, 0, 253, 36, 0)
        ON CONFLICT (cpu_id) DO UPDATE SET a=0, x=0, y=0, sp=253, p=36, pc=0;
      END; $$ LANGUAGE plpgsql;

      CREATE OR REPLACE FUNCTION set_program_counter(cpu integer, addr integer) RETURNS void AS $$
      BEGIN
        UPDATE cpu_state SET pc = (addr & 65535) WHERE cpu_id = cpu;
        IF NOT FOUND THEN
          PERFORM reset(cpu);
          UPDATE cpu_state SET pc = (addr & 65535) WHERE cpu_id = cpu;
        END IF;
      END; $$ LANGUAGE plpgsql;

      CREATE OR REPLACE FUNCTION set_accumulator(cpu integer, v integer) RETURNS void AS $$
      BEGIN
        UPDATE cpu_state SET a = (v & 255) WHERE cpu_id = cpu;
        IF NOT FOUND THEN PERFORM reset(cpu); UPDATE cpu_state SET a = (v & 255) WHERE cpu_id = cpu; END IF;
      END; $$ LANGUAGE plpgsql;

      CREATE OR REPLACE FUNCTION set_x_register(cpu integer, v integer) RETURNS void AS $$
      BEGIN
        UPDATE cpu_state SET x = (v & 255) WHERE cpu_id = cpu;
        IF NOT FOUND THEN PERFORM reset(cpu); UPDATE cpu_state SET x = (v & 255) WHERE cpu_id = cpu; END IF;
      END; $$ LANGUAGE plpgsql;

      CREATE OR REPLACE FUNCTION set_y_register(cpu integer, v integer) RETURNS void AS $$
      BEGIN
        UPDATE cpu_state SET y = (v & 255) WHERE cpu_id = cpu;
        IF NOT FOUND THEN PERFORM reset(cpu); UPDATE cpu_state SET y = (v & 255) WHERE cpu_id = cpu; END IF;
      END; $$ LANGUAGE plpgsql;

      CREATE OR REPLACE FUNCTION set_stack_pointer(cpu integer, v integer) RETURNS void AS $$
      BEGIN
        UPDATE cpu_state SET sp = (v & 255) WHERE cpu_id = cpu;
        IF NOT FOUND THEN PERFORM reset(cpu); UPDATE cpu_state SET sp = (v & 255) WHERE cpu_id = cpu; END IF;
      END; $$ LANGUAGE plpgsql;

      CREATE OR REPLACE FUNCTION set_status_register(cpu integer, v integer) RETURNS void AS $$
      BEGIN
        UPDATE cpu_state SET p = (v & 255) WHERE cpu_id = cpu;
        IF NOT FOUND THEN PERFORM reset(cpu); UPDATE cpu_state SET p = (v & 255) WHERE cpu_id = cpu; END IF;
      END; $$ LANGUAGE plpgsql;

      CREATE OR REPLACE FUNCTION set_status_flag(cpu integer, m integer) RETURNS void AS $$
      BEGIN
        UPDATE cpu_state SET p = ((p | (m & 255)) & 255) WHERE cpu_id = cpu;
        IF NOT FOUND THEN PERFORM reset(cpu); UPDATE cpu_state SET p = ((p | (m & 255)) & 255) WHERE cpu_id = cpu; END IF;
      END; $$ LANGUAGE plpgsql;

      CREATE OR REPLACE FUNCTION clear_status_flag(cpu integer, m integer) RETURNS void AS $$
      BEGIN
        UPDATE cpu_state SET p = ((p & (~m & 255)) & 255) WHERE cpu_id = cpu;
        IF NOT FOUND THEN PERFORM reset(cpu); UPDATE cpu_state SET p = ((p & (~m & 255)) & 255) WHERE cpu_id = cpu; END IF;
      END; $$ LANGUAGE plpgsql;

      -- Execute a single instruction: minimal NOP implementation
      CREATE OR REPLACE FUNCTION step(cpu integer, trace boolean DEFAULT false) RETURNS integer AS $$
      DECLARE ra integer; rx integer; ry integer; rsp integer; rp integer; rpc integer;
      DECLARE opcode integer; cycles integer := 0;
      BEGIN
        SELECT s.a, s.x, s.y, s.sp, s.p, s.pc INTO ra, rx, ry, rsp, rp, rpc FROM cpu_state s WHERE s.cpu_id = cpu;
        IF NOT FOUND THEN
          PERFORM reset(cpu);
          SELECT s.a, s.x, s.y, s.sp, s.p, s.pc INTO ra, rx, ry, rsp, rp, rpc FROM cpu_state s WHERE s.cpu_id = cpu;
        END IF;

        opcode := read_byte(cpu, rpc);
        rpc := (rpc + 1) & 65535;

        IF opcode = 234 THEN
          -- NOP
          cycles := 2;
          IF trace THEN
            RAISE NOTICE 'NOP at PC=%', rpc - 1;
          END IF;
        ELSIF opcode = 169 THEN -- 0xA9 LDA #imm
          DECLARE v integer;
          BEGIN
            v := read_byte(cpu, rpc);
            rpc := (rpc + 1) & 65535;
            ra := v & 255;
            -- update Z and N in rp
            rp := (rp & ~(2|128)) | (CASE WHEN ra = 0 THEN 2 ELSE 0 END) | (CASE WHEN (ra & 128) <> 0 THEN 128 ELSE 0 END);
            cycles := 2;
            IF trace THEN RAISE NOTICE 'LDA #$% at PC=%', v, rpc - 2; END IF;
          END;
        ELSIF opcode = 162 THEN -- 0xA2 LDX #imm
          DECLARE v2 integer;
          BEGIN
            v2 := read_byte(cpu, rpc);
            rpc := (rpc + 1) & 65535;
            rx := v2 & 255;
            rp := (rp & ~(2|128)) | (CASE WHEN rx = 0 THEN 2 ELSE 0 END) | (CASE WHEN (rx & 128) <> 0 THEN 128 ELSE 0 END);
            cycles := 2;
            IF trace THEN RAISE NOTICE 'LDX #$% at PC=%', v2, rpc - 2; END IF;
          END;
        ELSIF opcode = 160 THEN -- 0xA0 LDY #imm
          DECLARE v3 integer;
          BEGIN
            v3 := read_byte(cpu, rpc);
            rpc := (rpc + 1) & 65535;
            ry := v3 & 255;
            rp := (rp & ~(2|128)) | (CASE WHEN ry = 0 THEN 2 ELSE 0 END) | (CASE WHEN (ry & 128) <> 0 THEN 128 ELSE 0 END);
            cycles := 2;
            IF trace THEN RAISE NOTICE 'LDY #$% at PC=%', v3, rpc - 2; END IF;
          END;
        ELSIF opcode = 165 THEN -- 0xA5 LDA zp
          DECLARE zpaddr integer; v4 integer;
          BEGIN
            zpaddr := read_byte(cpu, rpc) & 255;
            rpc := (rpc + 1) & 65535;
            v4 := read_byte(cpu, zpaddr);
            ra := v4 & 255;
            rp := (rp & ~(2|128)) | (CASE WHEN ra = 0 THEN 2 ELSE 0 END) | (CASE WHEN (ra & 128) <> 0 THEN 128 ELSE 0 END);
            cycles := 3;
            IF trace THEN RAISE NOTICE 'LDA $%02x', zpaddr; END IF;
          END;
        ELSIF opcode = 166 THEN -- 0xA6 LDX zp
          DECLARE zpaddr2 integer; v5 integer;
          BEGIN
            zpaddr2 := read_byte(cpu, rpc) & 255;
            rpc := (rpc + 1) & 65535;
            v5 := read_byte(cpu, zpaddr2);
            rx := v5 & 255;
            rp := (rp & ~(2|128)) | (CASE WHEN rx = 0 THEN 2 ELSE 0 END) | (CASE WHEN (rx & 128) <> 0 THEN 128 ELSE 0 END);
            cycles := 3;
          END;
        ELSIF opcode = 164 THEN -- 0xA4 LDY zp
          DECLARE zpaddr3 integer; v6 integer;
          BEGIN
            zpaddr3 := read_byte(cpu, rpc) & 255;
            rpc := (rpc + 1) & 65535;
            v6 := read_byte(cpu, zpaddr3);
            ry := v6 & 255;
            rp := (rp & ~(2|128)) | (CASE WHEN ry = 0 THEN 2 ELSE 0 END) | (CASE WHEN (ry & 128) <> 0 THEN 128 ELSE 0 END);
            cycles := 3;
          END;
        ELSIF opcode = 180 THEN -- 0xB4 LDY zp,X
          DECLARE zpaddr integer; v integer;
          BEGIN
            zpaddr := (read_byte(cpu, rpc) + rx) & 255;
            rpc := (rpc + 1) & 65535;
            v := read_byte(cpu, zpaddr);
            ry := v & 255;
            rp := (rp & ~(2|128)) | (CASE WHEN ry = 0 THEN 2 ELSE 0 END) | (CASE WHEN (ry & 128) <> 0 THEN 128 ELSE 0 END);
            cycles := 4;
          END;
        ELSIF opcode = 172 THEN -- 0xAC LDY abs
          DECLARE addr integer; v integer;
          BEGIN
            addr := read_word(cpu, rpc);
            rpc := (rpc + 2) & 65535;
            v := read_byte(cpu, addr);
            ry := v & 255;
            rp := (rp & ~(2|128)) | (CASE WHEN ry = 0 THEN 2 ELSE 0 END) | (CASE WHEN (ry & 128) <> 0 THEN 128 ELSE 0 END);
            cycles := 4;
          END;
        ELSIF opcode = 188 THEN -- 0xBC LDY abs,X
          DECLARE base integer; eff integer; v integer; crossed boolean;
          BEGIN
            base := read_word(cpu, rpc);
            rpc := (rpc + 2) & 65535;
            eff := (base + rx) & 65535;
            crossed := ((base & 65280) <> (eff & 65280));
            v := read_byte(cpu, eff);
            ry := v & 255;
            rp := (rp & ~(2|128)) | (CASE WHEN ry = 0 THEN 2 ELSE 0 END) | (CASE WHEN (ry & 128) <> 0 THEN 128 ELSE 0 END);
            cycles := 4 + CASE WHEN crossed THEN 1 ELSE 0 END;
          END;
        ELSIF opcode = 181 THEN -- 0xB5 LDA zp,X
          DECLARE zpaddrx integer; v7 integer;
          BEGIN
            zpaddrx := (read_byte(cpu, rpc) + rx) & 255;
            rpc := (rpc + 1) & 65535;
            v7 := read_byte(cpu, zpaddrx);
            ra := v7 & 255;
            rp := (rp & ~(2|128)) | (CASE WHEN ra = 0 THEN 2 ELSE 0 END) | (CASE WHEN (ra & 128) <> 0 THEN 128 ELSE 0 END);
            cycles := 4;
          END;
        ELSIF opcode = 182 THEN -- 0xB6 LDX zp,Y
          DECLARE zpaddry integer; v8 integer;
          BEGIN
            zpaddry := (read_byte(cpu, rpc) + ry) & 255;
            rpc := (rpc + 1) & 65535;
            v8 := read_byte(cpu, zpaddry);
            rx := v8 & 255;
            rp := (rp & ~(2|128)) | (CASE WHEN rx = 0 THEN 2 ELSE 0 END) | (CASE WHEN (rx & 128) <> 0 THEN 128 ELSE 0 END);
            cycles := 4;
          END;
        ELSIF opcode = 173 THEN -- 0xAD LDA abs
          DECLARE addr integer; v9 integer;
          BEGIN
            addr := read_word(cpu, rpc);
            rpc := (rpc + 2) & 65535;
            v9 := read_byte(cpu, addr);
            ra := v9 & 255;
            rp := (rp & ~(2|128)) | (CASE WHEN ra = 0 THEN 2 ELSE 0 END) | (CASE WHEN (ra & 128) <> 0 THEN 128 ELSE 0 END);
            cycles := 4;
          END;
        ELSIF opcode = 189 THEN -- 0xBD LDA abs,X
          DECLARE base integer; eff integer; v10 integer; crossed boolean;
          BEGIN
            base := read_word(cpu, rpc);
            rpc := (rpc + 2) & 65535;
            eff := (base + rx) & 65535;
            crossed := ((base & 65280) <> (eff & 65280));
            v10 := read_byte(cpu, eff);
            ra := v10 & 255;
            rp := (rp & ~(2|128)) | (CASE WHEN ra = 0 THEN 2 ELSE 0 END) | (CASE WHEN (ra & 128) <> 0 THEN 128 ELSE 0 END);
            cycles := 4 + CASE WHEN crossed THEN 1 ELSE 0 END;
          END;
        ELSIF opcode = 185 THEN -- 0xB9 LDA abs,Y
          DECLARE base2 integer; eff2 integer; v11 integer; crossed2 boolean;
          BEGIN
            base2 := read_word(cpu, rpc);
            rpc := (rpc + 2) & 65535;
            eff2 := (base2 + ry) & 65535;
            crossed2 := ((base2 & 65280) <> (eff2 & 65280));
            v11 := read_byte(cpu, eff2);
            ra := v11 & 255;
            rp := (rp & ~(2|128)) | (CASE WHEN ra = 0 THEN 2 ELSE 0 END) | (CASE WHEN (ra & 128) <> 0 THEN 128 ELSE 0 END);
            cycles := 4 + CASE WHEN crossed2 THEN 1 ELSE 0 END;
          END;
        ELSIF opcode = 105 THEN -- 0x69 ADC #imm
          DECLARE v integer; sum integer; a8 integer; carry_in integer; res integer; overflow boolean;
          BEGIN
            v := read_byte(cpu, rpc);
            rpc := (rpc + 1) & 65535;
            a8 := ra & 255;
            carry_in := CASE WHEN (rp & 1) <> 0 THEN 1 ELSE 0 END;
            sum := a8 + v + carry_in;
            res := sum & 255;
            -- set flags: N, Z, C, V (binary mode)
            rp := (rp & ~((1)|2|64|128)) | (CASE WHEN (sum > 255) THEN 1 ELSE 0 END) | (CASE WHEN res = 0 THEN 2 ELSE 0 END) | (CASE WHEN ((~(a8 # v) & (a8 # res)) & 128) <> 0 THEN 64 ELSE 0 END) | (CASE WHEN (res & 128) <> 0 THEN 128 ELSE 0 END);
            ra := res;
            cycles := 2;
          END;
        ELSIF opcode = 101 THEN -- 0x65 ADC zp
          DECLARE zpaddr integer; v integer; a8 integer; carry_in integer; sum integer; res integer;
          BEGIN
            zpaddr := read_byte(cpu, rpc) & 255;
            rpc := (rpc + 1) & 65535;
            v := read_byte(cpu, zpaddr);
            a8 := ra & 255;
            carry_in := CASE WHEN (rp & 1) <> 0 THEN 1 ELSE 0 END;
            sum := a8 + v + carry_in;
            res := sum & 255;
            rp := (rp & ~((1)|2|64|128)) | (CASE WHEN (sum > 255) THEN 1 ELSE 0 END) | (CASE WHEN res = 0 THEN 2 ELSE 0 END) | (CASE WHEN ((~(a8 # v) & (a8 # res)) & 128) <> 0 THEN 64 ELSE 0 END) | (CASE WHEN (res & 128) <> 0 THEN 128 ELSE 0 END);
            ra := res;
            cycles := 3;
          END;
        ELSIF opcode = 117 THEN -- 0x75 ADC zp,X
          DECLARE zpaddr integer; v integer; a8 integer; carry_in integer; sum integer; res integer;
          BEGIN
            zpaddr := (read_byte(cpu, rpc) + rx) & 255;
            rpc := (rpc + 1) & 65535;
            v := read_byte(cpu, zpaddr);
            a8 := ra & 255;
            carry_in := CASE WHEN (rp & 1) <> 0 THEN 1 ELSE 0 END;
            sum := a8 + v + carry_in;
            res := sum & 255;
            rp := (rp & ~((1)|2|64|128)) | (CASE WHEN (sum > 255) THEN 1 ELSE 0 END) | (CASE WHEN res = 0 THEN 2 ELSE 0 END) | (CASE WHEN ((~(a8 # v) & (a8 # res)) & 128) <> 0 THEN 64 ELSE 0 END) | (CASE WHEN (res & 128) <> 0 THEN 128 ELSE 0 END);
            ra := res;
            cycles := 4;
          END;
        ELSIF opcode = 109 THEN -- 0x6D ADC abs
          DECLARE addr integer; v integer; a8 integer; carry_in integer; sum integer; res integer;
          BEGIN
            addr := read_word(cpu, rpc);
            rpc := (rpc + 2) & 65535;
            v := read_byte(cpu, addr);
            a8 := ra & 255;
            carry_in := CASE WHEN (rp & 1) <> 0 THEN 1 ELSE 0 END;
            sum := a8 + v + carry_in;
            res := sum & 255;
            rp := (rp & ~((1)|2|64|128)) | (CASE WHEN (sum > 255) THEN 1 ELSE 0 END) | (CASE WHEN res = 0 THEN 2 ELSE 0 END) | (CASE WHEN ((~(a8 # v) & (a8 # res)) & 128) <> 0 THEN 64 ELSE 0 END) | (CASE WHEN (res & 128) <> 0 THEN 128 ELSE 0 END);
            ra := res;
            cycles := 4;
          END;
        ELSIF opcode = 125 THEN -- 0x7D ADC abs,X
          DECLARE base integer; eff integer; v integer; a8 integer; carry_in integer; sum integer; res integer; crossed boolean;
          BEGIN
            base := read_word(cpu, rpc);
            rpc := (rpc + 2) & 65535;
            eff := (base + rx) & 65535;
            crossed := ((base & 65280) <> (eff & 65280));
            v := read_byte(cpu, eff);
            a8 := ra & 255;
            carry_in := CASE WHEN (rp & 1) <> 0 THEN 1 ELSE 0 END;
            sum := a8 + v + carry_in;
            res := sum & 255;
            rp := (rp & ~((1)|2|64|128)) | (CASE WHEN (sum > 255) THEN 1 ELSE 0 END) | (CASE WHEN res = 0 THEN 2 ELSE 0 END) | (CASE WHEN ((~(a8 # v) & (a8 # res)) & 128) <> 0 THEN 64 ELSE 0 END) | (CASE WHEN (res & 128) <> 0 THEN 128 ELSE 0 END);
            ra := res;
            cycles := 4 + CASE WHEN crossed THEN 1 ELSE 0 END;
          END;
        ELSIF opcode = 121 THEN -- 0x79 ADC abs,Y
          DECLARE base integer; eff integer; v integer; a8 integer; carry_in integer; sum integer; res integer; crossed boolean;
          BEGIN
            base := read_word(cpu, rpc);
            rpc := (rpc + 2) & 65535;
            eff := (base + ry) & 65535;
            crossed := ((base & 65280) <> (eff & 65280));
            v := read_byte(cpu, eff);
            a8 := ra & 255;
            carry_in := CASE WHEN (rp & 1) <> 0 THEN 1 ELSE 0 END;
            sum := a8 + v + carry_in;
            res := sum & 255;
            rp := (rp & ~((1)|2|64|128)) | (CASE WHEN (sum > 255) THEN 1 ELSE 0 END) | (CASE WHEN res = 0 THEN 2 ELSE 0 END) | (CASE WHEN ((~(a8 # v) & (a8 # res)) & 128) <> 0 THEN 64 ELSE 0 END) | (CASE WHEN (res & 128) <> 0 THEN 128 ELSE 0 END);
            ra := res;
            cycles := 4 + CASE WHEN crossed THEN 1 ELSE 0 END;
          END;
        ELSIF opcode = 97 THEN -- 0x61 ADC (ind,X)
          DECLARE zp integer; lo integer; hi integer; eff integer; v integer; a8 integer; carry_in integer; sum integer; res integer;
          BEGIN
            zp := (read_byte(cpu, rpc) + rx) & 255;
            rpc := (rpc + 1) & 65535;
            lo := read_byte(cpu, zp);
            hi := read_byte(cpu, (zp + 1) & 255);
            eff := ((hi << 8) | lo) & 65535;
            v := read_byte(cpu, eff);
            a8 := ra & 255;
            carry_in := CASE WHEN (rp & 1) <> 0 THEN 1 ELSE 0 END;
            sum := a8 + v + carry_in;
            res := sum & 255;
            rp := (rp & ~((1)|2|64|128)) | (CASE WHEN (sum > 255) THEN 1 ELSE 0 END) | (CASE WHEN res = 0 THEN 2 ELSE 0 END) | (CASE WHEN ((~(a8 # v) & (a8 # res)) & 128) <> 0 THEN 64 ELSE 0 END) | (CASE WHEN (res & 128) <> 0 THEN 128 ELSE 0 END);
            ra := res;
            cycles := 6;
          END;
        ELSIF opcode = 113 THEN -- 0x71 ADC (ind),Y
          DECLARE zp integer; lo integer; hi integer; base integer; eff integer; v integer; a8 integer; carry_in integer; sum integer; res integer; crossed boolean;
          BEGIN
            zp := read_byte(cpu, rpc) & 255;
            rpc := (rpc + 1) & 65535;
            lo := read_byte(cpu, zp);
            hi := read_byte(cpu, (zp + 1) & 255);
            base := ((hi << 8) | lo) & 65535;
            eff := (base + ry) & 65535;
            crossed := ((base & 65280) <> (eff & 65280));
            v := read_byte(cpu, eff);
            a8 := ra & 255;
            carry_in := CASE WHEN (rp & 1) <> 0 THEN 1 ELSE 0 END;
            sum := a8 + v + carry_in;
            res := sum & 255;
            rp := (rp & ~((1)|2|64|128)) | (CASE WHEN (sum > 255) THEN 1 ELSE 0 END) | (CASE WHEN res = 0 THEN 2 ELSE 0 END) | (CASE WHEN ((~(a8 # v) & (a8 # res)) & 128) <> 0 THEN 64 ELSE 0 END) | (CASE WHEN (res & 128) <> 0 THEN 128 ELSE 0 END);
            ra := res;
            cycles := 5 + CASE WHEN crossed THEN 1 ELSE 0 END;
          END;
        ELSIF opcode = 133 THEN -- 0x85 STA zp
          DECLARE zpaddr integer;
          BEGIN
            zpaddr := read_byte(cpu, rpc) & 255;
            rpc := (rpc + 1) & 65535;
            PERFORM load_byte(cpu, zpaddr, ra);
            cycles := 3;
          END;
        ELSIF opcode = 141 THEN -- 0x8D STA abs
          DECLARE addr integer;
          BEGIN
            addr := read_word(cpu, rpc);
            rpc := (rpc + 2) & 65535;
            PERFORM load_byte(cpu, addr, ra);
            cycles := 4;
          END;
        ELSIF opcode = 149 THEN -- 0x95 STA zp,X
          DECLARE zpaddr integer;
          BEGIN
            zpaddr := (read_byte(cpu, rpc) + rx) & 255;
            rpc := (rpc + 1) & 65535;
            PERFORM load_byte(cpu, zpaddr, ra);
            cycles := 4;
          END;
        ELSIF opcode = 157 THEN -- 0x9D STA abs,X
          DECLARE base integer; addr integer;
          BEGIN
            base := read_word(cpu, rpc);
            rpc := (rpc + 2) & 65535;
            addr := (base + rx) & 65535;
            PERFORM load_byte(cpu, addr, ra);
            cycles := 5;
          END;
        ELSIF opcode = 153 THEN -- 0x99 STA abs,Y
          DECLARE base integer; addr integer;
          BEGIN
            base := read_word(cpu, rpc);
            rpc := (rpc + 2) & 65535;
            addr := (base + ry) & 65535;
            PERFORM load_byte(cpu, addr, ra);
            cycles := 5;
          END;
        ELSIF opcode = 129 THEN -- 0x81 STA (indirect,X)
          DECLARE zp integer; lo integer; hi integer; eff integer;
          BEGIN
            zp := (read_byte(cpu, rpc) + rx) & 255;
            rpc := (rpc + 1) & 65535;
            lo := read_byte(cpu, zp);
            hi := read_byte(cpu, (zp + 1) & 255);
            eff := ((hi << 8) | lo) & 65535;
            PERFORM load_byte(cpu, eff, ra);
            cycles := 6;
          END;
        ELSIF opcode = 145 THEN -- 0x91 STA (indirect),Y
          DECLARE zp integer; lo integer; hi integer; base integer; eff integer;
          BEGIN
            zp := read_byte(cpu, rpc) & 255;
            rpc := (rpc + 1) & 65535;
            lo := read_byte(cpu, zp);
            hi := read_byte(cpu, (zp + 1) & 255);
            base := ((hi << 8) | lo) & 65535;
            eff := (base + ry) & 65535;
            PERFORM load_byte(cpu, eff, ra);
            cycles := 6;
          END;
        ELSIF opcode = 134 THEN -- 0x86 STX zp
          DECLARE zpaddr integer;
          BEGIN
            zpaddr := read_byte(cpu, rpc) & 255;
            rpc := (rpc + 1) & 65535;
            PERFORM load_byte(cpu, zpaddr, rx);
            cycles := 3;
          END;
        ELSIF opcode = 150 THEN -- 0x96 STX zp,Y
          DECLARE zpaddr integer;
          BEGIN
            zpaddr := (read_byte(cpu, rpc) + ry) & 255;
            rpc := (rpc + 1) & 65535;
            PERFORM load_byte(cpu, zpaddr, rx);
            cycles := 4;
          END;
        ELSIF opcode = 142 THEN -- 0x8E STX abs
          DECLARE addr integer;
          BEGIN
            addr := read_word(cpu, rpc);
            rpc := (rpc + 2) & 65535;
            PERFORM load_byte(cpu, addr, rx);
            cycles := 4;
          END;
        ELSIF opcode = 132 THEN -- 0x84 STY zp
          DECLARE zpaddr integer;
          BEGIN
            zpaddr := read_byte(cpu, rpc) & 255;
            rpc := (rpc + 1) & 65535;
            PERFORM load_byte(cpu, zpaddr, ry);
            cycles := 3;
          END;
        ELSIF opcode = 148 THEN -- 0x94 STY zp,X
          DECLARE zpaddr integer;
          BEGIN
            zpaddr := (read_byte(cpu, rpc) + rx) & 255;
            rpc := (rpc + 1) & 65535;
            PERFORM load_byte(cpu, zpaddr, ry);
            cycles := 4;
          END;
        ELSIF opcode = 140 THEN -- 0x8C STY abs
          DECLARE addr integer;
          BEGIN
            addr := read_word(cpu, rpc);
            rpc := (rpc + 2) & 65535;
            PERFORM load_byte(cpu, addr, ry);
            cycles := 4;
          END;
        ELSIF opcode = 170 THEN -- 0xAA TAX
          BEGIN
            rx := ra & 255;
            rp := (rp & ~(2|128)) | (CASE WHEN rx = 0 THEN 2 ELSE 0 END) | (CASE WHEN (rx & 128) <> 0 THEN 128 ELSE 0 END);
            cycles := 2;
            IF trace THEN RAISE NOTICE 'TAX'; END IF;
          END;
        ELSIF opcode = 174 THEN -- 0xAE LDX abs
          DECLARE addr integer; v integer;
          BEGIN
            addr := read_word(cpu, rpc);
            rpc := (rpc + 2) & 65535;
            v := read_byte(cpu, addr);
            rx := v & 255;
            rp := (rp & ~(2|128)) | (CASE WHEN rx = 0 THEN 2 ELSE 0 END) | (CASE WHEN (rx & 128) <> 0 THEN 128 ELSE 0 END);
            cycles := 4;
          END;
        ELSIF opcode = 190 THEN -- 0xBE LDX abs,Y
          DECLARE base integer; eff integer; v integer; crossed boolean;
          BEGIN
            base := read_word(cpu, rpc);
            rpc := (rpc + 2) & 65535;
            eff := (base + ry) & 65535;
            crossed := ((base & 65280) <> (eff & 65280));
            v := read_byte(cpu, eff);
            rx := v & 255;
            rp := (rp & ~(2|128)) | (CASE WHEN rx = 0 THEN 2 ELSE 0 END) | (CASE WHEN (rx & 128) <> 0 THEN 128 ELSE 0 END);
            cycles := 4 + CASE WHEN crossed THEN 1 ELSE 0 END;
          END;
        ELSIF opcode = 72 THEN -- 0x48 PHA
          BEGIN
            PERFORM load_byte(cpu, 256 + rsp, ra & 255);
            rsp := (rsp - 1) & 255;
            cycles := 3;
          END;
        ELSIF opcode = 104 THEN -- 0x68 PLA
          DECLARE v integer;
          BEGIN
            rsp := (rsp + 1) & 255;
            v := read_byte(cpu, 256 + rsp);
            ra := v & 255;
            rp := (rp & ~(2|128)) | (CASE WHEN ra = 0 THEN 2 ELSE 0 END) | (CASE WHEN (ra & 128) <> 0 THEN 128 ELSE 0 END);
            cycles := 4;
          END;
        ELSIF opcode = 8 THEN -- 0x08 PHP
          DECLARE status_to_push integer;
          BEGIN
            status_to_push := (rp | 16 | 32) & 255;
            PERFORM load_byte(cpu, 256 + rsp, status_to_push);
            rsp := (rsp - 1) & 255;
            cycles := 3;
          END;
        ELSIF opcode = 40 THEN -- 0x28 PLP
          DECLARE st integer;
          BEGIN
            rsp := (rsp + 1) & 255;
            st := read_byte(cpu, 256 + rsp);
            st := (st & (~16) & 255) | 32;
            rp := st & 255;
            cycles := 4;
          END;
        ELSIF opcode IN (16,48,80,112,144,176,208,240) THEN -- Branches
          DECLARE off8 integer; cond boolean; oldpc integer; newpc integer; crossed boolean;
          BEGIN
            off8 := read_byte(cpu, rpc);
            rpc := (rpc + 1) & 65535;
            -- interpret offset as signed 8-bit
            IF off8 >= 128 THEN off8 := off8 - 256; END IF;
            cond := FALSE;
            IF opcode = 16 THEN cond := (rp & 128) = 0; END IF; -- BPL
            IF opcode = 48 THEN cond := (rp & 128) <> 0; END IF; -- BMI
            IF opcode = 80 THEN cond := (rp & 64) = 0; END IF; -- BVC
            IF opcode = 112 THEN cond := (rp & 64) <> 0; END IF; -- BVS
            IF opcode = 144 THEN cond := (rp & 1) = 0; END IF; -- BCC
            IF opcode = 176 THEN cond := (rp & 1) <> 0; END IF; -- BCS
            IF opcode = 208 THEN cond := (rp & 2) = 0; END IF; -- BNE
            IF opcode = 240 THEN cond := (rp & 2) <> 0; END IF; -- BEQ
            IF cond THEN
              oldpc := rpc;
              newpc := (rpc + off8) & 65535;
              crossed := ((oldpc & 65280) <> (newpc & 65280));
              rpc := newpc;
              cycles := 3 + CASE WHEN crossed THEN 1 ELSE 0 END;
            ELSE
              cycles := 2;
            END IF;
          END;
        ELSIF opcode = 24 THEN -- 0x18 CLC
          BEGIN
            rp := (rp & (~1) & 255);
            cycles := 2;
          END;
        ELSIF opcode = 56 THEN -- 0x38 SEC
          BEGIN
            rp := (rp | 1) & 255;
            cycles := 2;
          END;
        ELSIF opcode = 88 THEN -- 0x58 CLI
          BEGIN
            rp := (rp & (~4) & 255);
            cycles := 2;
          END;
        ELSIF opcode = 120 THEN -- 0x78 SEI
          BEGIN
            rp := (rp | 4) & 255;
            cycles := 2;
          END;
        ELSIF opcode = 216 THEN -- 0xD8 CLD
          BEGIN
            rp := (rp & (~8) & 255);
            cycles := 2;
          END;
        ELSIF opcode = 248 THEN -- 0xF8 SED
          BEGIN
            rp := (rp | 8) & 255;
            cycles := 2;
          END;
        ELSIF opcode = 184 THEN -- 0xB8 CLV
          BEGIN
            rp := (rp & (~64) & 255);
            cycles := 2;
          END;
        ELSIF opcode = 10 THEN -- 0x0A ASL A
          DECLARE carry_out integer; r integer;
          BEGIN
            carry_out := (ra >> 7) & 1;
            r := (ra << 1) & 255;
            ra := r;
            rp := (rp & ~((1)|2|128)) | carry_out | (CASE WHEN r = 0 THEN 2 ELSE 0 END) | (CASE WHEN (r & 128) <> 0 THEN 128 ELSE 0 END);
            cycles := 2;
          END;
        ELSIF opcode = 6 THEN -- 0x06 ASL zp
          DECLARE zpaddr integer; v integer; carry_out integer; r integer;
          BEGIN
            zpaddr := read_byte(cpu, rpc) & 255;
            rpc := (rpc + 1) & 65535;
            v := read_byte(cpu, zpaddr);
            carry_out := (v >> 7) & 1;
            r := (v << 1) & 255;
            PERFORM load_byte(cpu, zpaddr, r);
            rp := (rp & ~((1)|2|128)) | carry_out | (CASE WHEN r = 0 THEN 2 ELSE 0 END) | (CASE WHEN (r & 128) <> 0 THEN 128 ELSE 0 END);
            cycles := 5;
          END;
        ELSIF opcode = 14 THEN -- 0x0E ASL abs
          DECLARE addr integer; v integer; carry_out integer; r integer;
          BEGIN
            addr := read_word(cpu, rpc);
            rpc := (rpc + 2) & 65535;
            v := read_byte(cpu, addr);
            carry_out := (v >> 7) & 1;
            r := (v << 1) & 255;
            PERFORM load_byte(cpu, addr, r);
            rp := (rp & ~((1)|2|128)) | carry_out | (CASE WHEN r = 0 THEN 2 ELSE 0 END) | (CASE WHEN (r & 128) <> 0 THEN 128 ELSE 0 END);
            cycles := 6;
          END;
        ELSIF opcode = 22 THEN -- 0x16 ASL zp,X
          DECLARE zpaddr integer; v integer; carry_out integer; r integer;
          BEGIN
            zpaddr := (read_byte(cpu, rpc) + rx) & 255;
            rpc := (rpc + 1) & 65535;
            v := read_byte(cpu, zpaddr);
            carry_out := (v >> 7) & 1;
            r := (v << 1) & 255;
            PERFORM load_byte(cpu, zpaddr, r);
            rp := (rp & ~((1)|2|128)) | carry_out | (CASE WHEN r = 0 THEN 2 ELSE 0 END) | (CASE WHEN (r & 128) <> 0 THEN 128 ELSE 0 END);
            cycles := 6;
          END;
        ELSIF opcode = 30 THEN -- 0x1E ASL abs,X
          DECLARE base integer; addr integer; v integer; carry_out integer; r integer;
          BEGIN
            base := read_word(cpu, rpc);
            rpc := (rpc + 2) & 65535;
            addr := (base + rx) & 65535;
            v := read_byte(cpu, addr);
            carry_out := (v >> 7) & 1;
            r := (v << 1) & 255;
            PERFORM load_byte(cpu, addr, r);
            rp := (rp & ~((1)|2|128)) | carry_out | (CASE WHEN r = 0 THEN 2 ELSE 0 END) | (CASE WHEN (r & 128) <> 0 THEN 128 ELSE 0 END);
            cycles := 7;
          END;
        ELSIF opcode = 74 THEN -- 0x4A LSR A
          DECLARE carry_out integer; r integer;
          BEGIN
            carry_out := (ra & 1);
            r := (ra >> 1) & 255;
            ra := r;
            rp := (rp & ~((1)|2|128)) | carry_out | (CASE WHEN r = 0 THEN 2 ELSE 0 END) | (CASE WHEN (r & 128) <> 0 THEN 128 ELSE 0 END);
            cycles := 2;
          END;
        ELSIF opcode = 70 THEN -- 0x46 LSR zp
          DECLARE zpaddr integer; v integer; carry_out integer; r integer;
          BEGIN
            zpaddr := read_byte(cpu, rpc) & 255;
            rpc := (rpc + 1) & 65535;
            v := read_byte(cpu, zpaddr);
            carry_out := (v & 1);
            r := (v >> 1) & 255;
            PERFORM load_byte(cpu, zpaddr, r);
            rp := (rp & ~((1)|2|128)) | carry_out | (CASE WHEN r = 0 THEN 2 ELSE 0 END) | (CASE WHEN (r & 128) <> 0 THEN 128 ELSE 0 END);
            cycles := 5;
          END;
        ELSIF opcode = 86 THEN -- 0x56 LSR zp,X
          DECLARE zpaddr integer; v integer; carry_out integer; r integer;
          BEGIN
            zpaddr := (read_byte(cpu, rpc) + rx) & 255;
            rpc := (rpc + 1) & 65535;
            v := read_byte(cpu, zpaddr);
            carry_out := (v & 1);
            r := (v >> 1) & 255;
            PERFORM load_byte(cpu, zpaddr, r);
            rp := (rp & ~((1)|2|128)) | carry_out | (CASE WHEN r = 0 THEN 2 ELSE 0 END) | (CASE WHEN (r & 128) <> 0 THEN 128 ELSE 0 END);
            cycles := 6;
          END;
        ELSIF opcode = 78 THEN -- 0x4E LSR abs
          DECLARE addr integer; v integer; carry_out integer; r integer;
          BEGIN
            addr := read_word(cpu, rpc);
            rpc := (rpc + 2) & 65535;
            v := read_byte(cpu, addr);
            carry_out := (v & 1);
            r := (v >> 1) & 255;
            PERFORM load_byte(cpu, addr, r);
            rp := (rp & ~((1)|2|128)) | carry_out | (CASE WHEN r = 0 THEN 2 ELSE 0 END) | (CASE WHEN (r & 128) <> 0 THEN 128 ELSE 0 END);
            cycles := 6;
          END;
        ELSIF opcode = 94 THEN -- 0x5E LSR abs,X
          DECLARE base integer; addr integer; v integer; carry_out integer; r integer;
          BEGIN
            base := read_word(cpu, rpc);
            rpc := (rpc + 2) & 65535;
            addr := (base + rx) & 65535;
            v := read_byte(cpu, addr);
            carry_out := (v & 1);
            r := (v >> 1) & 255;
            PERFORM load_byte(cpu, addr, r);
            rp := (rp & ~((1)|2|128)) | carry_out | (CASE WHEN r = 0 THEN 2 ELSE 0 END) | (CASE WHEN (r & 128) <> 0 THEN 128 ELSE 0 END);
            cycles := 7;
          END;
        ELSIF opcode = 42 THEN -- 0x2A ROL A
          DECLARE carry_in integer; carry_out integer; r integer;
          BEGIN
            carry_in := CASE WHEN (rp & 1) <> 0 THEN 1 ELSE 0 END;
            carry_out := (ra >> 7) & 1;
            r := ((ra << 1) | carry_in) & 255;
            ra := r;
            rp := (rp & ~((1)|2|128)) | carry_out | (CASE WHEN r = 0 THEN 2 ELSE 0 END) | (CASE WHEN (r & 128) <> 0 THEN 128 ELSE 0 END);
            cycles := 2;
          END;
        ELSIF opcode = 38 THEN -- 0x26 ROL zp
          DECLARE zpaddr integer; v integer; carry_in integer; carry_out integer; r integer;
          BEGIN
            zpaddr := read_byte(cpu, rpc) & 255;
            rpc := (rpc + 1) & 65535;
            v := read_byte(cpu, zpaddr);
            carry_in := CASE WHEN (rp & 1) <> 0 THEN 1 ELSE 0 END;
            carry_out := (v >> 7) & 1;
            r := ((v << 1) | carry_in) & 255;
            PERFORM load_byte(cpu, zpaddr, r);
            rp := (rp & ~((1)|2|128)) | carry_out | (CASE WHEN r = 0 THEN 2 ELSE 0 END) | (CASE WHEN (r & 128) <> 0 THEN 128 ELSE 0 END);
            cycles := 5;
          END;
        ELSIF opcode = 54 THEN -- 0x36 ROL zp,X
          DECLARE zpaddr integer; v integer; carry_in integer; carry_out integer; r integer;
          BEGIN
            zpaddr := (read_byte(cpu, rpc) + rx) & 255;
            rpc := (rpc + 1) & 65535;
            v := read_byte(cpu, zpaddr);
            carry_in := CASE WHEN (rp & 1) <> 0 THEN 1 ELSE 0 END;
            carry_out := (v >> 7) & 1;
            r := ((v << 1) | carry_in) & 255;
            PERFORM load_byte(cpu, zpaddr, r);
            rp := (rp & ~((1)|2|128)) | carry_out | (CASE WHEN r = 0 THEN 2 ELSE 0 END) | (CASE WHEN (r & 128) <> 0 THEN 128 ELSE 0 END);
            cycles := 6;
          END;
        ELSIF opcode = 46 THEN -- 0x2E ROL abs
          DECLARE addr integer; v integer; carry_in integer; carry_out integer; r integer;
          BEGIN
            addr := read_word(cpu, rpc);
            rpc := (rpc + 2) & 65535;
            v := read_byte(cpu, addr);
            carry_in := CASE WHEN (rp & 1) <> 0 THEN 1 ELSE 0 END;
            carry_out := (v >> 7) & 1;
            r := ((v << 1) | carry_in) & 255;
            PERFORM load_byte(cpu, addr, r);
            rp := (rp & ~((1)|2|128)) | carry_out | (CASE WHEN r = 0 THEN 2 ELSE 0 END) | (CASE WHEN (r & 128) <> 0 THEN 128 ELSE 0 END);
            cycles := 6;
          END;
        ELSIF opcode = 62 THEN -- 0x3E ROL abs,X
          DECLARE base integer; addr integer; v integer; carry_in integer; carry_out integer; r integer;
          BEGIN
            base := read_word(cpu, rpc);
            rpc := (rpc + 2) & 65535;
            addr := (base + rx) & 65535;
            v := read_byte(cpu, addr);
            carry_in := CASE WHEN (rp & 1) <> 0 THEN 1 ELSE 0 END;
            carry_out := (v >> 7) & 1;
            r := ((v << 1) | carry_in) & 255;
            PERFORM load_byte(cpu, addr, r);
            rp := (rp & ~((1)|2|128)) | carry_out | (CASE WHEN r = 0 THEN 2 ELSE 0 END) | (CASE WHEN (r & 128) <> 0 THEN 128 ELSE 0 END);
            cycles := 7;
          END;
        ELSIF opcode = 106 THEN -- 0x6A ROR A
          DECLARE carry_in integer; carry_out integer; r integer;
          BEGIN
            carry_in := CASE WHEN (rp & 1) <> 0 THEN 128 ELSE 0 END;
            carry_out := (ra & 1);
            r := ((ra >> 1) | carry_in) & 255;
            ra := r;
            rp := (rp & ~((1)|2|128)) | carry_out | (CASE WHEN r = 0 THEN 2 ELSE 0 END) | (CASE WHEN (r & 128) <> 0 THEN 128 ELSE 0 END);
            cycles := 2;
          END;
        ELSIF opcode = 102 THEN -- 0x66 ROR zp
          DECLARE zpaddr integer; v integer; carry_in integer; carry_out integer; r integer;
          BEGIN
            zpaddr := read_byte(cpu, rpc) & 255;
            rpc := (rpc + 1) & 65535;
            v := read_byte(cpu, zpaddr);
            carry_in := CASE WHEN (rp & 1) <> 0 THEN 128 ELSE 0 END;
            carry_out := (v & 1);
            r := ((v >> 1) | carry_in) & 255;
            PERFORM load_byte(cpu, zpaddr, r);
            rp := (rp & ~((1)|2|128)) | carry_out | (CASE WHEN r = 0 THEN 2 ELSE 0 END) | (CASE WHEN (r & 128) <> 0 THEN 128 ELSE 0 END);
            cycles := 5;
          END;
        ELSIF opcode = 118 THEN -- 0x76 ROR zp,X
          DECLARE zpaddr integer; v integer; carry_in integer; carry_out integer; r integer;
          BEGIN
            zpaddr := (read_byte(cpu, rpc) + rx) & 255;
            rpc := (rpc + 1) & 65535;
            v := read_byte(cpu, zpaddr);
            carry_in := CASE WHEN (rp & 1) <> 0 THEN 128 ELSE 0 END;
            carry_out := (v & 1);
            r := ((v >> 1) | carry_in) & 255;
            PERFORM load_byte(cpu, zpaddr, r);
            rp := (rp & ~((1)|2|128)) | carry_out | (CASE WHEN r = 0 THEN 2 ELSE 0 END) | (CASE WHEN (r & 128) <> 0 THEN 128 ELSE 0 END);
            cycles := 6;
          END;
        ELSIF opcode = 110 THEN -- 0x6E ROR abs
          DECLARE addr integer; v integer; carry_in integer; carry_out integer; r integer;
          BEGIN
            addr := read_word(cpu, rpc);
            rpc := (rpc + 2) & 65535;
            v := read_byte(cpu, addr);
            carry_in := CASE WHEN (rp & 1) <> 0 THEN 128 ELSE 0 END;
            carry_out := (v & 1);
            r := ((v >> 1) | carry_in) & 255;
            PERFORM load_byte(cpu, addr, r);
            rp := (rp & ~((1)|2|128)) | carry_out | (CASE WHEN r = 0 THEN 2 ELSE 0 END) | (CASE WHEN (r & 128) <> 0 THEN 128 ELSE 0 END);
            cycles := 6;
          END;
        ELSIF opcode = 126 THEN -- 0x7E ROR abs,X
          DECLARE base integer; addr integer; v integer; carry_in integer; carry_out integer; r integer;
          BEGIN
            base := read_word(cpu, rpc);
            rpc := (rpc + 2) & 65535;
            addr := (base + rx) & 65535;
            v := read_byte(cpu, addr);
            carry_in := CASE WHEN (rp & 1) <> 0 THEN 128 ELSE 0 END;
            carry_out := (v & 1);
            r := ((v >> 1) | carry_in) & 255;
            PERFORM load_byte(cpu, addr, r);
            rp := (rp & ~((1)|2|128)) | carry_out | (CASE WHEN r = 0 THEN 2 ELSE 0 END) | (CASE WHEN (r & 128) <> 0 THEN 128 ELSE 0 END);
            cycles := 7;
          END;
        ELSIF opcode = 230 THEN -- 0xE6 INC zp
          DECLARE zpaddr integer; v integer; r integer;
          BEGIN
            zpaddr := read_byte(cpu, rpc) & 255;
            rpc := (rpc + 1) & 65535;
            v := read_byte(cpu, zpaddr);
            r := (v + 1) & 255;
            PERFORM load_byte(cpu, zpaddr, r);
            rp := (rp & ~(2|128)) | (CASE WHEN r = 0 THEN 2 ELSE 0 END) | (CASE WHEN (r & 128) <> 0 THEN 128 ELSE 0 END);
            cycles := 5;
          END;
        ELSIF opcode = 246 THEN -- 0xF6 INC zp,X
          DECLARE zpaddr integer; v integer; r integer;
          BEGIN
            zpaddr := (read_byte(cpu, rpc) + rx) & 255;
            rpc := (rpc + 1) & 65535;
            v := read_byte(cpu, zpaddr);
            r := (v + 1) & 255;
            PERFORM load_byte(cpu, zpaddr, r);
            rp := (rp & ~(2|128)) | (CASE WHEN r = 0 THEN 2 ELSE 0 END) | (CASE WHEN (r & 128) <> 0 THEN 128 ELSE 0 END);
            cycles := 6;
          END;
        ELSIF opcode = 238 THEN -- 0xEE INC abs
          DECLARE addr integer; v integer; r integer;
          BEGIN
            addr := read_word(cpu, rpc);
            rpc := (rpc + 2) & 65535;
            v := read_byte(cpu, addr);
            r := (v + 1) & 255;
            PERFORM load_byte(cpu, addr, r);
            rp := (rp & ~(2|128)) | (CASE WHEN r = 0 THEN 2 ELSE 0 END) | (CASE WHEN (r & 128) <> 0 THEN 128 ELSE 0 END);
            cycles := 6;
          END;
        ELSIF opcode = 254 THEN -- 0xFE INC abs,X
          DECLARE base integer; addr integer; v integer; r integer;
          BEGIN
            base := read_word(cpu, rpc);
            rpc := (rpc + 2) & 65535;
            addr := (base + rx) & 65535;
            v := read_byte(cpu, addr);
            r := (v + 1) & 255;
            PERFORM load_byte(cpu, addr, r);
            rp := (rp & ~(2|128)) | (CASE WHEN r = 0 THEN 2 ELSE 0 END) | (CASE WHEN (r & 128) <> 0 THEN 128 ELSE 0 END);
            cycles := 7;
          END;
        ELSIF opcode = 198 THEN -- 0xC6 DEC zp
          DECLARE zpaddr integer; v integer; r integer;
          BEGIN
            zpaddr := read_byte(cpu, rpc) & 255;
            rpc := (rpc + 1) & 65535;
            v := read_byte(cpu, zpaddr);
            r := (v - 1) & 255;
            PERFORM load_byte(cpu, zpaddr, r);
            rp := (rp & ~(2|128)) | (CASE WHEN r = 0 THEN 2 ELSE 0 END) | (CASE WHEN (r & 128) <> 0 THEN 128 ELSE 0 END);
            cycles := 5;
          END;
        ELSIF opcode = 214 THEN -- 0xD6 DEC zp,X
          DECLARE zpaddr integer; v integer; r integer;
          BEGIN
            zpaddr := (read_byte(cpu, rpc) + rx) & 255;
            rpc := (rpc + 1) & 65535;
            v := read_byte(cpu, zpaddr);
            r := (v - 1) & 255;
            PERFORM load_byte(cpu, zpaddr, r);
            rp := (rp & ~(2|128)) | (CASE WHEN r = 0 THEN 2 ELSE 0 END) | (CASE WHEN (r & 128) <> 0 THEN 128 ELSE 0 END);
            cycles := 6;
          END;
        ELSIF opcode = 206 THEN -- 0xCE DEC abs
          DECLARE addr integer; v integer; r integer;
          BEGIN
            addr := read_word(cpu, rpc);
            rpc := (rpc + 2) & 65535;
            v := read_byte(cpu, addr);
            r := (v - 1) & 255;
            PERFORM load_byte(cpu, addr, r);
            rp := (rp & ~(2|128)) | (CASE WHEN r = 0 THEN 2 ELSE 0 END) | (CASE WHEN (r & 128) <> 0 THEN 128 ELSE 0 END);
            cycles := 6;
          END;
        ELSIF opcode = 222 THEN -- 0xDE DEC abs,X
          DECLARE base integer; addr integer; v integer; r integer;
          BEGIN
            base := read_word(cpu, rpc);
            rpc := (rpc + 2) & 65535;
            addr := (base + rx) & 65535;
            v := read_byte(cpu, addr);
            r := (v - 1) & 255;
            PERFORM load_byte(cpu, addr, r);
            rp := (rp & ~(2|128)) | (CASE WHEN r = 0 THEN 2 ELSE 0 END) | (CASE WHEN (r & 128) <> 0 THEN 128 ELSE 0 END);
            cycles := 7;
          END;
        ELSIF opcode = 168 THEN -- 0xA8 TAY
          BEGIN
            ry := ra & 255;
            rp := (rp & ~(2|128)) | (CASE WHEN ry = 0 THEN 2 ELSE 0 END) | (CASE WHEN (ry & 128) <> 0 THEN 128 ELSE 0 END);
            cycles := 2;
          END;
        ELSIF opcode = 138 THEN -- 0x8A TXA
          BEGIN
            ra := rx & 255;
            rp := (rp & ~(2|128)) | (CASE WHEN ra = 0 THEN 2 ELSE 0 END) | (CASE WHEN (ra & 128) <> 0 THEN 128 ELSE 0 END);
            cycles := 2;
          END;
        ELSIF opcode = 152 THEN -- 0x98 TYA
          BEGIN
            ra := ry & 255;
            rp := (rp & ~(2|128)) | (CASE WHEN ra = 0 THEN 2 ELSE 0 END) | (CASE WHEN (ra & 128) <> 0 THEN 128 ELSE 0 END);
            cycles := 2;
          END;
        ELSIF opcode = 186 THEN -- 0xBA TSX
          BEGIN
            rx := rsp & 255;
            rp := (rp & ~(2|128)) | (CASE WHEN rx = 0 THEN 2 ELSE 0 END) | (CASE WHEN (rx & 128) <> 0 THEN 128 ELSE 0 END);
            cycles := 2;
          END;
        ELSIF opcode = 154 THEN -- 0x9A TXS
          BEGIN
            rsp := rx & 255;
            cycles := 2;
          END;
        ELSIF opcode = 232 THEN -- 0xE8 INX
          BEGIN
            rx := (rx + 1) & 255;
            rp := (rp & ~(2|128)) | (CASE WHEN rx = 0 THEN 2 ELSE 0 END) | (CASE WHEN (rx & 128) <> 0 THEN 128 ELSE 0 END);
            cycles := 2;
          END;
        ELSIF opcode = 200 THEN -- 0xC8 INY
          BEGIN
            ry := (ry + 1) & 255;
            rp := (rp & ~(2|128)) | (CASE WHEN ry = 0 THEN 2 ELSE 0 END) | (CASE WHEN (ry & 128) <> 0 THEN 128 ELSE 0 END);
            cycles := 2;
          END;
        ELSIF opcode = 202 THEN -- 0xCA DEX
          BEGIN
            rx := (rx - 1) & 255;
            rp := (rp & ~(2|128)) | (CASE WHEN rx = 0 THEN 2 ELSE 0 END) | (CASE WHEN (rx & 128) <> 0 THEN 128 ELSE 0 END);
            cycles := 2;
          END;
        ELSIF opcode = 136 THEN -- 0x88 DEY
          BEGIN
            ry := (ry - 1) & 255;
            rp := (rp & ~(2|128)) | (CASE WHEN ry = 0 THEN 2 ELSE 0 END) | (CASE WHEN (ry & 128) <> 0 THEN 128 ELSE 0 END);
            cycles := 2;
          END;
        ELSIF opcode = 41 THEN -- 0x29 AND #imm
          DECLARE v integer; r integer;
          BEGIN
            v := read_byte(cpu, rpc);
            rpc := (rpc + 1) & 65535;
            r := (ra & v) & 255;
            ra := r;
            rp := (rp & ~(2|128)) | (CASE WHEN r = 0 THEN 2 ELSE 0 END) | (CASE WHEN (r & 128) <> 0 THEN 128 ELSE 0 END);
            cycles := 2;
          END;
        ELSIF opcode = 37 THEN -- 0x25 AND zp
          DECLARE zpaddr integer; v integer; r integer;
          BEGIN
            zpaddr := read_byte(cpu, rpc) & 255;
            rpc := (rpc + 1) & 65535;
            v := read_byte(cpu, zpaddr);
            r := (ra & v) & 255;
            ra := r;
            rp := (rp & ~(2|128)) | (CASE WHEN r = 0 THEN 2 ELSE 0 END) | (CASE WHEN (r & 128) <> 0 THEN 128 ELSE 0 END);
            cycles := 3;
          END;
        ELSIF opcode = 53 THEN -- 0x35 AND zp,X
          DECLARE zpaddr integer; v integer; r integer;
          BEGIN
            zpaddr := (read_byte(cpu, rpc) + rx) & 255;
            rpc := (rpc + 1) & 65535;
            v := read_byte(cpu, zpaddr);
            r := (ra & v) & 255;
            ra := r;
            rp := (rp & ~(2|128)) | (CASE WHEN r = 0 THEN 2 ELSE 0 END) | (CASE WHEN (r & 128) <> 0 THEN 128 ELSE 0 END);
            cycles := 4;
          END;
        ELSIF opcode = 45 THEN -- 0x2D AND abs
          DECLARE addr integer; v integer; r integer;
          BEGIN
            addr := read_word(cpu, rpc);
            rpc := (rpc + 2) & 65535;
            v := read_byte(cpu, addr);
            r := (ra & v) & 255;
            ra := r;
            rp := (rp & ~(2|128)) | (CASE WHEN r = 0 THEN 2 ELSE 0 END) | (CASE WHEN (r & 128) <> 0 THEN 128 ELSE 0 END);
            cycles := 4;
          END;
        ELSIF opcode = 61 THEN -- 0x3D AND abs,X
          DECLARE base integer; eff integer; v integer; r integer; crossed boolean;
          BEGIN
            base := read_word(cpu, rpc);
            rpc := (rpc + 2) & 65535;
            eff := (base + rx) & 65535;
            crossed := ((base & 65280) <> (eff & 65280));
            v := read_byte(cpu, eff);
            r := (ra & v) & 255;
            ra := r;
            rp := (rp & ~(2|128)) | (CASE WHEN r = 0 THEN 2 ELSE 0 END) | (CASE WHEN (r & 128) <> 0 THEN 128 ELSE 0 END);
            cycles := 4 + CASE WHEN crossed THEN 1 ELSE 0 END;
          END;
        ELSIF opcode = 57 THEN -- 0x39 AND abs,Y
          DECLARE base integer; eff integer; v integer; r integer; crossed boolean;
          BEGIN
            base := read_word(cpu, rpc);
            rpc := (rpc + 2) & 65535;
            eff := (base + ry) & 65535;
            crossed := ((base & 65280) <> (eff & 65280));
            v := read_byte(cpu, eff);
            r := (ra & v) & 255;
            ra := r;
            rp := (rp & ~(2|128)) | (CASE WHEN r = 0 THEN 2 ELSE 0 END) | (CASE WHEN (r & 128) <> 0 THEN 128 ELSE 0 END);
            cycles := 4 + CASE WHEN crossed THEN 1 ELSE 0 END;
          END;
        ELSIF opcode = 33 THEN -- 0x21 AND (ind,X)
          DECLARE zp integer; lo integer; hi integer; eff integer; v integer; r integer;
          BEGIN
            zp := (read_byte(cpu, rpc) + rx) & 255;
            rpc := (rpc + 1) & 65535;
            lo := read_byte(cpu, zp);
            hi := read_byte(cpu, (zp + 1) & 255);
            eff := ((hi << 8) | lo) & 65535;
            v := read_byte(cpu, eff);
            r := (ra & v) & 255;
            ra := r;
            rp := (rp & ~(2|128)) | (CASE WHEN r = 0 THEN 2 ELSE 0 END) | (CASE WHEN (r & 128) <> 0 THEN 128 ELSE 0 END);
            cycles := 6;
          END;
        ELSIF opcode = 49 THEN -- 0x31 AND (ind),Y
          DECLARE zp integer; lo integer; hi integer; base integer; eff integer; v integer; r integer; crossed boolean;
          BEGIN
            zp := read_byte(cpu, rpc) & 255;
            rpc := (rpc + 1) & 65535;
            lo := read_byte(cpu, zp);
            hi := read_byte(cpu, (zp + 1) & 255);
            base := ((hi << 8) | lo) & 65535;
            eff := (base + ry) & 65535;
            crossed := ((base & 65280) <> (eff & 65280));
            v := read_byte(cpu, eff);
            r := (ra & v) & 255;
            ra := r;
            rp := (rp & ~(2|128)) | (CASE WHEN r = 0 THEN 2 ELSE 0 END) | (CASE WHEN (r & 128) <> 0 THEN 128 ELSE 0 END);
            cycles := 5 + CASE WHEN crossed THEN 1 ELSE 0 END;
          END;
        ELSIF opcode = 9 THEN -- 0x09 ORA #imm
          DECLARE v integer; r integer;
          BEGIN
            v := read_byte(cpu, rpc);
            rpc := (rpc + 1) & 65535;
            r := (ra | v) & 255;
            ra := r;
            rp := (rp & ~(2|128)) | (CASE WHEN r = 0 THEN 2 ELSE 0 END) | (CASE WHEN (r & 128) <> 0 THEN 128 ELSE 0 END);
            cycles := 2;
          END;
        ELSIF opcode = 5 THEN -- 0x05 ORA zp
          DECLARE zpaddr integer; v integer; r integer;
          BEGIN
            zpaddr := read_byte(cpu, rpc) & 255;
            rpc := (rpc + 1) & 65535;
            v := read_byte(cpu, zpaddr);
            r := (ra | v) & 255;
            ra := r;
            rp := (rp & ~(2|128)) | (CASE WHEN r = 0 THEN 2 ELSE 0 END) | (CASE WHEN (r & 128) <> 0 THEN 128 ELSE 0 END);
            cycles := 3;
          END;
        ELSIF opcode = 13 THEN -- 0x0D ORA abs
          DECLARE addr integer; v integer; r integer;
          BEGIN
            addr := read_word(cpu, rpc);
            rpc := (rpc + 2) & 65535;
            v := read_byte(cpu, addr);
            r := (ra | v) & 255;
            ra := r;
            rp := (rp & ~(2|128)) | (CASE WHEN r = 0 THEN 2 ELSE 0 END) | (CASE WHEN (r & 128) <> 0 THEN 128 ELSE 0 END);
            cycles := 4;
          END;
        ELSIF opcode = 29 THEN -- 0x1D ORA abs,X
          DECLARE base integer; eff integer; v integer; r integer; crossed boolean;
          BEGIN
            base := read_word(cpu, rpc);
            rpc := (rpc + 2) & 65535;
            eff := (base + rx) & 65535;
            crossed := ((base & 65280) <> (eff & 65280));
            v := read_byte(cpu, eff);
            r := (ra | v) & 255;
            ra := r;
            rp := (rp & ~(2|128)) | (CASE WHEN r = 0 THEN 2 ELSE 0 END) | (CASE WHEN (r & 128) <> 0 THEN 128 ELSE 0 END);
            cycles := 4 + CASE WHEN crossed THEN 1 ELSE 0 END;
          END;
        ELSIF opcode = 25 THEN -- 0x19 ORA abs,Y
          DECLARE base integer; eff integer; v integer; r integer; crossed boolean;
          BEGIN
            base := read_word(cpu, rpc);
            rpc := (rpc + 2) & 65535;
            eff := (base + ry) & 65535;
            crossed := ((base & 65280) <> (eff & 65280));
            v := read_byte(cpu, eff);
            r := (ra | v) & 255;
            ra := r;
            rp := (rp & ~(2|128)) | (CASE WHEN r = 0 THEN 2 ELSE 0 END) | (CASE WHEN (r & 128) <> 0 THEN 128 ELSE 0 END);
            cycles := 4 + CASE WHEN crossed THEN 1 ELSE 0 END;
          END;
        ELSIF opcode = 21 THEN -- 0x15 ORA zp,X
          DECLARE zpaddr integer; v integer; r integer;
          BEGIN
            zpaddr := (read_byte(cpu, rpc) + rx) & 255;
            rpc := (rpc + 1) & 65535;
            v := read_byte(cpu, zpaddr);
            r := (ra | v) & 255;
            ra := r;
            rp := (rp & ~(2|128)) | (CASE WHEN r = 0 THEN 2 ELSE 0 END) | (CASE WHEN (r & 128) <> 0 THEN 128 ELSE 0 END);
            cycles := 4;
          END;
        ELSIF opcode = 1 THEN -- 0x01 ORA (ind,X)
          DECLARE zp integer; lo integer; hi integer; eff integer; v integer; r integer;
          BEGIN
            zp := (read_byte(cpu, rpc) + rx) & 255;
            rpc := (rpc + 1) & 65535;
            lo := read_byte(cpu, zp);
            hi := read_byte(cpu, (zp + 1) & 255);
            eff := ((hi << 8) | lo) & 65535;
            v := read_byte(cpu, eff);
            r := (ra | v) & 255;
            ra := r;
            rp := (rp & ~(2|128)) | (CASE WHEN r = 0 THEN 2 ELSE 0 END) | (CASE WHEN (r & 128) <> 0 THEN 128 ELSE 0 END);
            cycles := 6;
          END;
        ELSIF opcode = 17 THEN -- 0x11 ORA (ind),Y
          DECLARE zp integer; lo integer; hi integer; base integer; eff integer; v integer; r integer; crossed boolean;
          BEGIN
            zp := read_byte(cpu, rpc) & 255;
            rpc := (rpc + 1) & 65535;
            lo := read_byte(cpu, zp);
            hi := read_byte(cpu, (zp + 1) & 255);
            base := ((hi << 8) | lo) & 65535;
            eff := (base + ry) & 65535;
            crossed := ((base & 65280) <> (eff & 65280));
            v := read_byte(cpu, eff);
            r := (ra | v) & 255;
            ra := r;
            rp := (rp & ~(2|128)) | (CASE WHEN r = 0 THEN 2 ELSE 0 END) | (CASE WHEN (r & 128) <> 0 THEN 128 ELSE 0 END);
            cycles := 5 + CASE WHEN crossed THEN 1 ELSE 0 END;
          END;
        ELSIF opcode = 73 THEN -- 0x49 EOR #imm
          DECLARE v integer; r integer;
          BEGIN
            v := read_byte(cpu, rpc);
            rpc := (rpc + 1) & 65535;
            r := (ra # v) & 255;
            ra := r;
            rp := (rp & ~(2|128)) | (CASE WHEN r = 0 THEN 2 ELSE 0 END) | (CASE WHEN (r & 128) <> 0 THEN 128 ELSE 0 END);
            cycles := 2;
          END;
        ELSIF opcode = 69 THEN -- 0x45 EOR zp
          DECLARE zpaddr integer; v integer; r integer;
          BEGIN
            zpaddr := read_byte(cpu, rpc) & 255;
            rpc := (rpc + 1) & 65535;
            v := read_byte(cpu, zpaddr);
            r := (ra # v) & 255;
            ra := r;
            rp := (rp & ~(2|128)) | (CASE WHEN r = 0 THEN 2 ELSE 0 END) | (CASE WHEN (r & 128) <> 0 THEN 128 ELSE 0 END);
            cycles := 3;
          END;
        ELSIF opcode = 77 THEN -- 0x4D EOR abs
          DECLARE addr integer; v integer; r integer;
          BEGIN
            addr := read_word(cpu, rpc);
            rpc := (rpc + 2) & 65535;
            v := read_byte(cpu, addr);
            r := (ra # v) & 255;
            ra := r;
            rp := (rp & ~(2|128)) | (CASE WHEN r = 0 THEN 2 ELSE 0 END) | (CASE WHEN (r & 128) <> 0 THEN 128 ELSE 0 END);
            cycles := 4;
          END;
        ELSIF opcode = 93 THEN -- 0x5D EOR abs,X
          DECLARE base integer; eff integer; v integer; r integer; crossed boolean;
          BEGIN
            base := read_word(cpu, rpc);
            rpc := (rpc + 2) & 65535;
            eff := (base + rx) & 65535;
            crossed := ((base & 65280) <> (eff & 65280));
            v := read_byte(cpu, eff);
            r := (ra # v) & 255;
            ra := r;
            rp := (rp & ~(2|128)) | (CASE WHEN r = 0 THEN 2 ELSE 0 END) | (CASE WHEN (r & 128) <> 0 THEN 128 ELSE 0 END);
            cycles := 4 + CASE WHEN crossed THEN 1 ELSE 0 END;
          END;
        ELSIF opcode = 89 THEN -- 0x59 EOR abs,Y
          DECLARE base integer; eff integer; v integer; r integer; crossed boolean;
          BEGIN
            base := read_word(cpu, rpc);
            rpc := (rpc + 2) & 65535;
            eff := (base + ry) & 65535;
            crossed := ((base & 65280) <> (eff & 65280));
            v := read_byte(cpu, eff);
            r := (ra # v) & 255;
            ra := r;
            rp := (rp & ~(2|128)) | (CASE WHEN r = 0 THEN 2 ELSE 0 END) | (CASE WHEN (r & 128) <> 0 THEN 128 ELSE 0 END);
            cycles := 4 + CASE WHEN crossed THEN 1 ELSE 0 END;
          END;
        ELSIF opcode = 85 THEN -- 0x55 EOR zp,X
          DECLARE zpaddr integer; v integer; r integer;
          BEGIN
            zpaddr := (read_byte(cpu, rpc) + rx) & 255;
            rpc := (rpc + 1) & 65535;
            v := read_byte(cpu, zpaddr);
            r := (ra # v) & 255;
            ra := r;
            rp := (rp & ~(2|128)) | (CASE WHEN r = 0 THEN 2 ELSE 0 END) | (CASE WHEN (r & 128) <> 0 THEN 128 ELSE 0 END);
            cycles := 4;
          END;
        ELSIF opcode = 65 THEN -- 0x41 EOR (ind,X)
          DECLARE zp integer; lo integer; hi integer; eff integer; v integer; r integer;
          BEGIN
            zp := (read_byte(cpu, rpc) + rx) & 255;
            rpc := (rpc + 1) & 65535;
            lo := read_byte(cpu, zp);
            hi := read_byte(cpu, (zp + 1) & 255);
            eff := ((hi << 8) | lo) & 65535;
            v := read_byte(cpu, eff);
            r := (ra # v) & 255;
            ra := r;
            rp := (rp & ~(2|128)) | (CASE WHEN r = 0 THEN 2 ELSE 0 END) | (CASE WHEN (r & 128) <> 0 THEN 128 ELSE 0 END);
            cycles := 6;
          END;
        ELSIF opcode = 81 THEN -- 0x51 EOR (ind),Y
          DECLARE zp integer; lo integer; hi integer; base integer; eff integer; v integer; r integer; crossed boolean;
          BEGIN
            zp := read_byte(cpu, rpc) & 255;
            rpc := (rpc + 1) & 65535;
            lo := read_byte(cpu, zp);
            hi := read_byte(cpu, (zp + 1) & 255);
            base := ((hi << 8) | lo) & 65535;
            eff := (base + ry) & 65535;
            crossed := ((base & 65280) <> (eff & 65280));
            v := read_byte(cpu, eff);
            r := (ra # v) & 255;
            ra := r;
            rp := (rp & ~(2|128)) | (CASE WHEN r = 0 THEN 2 ELSE 0 END) | (CASE WHEN (r & 128) <> 0 THEN 128 ELSE 0 END);
            cycles := 5 + CASE WHEN crossed THEN 1 ELSE 0 END;
          END;
        ELSIF opcode = 36 THEN -- 0x24 BIT zp
          DECLARE zpaddr integer; v integer; zr integer;
          BEGIN
            zpaddr := read_byte(cpu, rpc) & 255;
            rpc := (rpc + 1) & 65535;
            v := read_byte(cpu, zpaddr);
            zr := (ra & v) & 255;
            -- set Z from AND, N from bit7 of v, V from bit6 of v
            rp := (rp & ~(2|64|128)) | (CASE WHEN zr = 0 THEN 2 ELSE 0 END) | (CASE WHEN (v & 64) <> 0 THEN 64 ELSE 0 END) | (CASE WHEN (v & 128) <> 0 THEN 128 ELSE 0 END);
            cycles := 3;
          END;
        ELSIF opcode = 44 THEN -- 0x2C BIT abs
          DECLARE addr integer; v integer; zr integer;
          BEGIN
            addr := read_word(cpu, rpc);
            rpc := (rpc + 2) & 65535;
            v := read_byte(cpu, addr);
            zr := (ra & v) & 255;
            rp := (rp & ~(2|64|128)) | (CASE WHEN zr = 0 THEN 2 ELSE 0 END) | (CASE WHEN (v & 64) <> 0 THEN 64 ELSE 0 END) | (CASE WHEN (v & 128) <> 0 THEN 128 ELSE 0 END);
            cycles := 4;
          END;
        ELSIF opcode = 233 THEN -- 0xE9 SBC #imm
          DECLARE v integer; a8 integer; cin integer; diff integer; res integer; overflow boolean;
          BEGIN
            v := read_byte(cpu, rpc);
            rpc := (rpc + 1) & 65535;
            a8 := ra & 255;
            cin := CASE WHEN (rp & 1) <> 0 THEN 1 ELSE 0 END;
            diff := a8 - v - (1 - cin);
            res := diff & 255;
            -- C set if no borrow (diff >= 0), Z/N as usual, V if signed overflow
            rp := (rp & ~((1)|2|64|128)) | (CASE WHEN diff >= 0 THEN 1 ELSE 0 END) | (CASE WHEN res = 0 THEN 2 ELSE 0 END) | (CASE WHEN (((a8 # res) & (a8 # v) & 128) <> 0) THEN 64 ELSE 0 END) | (CASE WHEN (res & 128) <> 0 THEN 128 ELSE 0 END);
            ra := res;
            cycles := 2;
          END;
        ELSIF opcode = 229 THEN -- 0xE5 SBC zp
          DECLARE zpaddr integer; v integer; a8 integer; cin integer; diff integer; res integer;
          BEGIN
            zpaddr := read_byte(cpu, rpc) & 255;
            rpc := (rpc + 1) & 65535;
            v := read_byte(cpu, zpaddr);
            a8 := ra & 255;
            cin := CASE WHEN (rp & 1) <> 0 THEN 1 ELSE 0 END;
            diff := a8 - v - (1 - cin);
            res := diff & 255;
            rp := (rp & ~((1)|2|64|128)) | (CASE WHEN diff >= 0 THEN 1 ELSE 0 END) | (CASE WHEN res = 0 THEN 2 ELSE 0 END) | (CASE WHEN (((a8 # res) & (a8 # v) & 128) <> 0) THEN 64 ELSE 0 END) | (CASE WHEN (res & 128) <> 0 THEN 128 ELSE 0 END);
            ra := res;
            cycles := 3;
          END;
        ELSIF opcode = 245 THEN -- 0xF5 SBC zp,X
          DECLARE zpaddr integer; v integer; a8 integer; cin integer; diff integer; res integer;
          BEGIN
            zpaddr := (read_byte(cpu, rpc) + rx) & 255;
            rpc := (rpc + 1) & 65535;
            v := read_byte(cpu, zpaddr);
            a8 := ra & 255;
            cin := CASE WHEN (rp & 1) <> 0 THEN 1 ELSE 0 END;
            diff := a8 - v - (1 - cin);
            res := diff & 255;
            rp := (rp & ~((1)|2|64|128)) | (CASE WHEN diff >= 0 THEN 1 ELSE 0 END) | (CASE WHEN res = 0 THEN 2 ELSE 0 END) | (CASE WHEN (((a8 # res) & (a8 # v) & 128) <> 0) THEN 64 ELSE 0 END) | (CASE WHEN (res & 128) <> 0 THEN 128 ELSE 0 END);
            ra := res;
            cycles := 4;
          END;
        ELSIF opcode = 237 THEN -- 0xED SBC abs
          DECLARE addr integer; v integer; a8 integer; cin integer; diff integer; res integer;
          BEGIN
            addr := read_word(cpu, rpc);
            rpc := (rpc + 2) & 65535;
            v := read_byte(cpu, addr);
            a8 := ra & 255;
            cin := CASE WHEN (rp & 1) <> 0 THEN 1 ELSE 0 END;
            diff := a8 - v - (1 - cin);
            res := diff & 255;
            rp := (rp & ~((1)|2|64|128)) | (CASE WHEN diff >= 0 THEN 1 ELSE 0 END) | (CASE WHEN res = 0 THEN 2 ELSE 0 END) | (CASE WHEN (((a8 # res) & (a8 # v) & 128) <> 0) THEN 64 ELSE 0 END) | (CASE WHEN (res & 128) <> 0 THEN 128 ELSE 0 END);
            ra := res;
            cycles := 4;
          END;
        ELSIF opcode = 253 THEN -- 0xFD SBC abs,X
          DECLARE base integer; eff integer; v integer; a8 integer; cin integer; diff integer; res integer; crossed boolean;
          BEGIN
            base := read_word(cpu, rpc);
            rpc := (rpc + 2) & 65535;
            eff := (base + rx) & 65535;
            crossed := ((base & 65280) <> (eff & 65280));
            v := read_byte(cpu, eff);
            a8 := ra & 255;
            cin := CASE WHEN (rp & 1) <> 0 THEN 1 ELSE 0 END;
            diff := a8 - v - (1 - cin);
            res := diff & 255;
            rp := (rp & ~((1)|2|64|128)) | (CASE WHEN diff >= 0 THEN 1 ELSE 0 END) | (CASE WHEN res = 0 THEN 2 ELSE 0 END) | (CASE WHEN (((a8 # res) & (a8 # v) & 128) <> 0) THEN 64 ELSE 0 END) | (CASE WHEN (res & 128) <> 0 THEN 128 ELSE 0 END);
            ra := res;
            cycles := 4 + CASE WHEN crossed THEN 1 ELSE 0 END;
          END;
        ELSIF opcode = 249 THEN -- 0xF9 SBC abs,Y
          DECLARE base integer; eff integer; v integer; a8 integer; cin integer; diff integer; res integer; crossed boolean;
          BEGIN
            base := read_word(cpu, rpc);
            rpc := (rpc + 2) & 65535;
            eff := (base + ry) & 65535;
            crossed := ((base & 65280) <> (eff & 65280));
            v := read_byte(cpu, eff);
            a8 := ra & 255;
            cin := CASE WHEN (rp & 1) <> 0 THEN 1 ELSE 0 END;
            diff := a8 - v - (1 - cin);
            res := diff & 255;
            rp := (rp & ~((1)|2|64|128)) | (CASE WHEN diff >= 0 THEN 1 ELSE 0 END) | (CASE WHEN res = 0 THEN 2 ELSE 0 END) | (CASE WHEN (((a8 # res) & (a8 # v) & 128) <> 0) THEN 64 ELSE 0 END) | (CASE WHEN (res & 128) <> 0 THEN 128 ELSE 0 END);
            ra := res;
            cycles := 4 + CASE WHEN crossed THEN 1 ELSE 0 END;
          END;
        ELSIF opcode = 225 THEN -- 0xE1 SBC (ind,X)
          DECLARE zp integer; lo integer; hi integer; eff integer; v integer; a8 integer; cin integer; diff integer; res integer;
          BEGIN
            zp := (read_byte(cpu, rpc) + rx) & 255;
            rpc := (rpc + 1) & 65535;
            lo := read_byte(cpu, zp);
            hi := read_byte(cpu, (zp + 1) & 255);
            eff := ((hi << 8) | lo) & 65535;
            v := read_byte(cpu, eff);
            a8 := ra & 255;
            cin := CASE WHEN (rp & 1) <> 0 THEN 1 ELSE 0 END;
            diff := a8 - v - (1 - cin);
            res := diff & 255;
            rp := (rp & ~((1)|2|64|128)) | (CASE WHEN diff >= 0 THEN 1 ELSE 0 END) | (CASE WHEN res = 0 THEN 2 ELSE 0 END) | (CASE WHEN (((a8 # res) & (a8 # v) & 128) <> 0) THEN 64 ELSE 0 END) | (CASE WHEN (res & 128) <> 0 THEN 128 ELSE 0 END);
            ra := res;
            cycles := 6;
          END;
        ELSIF opcode = 241 THEN -- 0xF1 SBC (ind),Y
          DECLARE zp integer; lo integer; hi integer; base integer; eff integer; v integer; a8 integer; cin integer; diff integer; res integer; crossed boolean;
          BEGIN
            zp := read_byte(cpu, rpc) & 255;
            rpc := (rpc + 1) & 65535;
            lo := read_byte(cpu, zp);
            hi := read_byte(cpu, (zp + 1) & 255);
            base := ((hi << 8) | lo) & 65535;
            eff := (base + ry) & 65535;
            crossed := ((base & 65280) <> (eff & 65280));
            v := read_byte(cpu, eff);
            a8 := ra & 255;
            cin := CASE WHEN (rp & 1) <> 0 THEN 1 ELSE 0 END;
            diff := a8 - v - (1 - cin);
            res := diff & 255;
            rp := (rp & ~((1)|2|64|128)) | (CASE WHEN diff >= 0 THEN 1 ELSE 0 END) | (CASE WHEN res = 0 THEN 2 ELSE 0 END) | (CASE WHEN (((a8 # res) & (a8 # v) & 128) <> 0) THEN 64 ELSE 0 END) | (CASE WHEN (res & 128) <> 0 THEN 128 ELSE 0 END);
            ra := res;
            cycles := 5 + CASE WHEN crossed THEN 1 ELSE 0 END;
          END;
        ELSIF opcode = 201 THEN -- 0xC9 CMP #imm
          DECLARE v integer; t integer; a8 integer;
          BEGIN
            v := read_byte(cpu, rpc);
            rpc := (rpc + 1) & 65535;
            a8 := ra & 255;
            t := (a8 - v) & 255;
            rp := (rp & ~((1)|2|128)) | (CASE WHEN a8 >= v THEN 1 ELSE 0 END) | (CASE WHEN t = 0 THEN 2 ELSE 0 END) | (CASE WHEN (t & 128) <> 0 THEN 128 ELSE 0 END);
            cycles := 2;
          END;
        ELSIF opcode = 197 THEN -- 0xC5 CMP zp
          DECLARE zpaddr integer; v integer; t integer; a8 integer;
          BEGIN
            zpaddr := read_byte(cpu, rpc) & 255;
            rpc := (rpc + 1) & 65535;
            v := read_byte(cpu, zpaddr);
            a8 := ra & 255;
            t := (a8 - v) & 255;
            rp := (rp & ~((1)|2|128)) | (CASE WHEN a8 >= v THEN 1 ELSE 0 END) | (CASE WHEN t = 0 THEN 2 ELSE 0 END) | (CASE WHEN (t & 128) <> 0 THEN 128 ELSE 0 END);
            cycles := 3;
          END;
        ELSIF opcode = 205 THEN -- 0xCD CMP abs
          DECLARE addr integer; v integer; t integer; a8 integer;
          BEGIN
            addr := read_word(cpu, rpc);
            rpc := (rpc + 2) & 65535;
            v := read_byte(cpu, addr);
            a8 := ra & 255;
            t := (a8 - v) & 255;
            rp := (rp & ~((1)|2|128)) | (CASE WHEN a8 >= v THEN 1 ELSE 0 END) | (CASE WHEN t = 0 THEN 2 ELSE 0 END) | (CASE WHEN (t & 128) <> 0 THEN 128 ELSE 0 END);
            cycles := 4;
          END;
        ELSIF opcode = 213 THEN -- 0xD5 CMP zp,X
          DECLARE zpaddr integer; v integer; t integer; a8 integer;
          BEGIN
            zpaddr := (read_byte(cpu, rpc) + rx) & 255;
            rpc := (rpc + 1) & 65535;
            v := read_byte(cpu, zpaddr);
            a8 := ra & 255;
            t := (a8 - v) & 255;
            rp := (rp & ~((1)|2|128)) | (CASE WHEN a8 >= v THEN 1 ELSE 0 END) | (CASE WHEN t = 0 THEN 2 ELSE 0 END) | (CASE WHEN (t & 128) <> 0 THEN 128 ELSE 0 END);
            cycles := 4;
          END;
        ELSIF opcode = 221 THEN -- 0xDD CMP abs,X
          DECLARE base integer; eff integer; v integer; t integer; a8 integer; crossed boolean;
          BEGIN
            base := read_word(cpu, rpc);
            rpc := (rpc + 2) & 65535;
            eff := (base + rx) & 65535;
            crossed := ((base & 65280) <> (eff & 65280));
            v := read_byte(cpu, eff);
            a8 := ra & 255;
            t := (a8 - v) & 255;
            rp := (rp & ~((1)|2|128)) | (CASE WHEN a8 >= v THEN 1 ELSE 0 END) | (CASE WHEN t = 0 THEN 2 ELSE 0 END) | (CASE WHEN (t & 128) <> 0 THEN 128 ELSE 0 END);
            cycles := 4 + CASE WHEN crossed THEN 1 ELSE 0 END;
          END;
        ELSIF opcode = 217 THEN -- 0xD9 CMP abs,Y
          DECLARE base integer; eff integer; v integer; t integer; a8 integer; crossed boolean;
          BEGIN
            base := read_word(cpu, rpc);
            rpc := (rpc + 2) & 65535;
            eff := (base + ry) & 65535;
            crossed := ((base & 65280) <> (eff & 65280));
            v := read_byte(cpu, eff);
            a8 := ra & 255;
            t := (a8 - v) & 255;
            rp := (rp & ~((1)|2|128)) | (CASE WHEN a8 >= v THEN 1 ELSE 0 END) | (CASE WHEN t = 0 THEN 2 ELSE 0 END) | (CASE WHEN (t & 128) <> 0 THEN 128 ELSE 0 END);
            cycles := 4 + CASE WHEN crossed THEN 1 ELSE 0 END;
          END;
        ELSIF opcode = 193 THEN -- 0xC1 CMP (ind,X)
          DECLARE zp integer; lo integer; hi integer; eff integer; v integer; t integer; a8 integer;
          BEGIN
            zp := (read_byte(cpu, rpc) + rx) & 255;
            rpc := (rpc + 1) & 65535;
            lo := read_byte(cpu, zp);
            hi := read_byte(cpu, (zp + 1) & 255);
            eff := ((hi << 8) | lo) & 65535;
            v := read_byte(cpu, eff);
            a8 := ra & 255;
            t := (a8 - v) & 255;
            rp := (rp & ~((1)|2|128)) | (CASE WHEN a8 >= v THEN 1 ELSE 0 END) | (CASE WHEN t = 0 THEN 2 ELSE 0 END) | (CASE WHEN (t & 128) <> 0 THEN 128 ELSE 0 END);
            cycles := 6;
          END;
        ELSIF opcode = 209 THEN -- 0xD1 CMP (ind),Y
          DECLARE zp integer; lo integer; hi integer; base integer; eff integer; v integer; t integer; a8 integer; crossed boolean;
          BEGIN
            zp := read_byte(cpu, rpc) & 255;
            rpc := (rpc + 1) & 65535;
            lo := read_byte(cpu, zp);
            hi := read_byte(cpu, (zp + 1) & 255);
            base := ((hi << 8) | lo) & 65535;
            eff := (base + ry) & 65535;
            crossed := ((base & 65280) <> (eff & 65280));
            v := read_byte(cpu, eff);
            a8 := ra & 255;
            t := (a8 - v) & 255;
            rp := (rp & ~((1)|2|128)) | (CASE WHEN a8 >= v THEN 1 ELSE 0 END) | (CASE WHEN t = 0 THEN 2 ELSE 0 END) | (CASE WHEN (t & 128) <> 0 THEN 128 ELSE 0 END);
            cycles := 5 + CASE WHEN crossed THEN 1 ELSE 0 END;
          END;
        ELSIF opcode = 228 THEN -- 0xE4 CPX zp
          DECLARE zpaddr integer; v integer; t integer; x8 integer;
          BEGIN
            zpaddr := read_byte(cpu, rpc) & 255;
            rpc := (rpc + 1) & 65535;
            v := read_byte(cpu, zpaddr);
            x8 := rx & 255;
            t := (x8 - v) & 255;
            rp := (rp & ~((1)|2|128)) | (CASE WHEN x8 >= v THEN 1 ELSE 0 END) | (CASE WHEN t = 0 THEN 2 ELSE 0 END) | (CASE WHEN (t & 128) <> 0 THEN 128 ELSE 0 END);
            cycles := 3;
          END;
        ELSIF opcode = 236 THEN -- 0xEC CPX abs
          DECLARE addr integer; v integer; t integer; x8 integer;
          BEGIN
            addr := read_word(cpu, rpc);
            rpc := (rpc + 2) & 65535;
            v := read_byte(cpu, addr);
            x8 := rx & 255;
            t := (x8 - v) & 255;
            rp := (rp & ~((1)|2|128)) | (CASE WHEN x8 >= v THEN 1 ELSE 0 END) | (CASE WHEN t = 0 THEN 2 ELSE 0 END) | (CASE WHEN (t & 128) <> 0 THEN 128 ELSE 0 END);
            cycles := 4;
          END;
        ELSIF opcode = 196 THEN -- 0xC4 CPY zp
          DECLARE zpaddr integer; v integer; t integer; y8 integer;
          BEGIN
            zpaddr := read_byte(cpu, rpc) & 255;
            rpc := (rpc + 1) & 65535;
            v := read_byte(cpu, zpaddr);
            y8 := ry & 255;
            t := (y8 - v) & 255;
            rp := (rp & ~((1)|2|128)) | (CASE WHEN y8 >= v THEN 1 ELSE 0 END) | (CASE WHEN t = 0 THEN 2 ELSE 0 END) | (CASE WHEN (t & 128) <> 0 THEN 128 ELSE 0 END);
            cycles := 3;
          END;
        ELSIF opcode = 204 THEN -- 0xCC CPY abs
          DECLARE addr integer; v integer; t integer; y8 integer;
          BEGIN
            addr := read_word(cpu, rpc);
            rpc := (rpc + 2) & 65535;
            v := read_byte(cpu, addr);
            y8 := ry & 255;
            t := (y8 - v) & 255;
            rp := (rp & ~((1)|2|128)) | (CASE WHEN y8 >= v THEN 1 ELSE 0 END) | (CASE WHEN t = 0 THEN 2 ELSE 0 END) | (CASE WHEN (t & 128) <> 0 THEN 128 ELSE 0 END);
            cycles := 4;
          END;
        ELSIF opcode = 224 THEN -- 0xE0 CPX #imm
          DECLARE v integer; t integer; x8 integer;
          BEGIN
            v := read_byte(cpu, rpc);
            rpc := (rpc + 1) & 65535;
            x8 := rx & 255;
            t := (x8 - v) & 255;
            rp := (rp & ~((1)|2|128)) | (CASE WHEN x8 >= v THEN 1 ELSE 0 END) | (CASE WHEN t = 0 THEN 2 ELSE 0 END) | (CASE WHEN (t & 128) <> 0 THEN 128 ELSE 0 END);
            cycles := 2;
          END;
        ELSIF opcode = 192 THEN -- 0xC0 CPY #imm
          DECLARE v integer; t integer; y8 integer;
          BEGIN
            v := read_byte(cpu, rpc);
            rpc := (rpc + 1) & 65535;
            y8 := ry & 255;
            t := (y8 - v) & 255;
            rp := (rp & ~((1)|2|128)) | (CASE WHEN y8 >= v THEN 1 ELSE 0 END) | (CASE WHEN t = 0 THEN 2 ELSE 0 END) | (CASE WHEN (t & 128) <> 0 THEN 128 ELSE 0 END);
            cycles := 2;
          END;
        ELSIF opcode = 161 THEN -- 0xA1 LDA (indirect,X)
          DECLARE zp integer; ptr integer; lo integer; hi integer; eff integer; v integer;
          BEGIN
            zp := (read_byte(cpu, rpc) + rx) & 255;
            rpc := (rpc + 1) & 65535;
            lo := read_byte(cpu, zp);
            hi := read_byte(cpu, (zp + 1) & 255);
            eff := ((hi << 8) | lo) & 65535;
            v := read_byte(cpu, eff);
            ra := v & 255;
            rp := (rp & ~(2|128)) | (CASE WHEN ra = 0 THEN 2 ELSE 0 END) | (CASE WHEN (ra & 128) <> 0 THEN 128 ELSE 0 END);
            cycles := 6;
          END;
        ELSIF opcode = 177 THEN -- 0xB1 LDA (indirect),Y
          DECLARE zp integer; lo integer; hi integer; base integer; eff integer; v integer; crossed boolean;
          BEGIN
            zp := read_byte(cpu, rpc) & 255;
            rpc := (rpc + 1) & 65535;
            lo := read_byte(cpu, zp);
            hi := read_byte(cpu, (zp + 1) & 255);
            base := ((hi << 8) | lo) & 65535;
            eff := (base + ry) & 65535;
            crossed := ((base & 65280) <> (eff & 65280));
            v := read_byte(cpu, eff);
            ra := v & 255;
            rp := (rp & ~(2|128)) | (CASE WHEN ra = 0 THEN 2 ELSE 0 END) | (CASE WHEN (ra & 128) <> 0 THEN 128 ELSE 0 END);
            cycles := 5 + CASE WHEN crossed THEN 1 ELSE 0 END;
          END;
        ELSIF opcode = 32 THEN -- 0x20 JSR abs
          DECLARE target integer; retaddr integer; sph integer; spl integer;
          BEGIN
            target := read_word(cpu, rpc);
            rpc := (rpc + 2) & 65535;
            retaddr := (rpc - 1) & 65535;
            sph := (retaddr >> 8) & 255;
            spl := retaddr & 255;
            -- push high then low
            PERFORM load_byte(cpu, 256 + rsp, sph);
            rsp := (rsp - 1) & 255;
            PERFORM load_byte(cpu, 256 + rsp, spl);
            rsp := (rsp - 1) & 255;
            rpc := target;
            cycles := 6;
          END;
        ELSIF opcode = 96 THEN -- 0x60 RTS
          DECLARE lo integer; hi integer; addr integer;
          BEGIN
            rsp := (rsp + 1) & 255;
            lo := read_byte(cpu, 256 + rsp);
            rsp := (rsp + 1) & 255;
            hi := read_byte(cpu, 256 + rsp);
            addr := (((hi << 8) | lo) + 1) & 65535;
            rpc := addr;
            cycles := 6;
          END;
        ELSIF opcode = 76 THEN -- 0x4C JMP abs
          DECLARE target integer;
          BEGIN
            target := read_word(cpu, rpc);
            rpc := target;
            cycles := 3;
          END;
        ELSIF opcode = 108 THEN -- 0x6C JMP indirect with page-boundary bug
          DECLARE ptr integer; lo integer; hi integer; hibugaddr integer; target integer;
          BEGIN
            ptr := read_word(cpu, rpc);
            -- emulate NMOS page-boundary bug: high byte does not cross page
            lo := read_byte(cpu, ptr);
            hibugaddr := (ptr & 65280) | ((ptr + 1) & 255);
            hi := read_byte(cpu, hibugaddr);
            target := ((hi << 8) | lo) & 65535;
            rpc := target;
            cycles := 5;
          END;
        ELSIF opcode = 0 THEN -- 0x00 BRK
          DECLARE ret integer; sph integer; spl integer; status_to_push integer; vec integer;
          BEGIN
            -- BRK pushes PC+2 and SR with B set; sets I; jumps to IRQ/BRK vector at $FFFE
            ret := (rpc + 1) & 65535; -- rpc is PC+1 now; want PC+2
            sph := (ret >> 8) & 255;
            spl := ret & 255;
            -- push return address high, then low, then status (B|UNUSED set)
            PERFORM load_byte(cpu, 256 + rsp, sph);
            rsp := (rsp - 1) & 255;
            PERFORM load_byte(cpu, 256 + rsp, spl);
            rsp := (rsp - 1) & 255;
            status_to_push := (rp | 16 | 32) & 255; -- BREAK(0x10) and UNUSED(0x20)
            PERFORM load_byte(cpu, 256 + rsp, status_to_push);
            rsp := (rsp - 1) & 255;
            -- set I flag in current status
            rp := (rp | 4) & 255;
            -- fetch vector
            vec := read_word(cpu, 65534);
            rpc := vec & 65535;
            cycles := 7;
          END;
        ELSIF opcode = 64 THEN -- 0x40 RTI
          DECLARE st integer; lo integer; hi integer;
          BEGIN
            -- Pull SR (B ignored) then PC
            rsp := (rsp + 1) & 255;
            st := read_byte(cpu, 256 + rsp);
            -- mask out BREAK, ensure UNUSED bit stays set
            st := (st & (~16) & 255) | 32;
            rp := st & 255;
            rsp := (rsp + 1) & 255;
            lo := read_byte(cpu, 256 + rsp);
            rsp := (rsp + 1) & 255;
            hi := read_byte(cpu, 256 + rsp);
            rpc := ((hi << 8) | lo) & 65535;
            cycles := 6;
          END;
        ELSE
          RAISE EXCEPTION 'Unknown opcode';
        END IF;

        UPDATE cpu_state SET a=ra, x=rx, y=ry, sp=rsp, p=rp, pc=(rpc & 65535) WHERE cpu_id = cpu;
        RETURN cycles;
      END; $$ LANGUAGE plpgsql;
    `);
    }
 
     // Ensure a cpu_state row exists for this cpuId
     await this.db.query("SELECT reset($1)", [this.cpuId]);
   }


  async getState(): Promise<CPUState> {
    await this.ready;
    const ret = await this.db.query<CPUState>(
      "SELECT a, x, y, sp, p, pc FROM get_state($1)",
      [this.cpuId]
    );
    if (ret.rows.length === 0) return { a: 0, x: 0, y: 0, sp: 0xfd, p: 0x24, pc: 0 } as CPUState;
    const row = ret.rows[0] as CPUState;
    // Ensure PC is properly masked to 16 bits
    row.pc = row.pc & 0xffff;
    return row;
  }

  async reset(): Promise<void> {
    await this.ready;
    await this.db.query("SELECT reset($1)", [this.cpuId]);
  }

  async step(trace?: boolean): Promise<number> {
    await this.ready;
    if (trace) {
      // Emit a trace line before executing the instruction
      const { disassemble } = await import("../utils/disasm.ts");
      const state = await this.getState();
      const [asm/*, len*/] = await disassemble(this, state.pc);
      const pcHex = state.pc.toString(16).padStart(4, "0").toUpperCase();
      console.log(`${pcHex}: ${asm}`);
    }
    const ret = await this.db.query<{ step: number }>("SELECT step($1, $2) AS step", [this.cpuId, !!trace]);
    const row = ret.rows[0] ?? { step: 0 };
    return row.step | 0;
  }

  async loadByte(address: number, value: number): Promise<void> {
    await this.ready;
    await this.db.query("SELECT load_byte($1, $2, $3)", [this.cpuId, address, value]);
  }

  async loadWord(address: number, value: number): Promise<void> {
    await this.ready;
    await this.db.query("SELECT load_word($1, $2, $3)", [this.cpuId, address, value]);
  }

  async readByte(address: number): Promise<number> {
    await this.ready;
    const ret = await this.db.query<{ read_byte: number }>("SELECT read_byte($1, $2) AS read_byte", [this.cpuId, address]);
    const row = ret.rows[0] ?? { read_byte: 0 };
    return row.read_byte | 0;
  }

  async readWord(address: number): Promise<number> {
    await this.ready;
    const ret = await this.db.query<{ read_word: number }>("SELECT read_word($1, $2) AS read_word", [this.cpuId, address]);
    const row = ret.rows[0] ?? { read_word: 0 };
    return row.read_word | 0;
  }

  async setProgramCounter(address: number): Promise<void> {
    await this.ready;
    await this.db.query("SELECT set_program_counter($1, $2)", [this.cpuId, address]);
  }

  async setAccumulator(value: number): Promise<void> {
    await this.ready;
    await this.db.query("SELECT set_accumulator($1, $2)", [this.cpuId, value]);
  }

  async setXRegister(value: number): Promise<void> {
    await this.ready;
    await this.db.query("SELECT set_x_register($1, $2)", [this.cpuId, value]);
  }

  async setYRegister(value: number): Promise<void> {
    await this.ready;
    await this.db.query("SELECT set_y_register($1, $2)", [this.cpuId, value]);
  }

  async setStackPointer(value: number): Promise<void> {
    await this.ready;
    await this.db.query("SELECT set_stack_pointer($1, $2)", [this.cpuId, value]);
  }

  async setStatusRegister(value: number): Promise<void> {
    await this.ready;
    await this.db.query("SELECT set_status_register($1, $2)", [this.cpuId, value]);
  }

  async setStatusFlag(mask: number): Promise<void> {
    await this.ready;
    await this.db.query("SELECT set_status_flag($1, $2)", [this.cpuId, mask]);
  }

  async clearStatusFlag(mask: number): Promise<void> {
    await this.ready;
    await this.db.query("SELECT clear_status_flag($1, $2)", [this.cpuId, mask]);
  }
}
