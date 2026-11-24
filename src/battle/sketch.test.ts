import { describe, expect, it } from "vitest";
import type { SketchFeel } from "../data/sketch-feel";
import { replayPieces, Sketch } from "./sketch";

const FEEL: SketchFeel = {
  width: 2,
  slowWidth: 5,
  sampleDistance: 10,
  slowSampleDistance: 4,
  replaySeconds: 2,
  revealSeconds: 2,
  crayonWidth: 8,
  crayonColor: "#fc0",
  color: "#fff",
};

describe("nét chì", () => {
  it("đứng yên không sinh đoạn, và khoảng lấy mẫu được tôn trọng", () => {
    const sketch = new Sketch(FEEL);
    sketch.sample(0, 0, false);
    sketch.sample(0, 0, false);
    sketch.sample(9.9, 0, false);
    expect(sketch.count).toBe(0);

    sketch.sample(10, 0, false);
    expect(sketch.count).toBe(1);
    expect(sketch.segments[0]?.length).toBeCloseTo(10, 6);

    sketch.sample(19, 0, false);
    expect(sketch.count).toBe(1);
    sketch.sample(20, 0, false);
    expect(sketch.count).toBe(2);
  });

  it("giữ Shift thì lấy mẫu dày hơn và nét đậm hơn", () => {
    const slow = new Sketch(FEEL);
    slow.sample(0, 0, true);
    slow.sample(4, 0, true);
    expect(slow.count).toBe(1);
    expect(slow.segments[0]?.width).toBe(FEEL.slowWidth);

    const fast = new Sketch(FEEL);
    fast.sample(0, 0, false);
    fast.sample(4, 0, false);
    expect(fast.count).toBe(0);
  });

  it("nhấc bút thì điểm tới không nối với nét cũ", () => {
    const sketch = new Sketch(FEEL);
    sketch.sample(0, 0, false);
    sketch.sample(10, 0, false);
    expect(sketch.count).toBe(1);

    sketch.lift();
    expect(sketch.pen).toBeNull();
    sketch.sample(100, 100, false);
    expect(sketch.count).toBe(1);
    sketch.sample(110, 100, false);
    expect(sketch.count).toBe(2);
    const last = sketch.segments[1];
    expect(last?.x0).toBe(100);
    expect(last?.y0).toBe(100);
  });

  it("phát lại đúng thứ tự đã vẽ, khúc cuối bị cắt giữa đoạn", () => {
    const sketch = new Sketch(FEEL);
    for (const x of [0, 10, 20, 30]) sketch.sample(x, 0, false);

    expect(replayPieces(sketch.segments, 0)).toEqual([]);
    const early = replayPieces(sketch.segments, 5);
    expect(early).toHaveLength(1);
    expect(early[0]?.x0).toBeCloseTo(0, 6);
    expect(early[0]?.x1).toBeCloseTo(5, 6);

    const mid = replayPieces(sketch.segments, 25);
    expect(mid.map((piece) => piece.x0)).toEqual([0, 10, 20]);
    expect(mid[2]?.x1).toBeCloseTo(25, 6);

    const all = replayPieces(sketch.segments, 1000);
    expect(all).toHaveLength(3);
    expect(all[2]?.x1).toBeCloseTo(30, 6);
  });
});
