import { describe, expect, it } from "vitest";
import { SAVE_FEEL } from "../data/flow-feel";
import { decodeDrawing, encodeDrawing, newSave, parseSave, SaveStore, serializeSave, SAVE_KEY, SETTINGS_KEY, simplifyStroke, type SaveData, type StorageLike } from "./save";

class MemoryStorage implements StorageLike {
  readonly data = new Map<string, string>();
  getItem(key: string): string | null {
    return this.data.get(key) ?? null;
  }
  setItem(key: string, value: string): void {
    this.data.set(key, value);
  }
  removeItem(key: string): void {
    this.data.delete(key);
  }
}

class ThrowingStorage implements StorageLike {
  getItem(): string | null {
    throw new Error("bị chặn");
  }
  setItem(): void {
    throw new Error("đầy");
  }
  removeItem(): void {
    throw new Error("bị chặn");
  }
}

const sample: SaveData = {
  version: 1,
  seenIntro: true,
  freed: ["r1", "r2"],
  playSeconds: 812.5,
  drawing: [10, 10, 40, 10, -1, -1, 100, 100, 120, 130],
  finished: false,
};

describe("lưu tiến trình: đọc ghi", () => {
  it("ghi rồi đọc ra y hệt", () => {
    expect(parseSave(serializeSave(sample))).toEqual(sample);
    const store = new SaveStore(new MemoryStorage());
    expect(store.load()).toBeNull();
    store.write(sample);
    expect(store.load()).toEqual(sample);
    expect(store.exists()).toBe(true);
    store.clear();
    expect(store.load()).toBeNull();
  });

  it("bản lưu mới (chưa chơi) đọc ra được", () => {
    expect(parseSave(serializeSave(newSave()))).toEqual(newSave());
  });

  it("JSON hỏng, sai version, thiếu trường, sai kiểu → null", () => {
    expect(parseSave("{không phải json")).toBeNull();
    expect(parseSave("")).toBeNull();
    expect(parseSave("null")).toBeNull();
    expect(parseSave("[1,2]")).toBeNull();
    expect(parseSave(JSON.stringify({ ...sample, version: 2 }))).toBeNull();
    const { seenIntro: _a, ...noSeen } = sample;
    expect(parseSave(JSON.stringify(noSeen))).toBeNull();
    const { freed: _b, ...noFreed } = sample;
    expect(parseSave(JSON.stringify(noFreed))).toBeNull();
    expect(parseSave(JSON.stringify({ ...sample, playSeconds: "nhiều" }))).toBeNull();
    expect(parseSave(JSON.stringify({ ...sample, playSeconds: -3 }))).toBeNull();
    expect(parseSave(JSON.stringify({ ...sample, freed: ["r1", "r9"] }))).toBeNull();
    expect(parseSave(JSON.stringify({ ...sample, freed: ["r1", "r1"] }))).toBeNull();
    expect(parseSave(JSON.stringify({ ...sample, drawing: [1, 2, 3] }))).toBeNull();
    expect(parseSave(JSON.stringify({ ...sample, drawing: [1, 2.5] }))).toBeNull();
    expect(parseSave(JSON.stringify({ ...sample, finished: "có" }))).toBeNull();
  });

  it("bản lưu hỏng trong kho thì load trả về null và không bị xóa", () => {
    const storage = new MemoryStorage();
    storage.setItem(SAVE_KEY, "{hỏng");
    const store = new SaveStore(storage);
    expect(store.load()).toBeNull();
    expect(storage.getItem(SAVE_KEY)).toBe("{hỏng");
  });

  it("Storage ném lỗi thì không ném ra ngoài", () => {
    const store = new SaveStore(new ThrowingStorage());
    expect(() => store.load()).not.toThrow();
    expect(() => store.write(sample)).not.toThrow();
    expect(() => store.clear()).not.toThrow();
    expect(() => store.touchPlaySeconds(10)).not.toThrow();
    expect(() => store.saveSettings({ muted: true })).not.toThrow();
    expect(store.load()).toBeNull();
    expect(store.loadSettings()).toEqual({ muted: false });
  });

  it("không có Storage (null) thì chơi không lưu, không lỗi", () => {
    const store = new SaveStore(null);
    store.write(sample);
    expect(store.load()).toBeNull();
    expect(store.exists()).toBe(false);
  });

  it("phiên debug không đọc cũng không ghi", () => {
    const storage = new MemoryStorage();
    new SaveStore(storage).write(sample);
    let debug = true;
    const store = new SaveStore(storage, () => debug);
    expect(store.load()).toBeNull();
    store.write({ ...sample, playSeconds: 1 });
    store.clear();
    debug = false;
    expect(store.load()).toEqual(sample);
  });

  it("touchPlaySeconds chỉ cập nhật khi đã có bản lưu và không bao giờ làm giảm", () => {
    const storage = new MemoryStorage();
    const store = new SaveStore(storage);
    store.touchPlaySeconds(50);
    expect(storage.getItem(SAVE_KEY)).toBeNull();
    store.write(sample);
    store.touchPlaySeconds(900);
    expect(store.load()?.playSeconds).toBe(900);
    store.touchPlaySeconds(100);
    expect(store.load()?.playSeconds).toBe(900);
    expect(store.load()?.freed).toEqual(sample.freed);
  });

  it("cài đặt: muted được lưu và đọc lại; hỏng thì về mặc định", () => {
    const storage = new MemoryStorage();
    const store = new SaveStore(storage);
    expect(store.loadSettings()).toEqual({ muted: false });
    store.saveSettings({ muted: true });
    expect(store.loadSettings()).toEqual({ muted: true });
    storage.setItem(SETTINGS_KEY, "linh tinh");
    expect(store.loadSettings()).toEqual({ muted: false });
  });
});

