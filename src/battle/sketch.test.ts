import { describe, expect, it } from "vitest";
import type { SketchFeel } from "../data/sketch-feel";
import { Sketch } from "./sketch";

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

const ink = (sketch: Sketch): number => sketch.segments.filter((seg) => !seg.erased).reduce((sum, seg) => sum + seg.length, 0);
const gone = (sketch: Sketch): number => sketch.segments.filter((seg) => seg.erased).reduce((sum, seg) => sum + seg.length, 0);

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

  it("tẩy ngược từ nét mới nhất, hết đoạn này thì sang đoạn cũ", () => {
    const sketch = new Sketch(FEEL);
    for (const x of [0, 10, 20, 30]) sketch.sample(x, 0, false);
    sketch.erase(15);

    expect(ink(sketch)).toBeCloseTo(15, 6);
    expect(gone(sketch)).toBeCloseTo(15, 6);
    expect(sketch.segments[0]?.erased).toBe(false);
    expect(sketch.segments[0]?.length).toBeCloseTo(10, 6);
    expect(sketch.segments[0]?.x0).toBeCloseTo(0, 6);
    expect(sketch.segments.at(-1)?.erased).toBe(true);
    expect(sketch.segments.at(-1)?.x1).toBeCloseTo(30, 6);

    sketch.erase(10);
    expect(ink(sketch)).toBeCloseTo(5, 6);
    expect(sketch.segments[0]?.erased).toBe(false);
    expect(sketch.segments[0]?.x0).toBeCloseTo(0, 6);
  });

  it("đường ngắn hơn độ dài tẩy thì tẩy hết, không cắt phần còn lại", () => {
    const sketch = new Sketch(FEEL);
    sketch.sample(0, 0, false);
    sketch.sample(10, 0, false);
    sketch.erase(40);
    expect(sketch.count).toBe(1);
    expect(sketch.segments[0]?.erased).toBe(true);
    expect(sketch.segments[0]?.length).toBeCloseTo(10, 6);
  });

  it("cắt giữa một đoạn: phần cũ giữ mực, phần mới thành vết tẩy", () => {
    const sketch = new Sketch(FEEL);
    sketch.sample(0, 0, false);
    sketch.sample(20, 0, false);
    sketch.erase(7);

    const solid = sketch.segments.filter((seg) => !seg.erased);
    const erased = sketch.segments.filter((seg) => seg.erased);
    expect(solid).toHaveLength(1);
    expect(erased).toHaveLength(1);
    expect(solid[0]?.length).toBeCloseTo(13, 6);
    expect(solid[0]?.x0).toBeCloseTo(0, 6);
    expect(solid[0]?.x1).toBeCloseTo(13, 6);
    expect(erased[0]?.length).toBeCloseTo(7, 6);
    expect(erased[0]?.x0).toBeCloseTo(13, 6);
    expect(erased[0]?.x1).toBeCloseTo(20, 6);
  });
});
