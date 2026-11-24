import { describe, expect, it } from "vitest";
import { fitStrokes, strokesFromSegments } from "./drawing";

describe("tranh của người chơi", () => {
  it("gom các đoạn nối tiếp thành một nét, nhấc bút thì tách nét", () => {
    const strokes = strokesFromSegments([
      { x0: 0, y0: 0, x1: 10, y1: 0 },
      { x0: 10, y0: 0, x1: 10, y1: 10 },
      { x0: 50, y0: 50, x1: 60, y1: 50 },
    ]);
    expect(strokes).toHaveLength(2);
    expect(strokes[0]).toEqual([
      { x: 0, y: 0 },
      { x: 10, y: 0 },
      { x: 10, y: 10 },
    ]);
    expect(strokes[1]).toEqual([
      { x: 50, y: 50 },
      { x: 60, y: 50 },
    ]);
    expect(strokesFromSegments([])).toEqual([]);
  });

  it("thu vào khung giữ tỉ lệ và nằm trong khung", () => {
    const source = { x: 120, y: 100, w: 400, h: 160 };
    const box = { x: 240, y: 150, w: 160, h: 64 };
    const strokes = [
      [
        { x: 120, y: 100 },
        { x: 520, y: 260 },
      ],
      [
        { x: 320, y: 180 },
        { x: 400, y: 120 },
      ],
    ];
    const fitted = fitStrokes(strokes, source, box);
    for (const stroke of fitted) {
      for (const p of stroke) {
        expect(p.x).toBeGreaterThanOrEqual(box.x - 1e-9);
        expect(p.x).toBeLessThanOrEqual(box.x + box.w + 1e-9);
        expect(p.y).toBeGreaterThanOrEqual(box.y - 1e-9);
        expect(p.y).toBeLessThanOrEqual(box.y + box.h + 1e-9);
      }
    }
    // Tỉ lệ: cùng một hệ số cho hai chiều.
    const a = fitted[0] as { x: number; y: number }[];
    const dx = (a[1]?.x ?? 0) - (a[0]?.x ?? 0);
    const dy = (a[1]?.y ?? 0) - (a[0]?.y ?? 0);
    expect(dx / 400).toBeCloseTo(dy / 160, 9);
  });

  it("khung đích khác tỉ lệ thì co theo chiều chật hơn và căn giữa", () => {
    const fitted = fitStrokes(
      [
        [
          { x: 0, y: 0 },
          { x: 100, y: 100 },
        ],
      ],
      { x: 0, y: 0, w: 100, h: 100 },
      { x: 0, y: 0, w: 200, h: 50 },
    );
    const [p0, p1] = fitted[0] as { x: number; y: number }[];
    expect(p1!.y - p0!.y).toBeCloseTo(50, 9);
    expect(p1!.x - p0!.x).toBeCloseTo(50, 9);
    expect(p0!.x).toBeCloseTo(75, 9);
  });
});
