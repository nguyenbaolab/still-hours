import { describe, expect, it } from "vitest";
import { TICK_RATE } from "../core/config";
import { Input } from "../core/input";
import type { Renderer } from "../core/renderer";
import { SPRITES } from "../data/sprites";
import { RESIDENTS } from "../data/residents";
import type { VignetteKind } from "../data/residents/types";
import { TOWN, TOWN_AMBIENCE } from "../data/town";
import { FakeAudio } from "../testing/sim";
import { TownScene } from "./town";
import { ambienceFor, birdDelay } from "./town-logic";
import { VIGNETTE_CUES, VIGNETTE_FEEL, VignetteScene } from "./vignette";

const measure = (text: string): number => text.length * 8;

function town(freed: Parameters<typeof ambienceFor>[0], extra: { drawing?: number[] | null; random?: () => number } = {}) {
  const input = new Input();
  const audio = new FakeAudio(5, 0.03);
  const scene = new TownScene(TOWN, RESIDENTS, { freed, ...extra }, input, audio, measure);
  return { scene, audio, input };
}

describe("lớp thị trấn theo cư dân đã giải thoát", () => {
  it("mỗi cư dân bật đúng một lớp của mình", () => {
    expect(ambienceFor([])).toEqual({ windows: false, sky: false, birds: false, wall: false });
    expect(ambienceFor(["r1"])).toEqual({ windows: true, sky: false, birds: false, wall: false });
    expect(ambienceFor(["r1", "r2"])).toEqual({ windows: true, sky: true, birds: false, wall: false });
    expect(ambienceFor(["r1", "r2", "r3"])).toEqual({ windows: true, sky: true, birds: true, wall: false });
    expect(ambienceFor(["r1", "r2", "r3", "r4"])).toEqual({ windows: true, sky: true, birds: true, wall: true });
    expect(ambienceFor(["r3"])).toEqual({ windows: false, sky: false, birds: true, wall: false });
  });

  it("TownScene báo đúng lớp đang bật", () => {
    expect(town([]).scene.ambience.windows).toBe(false);
    expect(town(["r1", "r2"]).scene.ambience).toEqual({ windows: true, sky: true, birds: false, wall: false });
  });

  it("cửa sổ nằm trên ô tường của dãy nhà, không trùng cửa hay đường", () => {
    for (const tile of TOWN_AMBIENCE.windows.tiles) {
      expect(TOWN.rows[tile.y]?.[tile.x], `cửa sổ (${tile.x}, ${tile.y})`).toBe("#");
    }
  });

  it("khung tranh trên tường nằm trong ô tường nhà Linh (cột 45–51, hàng 0–1)", () => {
    const { frame } = TOWN_AMBIENCE.wall;
    const t = 32;
    for (let x = Math.floor(frame.x / t); x <= Math.floor((frame.x + frame.w - 1) / t); x++) {
      for (let y = Math.floor(frame.y / t); y <= Math.floor((frame.y + frame.h - 1) / t); y++) {
        expect(TOWN.rows[y]?.[x], `ô (${x}, ${y})`).toBe("#");
        expect(x).toBeGreaterThanOrEqual(45);
        expect(x).toBeLessThanOrEqual(51);
      }
    }
  });

  it("tranh trên tường dựng từ dữ liệu đã lưu: cặp -1, -1 tách nét, mọi điểm nằm trong khung", () => {
    const { scene } = town(["r1", "r2", "r3", "r4"], { drawing: [10, 10, 200, 80, -1, -1, 390, 150, 400, 160] });
    const strokes = scene["wallStrokes"];
    expect(strokes).toHaveLength(2);
    const { frame } = TOWN_AMBIENCE.wall;
    for (const stroke of strokes) {
      for (const p of stroke) {
        expect(p.x).toBeGreaterThanOrEqual(frame.x);
        expect(p.x).toBeLessThanOrEqual(frame.x + frame.w);
        expect(p.y).toBeGreaterThanOrEqual(frame.y);
        expect(p.y).toBeLessThanOrEqual(frame.y + frame.h);
      }
    }
  });

  it("không có tranh (null hoặc rỗng): không có nét nào, tờ giấy trắng", () => {
    expect(town(["r4"], { drawing: null }).scene["wallStrokes"]).toEqual([]);
    expect(town(["r4"], { drawing: [] }).scene["wallStrokes"]).toEqual([]);
    expect(town(["r4"]).scene["wallStrokes"]).toEqual([]);
  });

  it("birdDelay nằm trong [min, max]", () => {
    expect(birdDelay(0, 6, 12)).toBe(6);
    expect(birdDelay(0.5, 6, 12)).toBe(9);
    expect(birdDelay(1, 6, 12)).toBeLessThanOrEqual(12);
    expect(birdDelay(-1, 6, 12)).toBe(6);
  });

  it("chim chỉ kêu khi r3 đã giải thoát, cách nhau 6–12 giây", () => {
    const quiet = town(["r1", "r2"], { random: () => 0 });
    for (let i = 0; i < TICK_RATE * 40; i++) quiet.scene.update();
    expect(quiet.audio.cues.filter((c) => c === "bird")).toHaveLength(0);

    const low = town(["r1", "r2", "r3"], { random: () => 0 });
    for (let i = 0; i < TICK_RATE * 60; i++) low.scene.update();
    expect(low.audio.cues.filter((c) => c === "bird")).toHaveLength(10);

    const high = town(["r1", "r2", "r3"], { random: () => 0.999999 });
    for (let i = 0; i < TICK_RATE * 60; i++) high.scene.update();
    expect(high.audio.cues.filter((c) => c === "bird")).toHaveLength(5);
  });

  it("vẽ thị trấn với mọi lớp bật không ném lỗi", () => {
    const { scene } = town(["r1", "r2", "r3", "r4"], { drawing: [10, 10, 100, 100] });
    const calls: string[] = [];
    const sink = new Proxy(
      {},
      {
        get: (_t, name) => {
          if (name === "sprites") return { size: () => ({ width: 16, height: 24 }) };
          return () => calls.push(String(name));
        },
      },
    ) as unknown as Renderer;
    scene.render(sink, 1);
    expect(calls.length).toBeGreaterThan(50);
  });
});

