import { describe, expect, it } from "vitest";
import { TempoMap } from "../core/tempo-map";
import { BATTLE_LAYOUT } from "../data/battle-layout";
import { PLAYER_FEEL } from "../data/feel";
import { TOWN_HORIZON } from "../data/figures/town-horizon";
import type { GuideFigure } from "../data/guide";
import { GUIDE_FEEL, type SketchFeel } from "../data/sketch-feel";
import { guidePose, guidePoseAtTime, traceOnLight, validateGuide, type GuideLimits } from "./guide";
import { Sketch } from "./sketch";

const ARENA = { x: 0, y: 0, w: 400, h: 160 };
const LIMITS: GuideLimits = { speed: 180, slowSpeed: 80, speedRatio: 0.7 };

const LINE: GuideFigure = {
  name: "ngang",
  points: [
    { x: 0, y: 0.5, beat: 0 },
    { x: 1, y: 0.5, beat: 10 },
  ],
};

const FEEL: SketchFeel = {
  width: 2,
  slowWidth: 5,
  sampleDistance: 10,
  slowSampleDistance: 4,
  eraseLength: 15,
  eraserSpeed: 100,
  erasedAlpha: 0.2,
  revealSeconds: 2,
  color: "#fff",
  eraserColor: "#fcc",
};

describe("đốm sáng", () => {
  it("nội suy theo beat, và hệ số nhịp nhỏ hơn 1 làm đốm đi chậm theo beat nghe được", () => {
    const mid = guidePose(LINE, 5, ARENA, 1);
    expect(mid.x).toBeCloseTo(200, 6);
    expect(mid.y).toBeCloseTo(80, 6);
    expect(mid.aheadX).toBeCloseTo(240, 6);

    const tempo = new TempoMap(120);
    tempo.setPace(0, 0.5);
    const time = 4;
    const heard = guidePoseAtTime(LINE, time, tempo, ARENA, 1);
    const scriptBeat = tempo.scriptBeatAtTime(time);
    const ignored = guidePose(LINE, scriptBeat, ARENA, 1);
    expect(tempo.beatAtTime(time)).toBeCloseTo(4, 6);
    expect(heard.x).toBeCloseTo(160, 6);
    expect(heard.x).not.toBeCloseTo(ignored.x, 4);
  });

  it("ngoài vùng sáng không sinh đoạn, và không nối nét qua khoảng trống", () => {
    const sketch = new Sketch(FEEL);
    expect(traceOnLight(sketch, 0, 0, 0, 0, 12, false)).toBe(true);
    expect(traceOnLight(sketch, 10, 0, 0, 0, 12, false)).toBe(true);
    expect(sketch.count).toBe(1);

    expect(traceOnLight(sketch, 40, 0, 0, 0, 12, false)).toBe(false);
    expect(sketch.count).toBe(1);

    expect(traceOnLight(sketch, 0, 0, 0, 0, 12, false)).toBe(true);
    expect(sketch.count).toBe(1);
    expect(traceOnLight(sketch, 10, 0, 0, 0, 12, false)).toBe(true);
    expect(sketch.segments[1]?.x0).toBeCloseTo(0, 6);
    expect(sketch.segments[1]?.x1).toBeCloseTo(10, 6);
    expect(sketch.segments.some((seg) => seg.x1 > 10.01)).toBe(false);
  });

  it("từ chối đốm sáng nhanh hơn trần, và nhận hình chân trời", () => {
    const tempo = new TempoMap(100);
    const fast: GuideFigure = {
      name: "nhanh",
      points: [
        { x: 0, y: 0, beat: 0 },
        { x: 1, y: 0, beat: 1 },
      ],
    };
    const detail: GuideFigure = {
      name: "tháp",
      points: [
        { x: 0, y: 0, beat: 0 },
        { x: 0.5, y: 0, beat: 1, detail: true },
      ],
    };
    expect(validateGuide(fast, ARENA, tempo, LIMITS).join("\n")).toMatch(/quá nhanh/);
    expect(validateGuide(detail, ARENA, tempo, LIMITS).join("\n")).toMatch(/khúc chi tiết/);

    const townLimits: GuideLimits = {
      speed: PLAYER_FEEL.speed,
      slowSpeed: PLAYER_FEEL.slowSpeed,
      speedRatio: GUIDE_FEEL.speedRatio,
    };
    expect(validateGuide(TOWN_HORIZON, BATTLE_LAYOUT.arena, tempo, townLimits)).toEqual([]);
  });
});