describe("lưu tranh của r4", () => {
  const arena = { x: 120, y: 100, w: 400, h: 160 };

  /** Một nét ngoằn ngoèo dày điểm. */
  const wiggle = (count: number, y0: number): { x: number; y: number }[] =>
    Array.from({ length: count }, (_, i) => ({ x: 130 + (i * 380) / count, y: arena.y + y0 + Math.sin(i / 3) * 40 + (i % 2) * 3 }));

  it("giản lược ≤ 3000 số, giữ điểm đầu, điểm cuối và dấu nhấc bút", () => {
    const strokes = [wiggle(2500, 40), wiggle(2500, 100), wiggle(2500, 60)];
    const numbers = encodeDrawing(strokes, arena);
    expect(numbers.length).toBeLessThanOrEqual(SAVE_FEEL.drawingMaxNumbers);
    expect(numbers.length % 2).toBe(0);

    const decoded = decodeDrawing(numbers);
    expect(decoded).toHaveLength(3);
    strokes.forEach((stroke, i) => {
      const first = stroke[0]!;
      const last = stroke[stroke.length - 1]!;
      const out = decoded[i]!;
      expect(out[0]).toEqual({ x: Math.round(first.x - arena.x), y: Math.round(first.y - arena.y) });
      expect(out[out.length - 1]).toEqual({ x: Math.round(last.x - arena.x), y: Math.round(last.y - arena.y) });
    });
    // -1, -1 đúng giữa các nét (2 nét → 2 dấu... 3 nét → 2 dấu).
    let lifts = 0;
    for (let i = 0; i < numbers.length; i += 2) if (numbers[i] === -1 && numbers[i + 1] === -1) lifts++;
    expect(lifts).toBe(2);
  });

  it("toạ độ là số nguyên trong khung 400×160", () => {
    const numbers = encodeDrawing([wiggle(300, 20)], arena);
    for (let i = 0; i < numbers.length; i += 2) {
      expect(Number.isInteger(numbers[i])).toBe(true);
      expect(numbers[i]).toBeGreaterThanOrEqual(0);
      expect(numbers[i]).toBeLessThanOrEqual(400);
      expect(numbers[i + 1]).toBeGreaterThanOrEqual(0);
      expect(numbers[i + 1]).toBeLessThanOrEqual(160);
    }
  });

  it("không có nét thì mảng rỗng; nét một đường thẳng chỉ còn hai đầu", () => {
    expect(encodeDrawing([], arena)).toEqual([]);
    const line = Array.from({ length: 50 }, (_, i) => ({ x: 150 + i * 4, y: 150 }));
    expect(simplifyStroke(line, 1.5)).toEqual([line[0], line[49]]);
  });

  it("encode rồi decode (cộng origin) về gần nét gốc", () => {
    const stroke = wiggle(120, 50);
    const decoded = decodeDrawing(encodeDrawing([stroke], arena, 0.5), { x: arena.x, y: arena.y })[0]!;
    // Mọi điểm gốc nằm gần nét đã giản lược (sai số nhỏ).
    for (const p of stroke) {
      let best = Infinity;
      for (let i = 1; i < decoded.length; i++) {
        const a = decoded[i - 1]!;
        const b = decoded[i]!;
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const len = dx * dx + dy * dy || 1;
        const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / len));
        best = Math.min(best, Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy)));
      }
      expect(best).toBeLessThan(2.5);
    }
  });
});