describe("cảnh kết của từng cư dân (VignetteScene)", () => {
  const kinds: VignetteKind[] = ["phone", "lookUp", "hum", "pencil", "leave"];

  it("mọi cư dân có một cảnh kết, mỗi kiểu dùng đúng một lần", () => {
    expect(RESIDENTS.map((r) => r.vignette).sort()).toEqual([...kinds].sort());
  });

  for (const kind of kinds) {
    it(`${kind}: chạy đủ ${VIGNETTE_FEEL.seconds} giây, render ở mọi thời điểm chỉ dùng sprite có thật`, () => {
      const input = new Input();
      const scene = new VignetteScene(kind, input, { drawing: [] }, new FakeAudio());
      const used: string[] = [];
      const renderer = new Proxy(
        {},
        {
          get: (_t, name) => {
            if (name === "sprites") return { size: () => ({ width: 16, height: 24 }) };
            if (name === "sprite") return (id: string) => used.push(id);
            return () => undefined;
          },
        },
      ) as unknown as Renderer;
      for (let i = 0; i < TICK_RATE * VIGNETTE_FEEL.seconds + 5; i++) {
        input.poll();
        scene.update();
        if (i % 30 === 0) scene.render(renderer);
      }
      expect(scene.finished).toBe(true);
      for (const id of used) expect(Object.keys(SPRITES), id).toContain(id);
    });
  }

  it("tiếng của từng cảnh phát đúng số lần: ring × 3, hum × 1, chime × 1, còn lại im", () => {
    const run = (kind: VignetteKind): string[] => {
      const audio = new FakeAudio();
      const input = new Input();
      const scene = new VignetteScene(kind, input, { drawing: [] }, audio);
      for (let i = 0; i < TICK_RATE * VIGNETTE_FEEL.seconds; i++) {
        input.poll();
        scene.update();
      }
      return audio.cues;
    };
    expect(run("phone")).toEqual(["ring", "ring", "ring"]);
    expect(run("hum")).toEqual(["hum"]);
    expect(run("leave")).toEqual(["chime"]);
    expect(run("lookUp")).toEqual([]);
    expect(run("pencil")).toEqual([]);
    expect(Object.keys(VIGNETTE_CUES).sort()).toEqual([...kinds].sort());
  });

  it("cue của cảnh nằm trong thời lượng cảnh", () => {
    for (const list of Object.values(VIGNETTE_CUES)) for (const c of list) expect(c.at).toBeLessThan(VIGNETTE_FEEL.seconds);
  });

  it("phone: màn mờ hết về đen trước khi cảnh dứt (không biết có ai nghe máy)", () => {
    expect(VIGNETTE_FEEL.phoneFadeFrom + VIGNETTE_FEEL.phoneFadeSeconds).toBeLessThanOrEqual(VIGNETTE_FEEL.seconds);
    expect(Math.max(...VIGNETTE_FEEL.ringAt)).toBeLessThan(VIGNETTE_FEEL.phoneFadeFrom);
  });
});