import { describe, expect, it } from "vitest";
import { greyscaleSprite } from "../core/sprites";
import { CLOCKWORK } from "./mechanisms/clockwork";
import { RESIDENTS } from "./residents";
import { DISTRACTION_FEEL } from "./sketch-feel";
import { SPRITES } from "./sprites";
import { TOWN_NPCS } from "./town";

const IDS = Object.keys(SPRITES);
const table = SPRITES as Record<
  string,
  {
    palette: Record<string, string>;
    rows: readonly string[];
    scale?: number;
    frames?: readonly (readonly string[])[];
    holds?: readonly number[];
    frameSeconds?: number;
  }
>;

/** width, height, scale của khung dữ liệu. Khóa chỗ gọi và va chạm. */
const FRAME: Record<string, readonly [number, number, number]> = {
  gear: [9, 9, 2],
  "gear-cracked": [9, 9, 2],
  distraction: [7, 7, 2],
  pencil: [10, 9, 2],
  r4: [8, 8, 2],
  "r4-pencil": [9, 8, 2],
  "keeper-down": [8, 12, 3],
  "keeper-up": [8, 12, 3],
  "keeper-left": [8, 12, 3],
  "keeper-right": [8, 12, 3],
  r1: [8, 12, 2],
  r2: [8, 12, 2],
  r3: [8, 12, 2],
  "r2-up": [8, 12, 2],
  boss: [8, 12, 2],
  screw: [5, 5, 2],
  "clock-face": [9, 9, 2],
  cover: [11, 5, 2],
  cog: [7, 7, 2],
  spring: [7, 4, 2],
  balance: [7, 7, 2],
  hand: [8, 8, 2],
  ring: [9, 8, 2],
  crown: [7, 7, 2],
  weight: [7, 7, 2],
  rod: [5, 10, 2],
};

describe("sprite placeholder", () => {
  it("mọi sprite có hình chữ nhật đều, mọi ký tự có trong bảng màu, màu hợp lệ", () => {
    for (const id of IDS) {
      const sprite = table[id];
      expect(sprite, id).toBeDefined();
      const width = sprite?.rows[0]?.length ?? 0;
      expect(width, `${id}: rỗng`).toBeGreaterThan(0);
      const pictures = [sprite?.rows ?? [], ...(sprite?.frames ?? [])];
      for (const picture of pictures) {
        expect(picture.length, `${id}: lệch chiều cao`).toBe(sprite?.rows.length);
        for (const row of picture) {
          expect(row.length, `${id}: hàng lệch bề ngang`).toBe(width);
          for (const ch of row) if (ch !== ".") expect(Object.keys(sprite?.palette ?? {}), `${id}: ký tự "${ch}" thiếu màu`).toContain(ch);
        }
      }
      for (const color of Object.values(sprite?.palette ?? {})) expect(color, id).toMatch(/^#[0-9a-f]{6}$/i);
    }
  });

  it("bánh răng thường và bánh răng nứt cùng kích thước (đổi sprite khi thua không nhảy hình)", () => {
    const a = table.gear;
    const b = table["gear-cracked"];
    expect([a?.rows.length, a?.rows[0]?.length, a?.scale]).toEqual([b?.rows.length, b?.rows[0]?.length, b?.scale]);
  });

  it("bốn hướng của người thợ cùng kích thước", () => {
    const sizes = ["keeper-up", "keeper-down", "keeper-left", "keeper-right"].map((id) => [table[id]?.rows.length, table[id]?.rows[0]?.length, table[id]?.scale]);
    for (const size of sizes) expect(size).toEqual(sizes[0]);
  });

  it("mọi sprite mà dữ liệu tham chiếu đều có", () => {
    const need = new Set<string>(["gear", "gear-cracked", "pencil", "r4-pencil", "r2-up", "boss", "distraction", DISTRACTION_FEEL.sprite]);
    for (const dir of ["up", "down", "left", "right"]) need.add(`keeper-${dir}`);
    for (const npc of TOWN_NPCS) need.add(npc.freedSprite);
    for (const resident of RESIDENTS) {
      for (const part of resident.mechanism.parts) need.add(part.sprite);
    }
    for (const part of CLOCKWORK.parts) need.add(part.sprite);
    for (const id of need) expect(IDS, id).toContain(id);
  });

  it("sprite xám của cư dân chưa giải thoát được dựng từ sprite có màu (cùng hình)", () => {
    for (const npc of TOWN_NPCS) {
      const colored = table[npc.freedSprite];
      expect(colored, npc.freedSprite).toBeDefined();
      const grey = greyscaleSprite(colored as never);
      expect(grey.rows).toEqual(colored?.rows);
      for (const color of Object.values(grey.palette)) {
        const [r, g, b] = [color.slice(1, 3), color.slice(3, 5), color.slice(5, 7)];
        expect(r === g && g === b, `${npc.id} ${color}`).toBe(true);
      }
    }
  });

  it("giữ nguyên kích thước khung các sprite cũ", () => {
    for (const [id, [width, height, scale]] of Object.entries(FRAME)) {
      const sprite = table[id];
      expect(sprite?.rows[0]?.length, id).toBe(width);
      expect(sprite?.rows.length, id).toBe(height);
      expect(sprite?.scale, id).toBe(scale);
    }
  });

  it("avatar hướng dẫn 38×38, phóng 2", () => {
    for (const id of ["guide-happy", "guide-cheer", "guide-surprised", "guide-comfort"]) {
      const sprite = table[id];
      expect(sprite?.rows.length, id).toBe(38);
      expect(sprite?.rows[0]?.length, id).toBe(38);
      expect(sprite?.scale, id).toBe(2);
      expect(sprite?.frames, id).toBeUndefined();
    }
  });

  it("nháy mắt và lóe sáng nằm trong sprite; bánh răng nứt đứng một khung", () => {
    expect(table["gear-cracked"]?.frames).toBeUndefined();
    for (const id of ["gear", "keeper-down", "keeper-left", "r1", "r4", "cog", "balance"]) {
      expect(table[id]?.frames?.length ?? 0, id).toBeGreaterThan(0);
    }
  });

  it("các bộ phận máy không còn dùng chung mọi thứ: kim, vòng, núm, cân, cần có hình riêng", () => {
    const used = new Set<string>();
    for (const resident of RESIDENTS) for (const part of resident.mechanism.parts) used.add(part.sprite);
    for (const id of ["hand", "ring", "crown", "weight", "rod"]) expect([...used], id).toContain(id);
  });
});