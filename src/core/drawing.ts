import type { Rect } from "./math";

export interface Pt {
  x: number;
  y: number;
}

/** Một đoạn nét (hai đầu). Cùng hình với `StrokeSegment` của `battle/sketch.ts`, nhưng core không biết về battle. */
export interface Seg {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

/**
 * Gom các đoạn nối tiếp nhau (đầu của đoạn sau trùng cuối của đoạn trước) thành từng nét liền. Nhấc bút giữa chừng
 * thì đoạn sau không nối với đoạn trước, nên thành một nét mới.
 */
export function strokesFromSegments(segments: readonly Seg[]): Pt[][] {
  const strokes: Pt[][] = [];
  let current: Pt[] | null = null;
  let last: Pt | null = null;
  for (const seg of segments) {
    const continues = last !== null && Math.abs(seg.x0 - last.x) < 1e-6 && Math.abs(seg.y0 - last.y) < 1e-6;
    if (!continues || current === null) {
      current = [{ x: seg.x0, y: seg.y0 }];
      strokes.push(current);
    }
    const end = { x: seg.x1, y: seg.y1 };
    current.push(end);
    last = end;
  }
  return strokes;
}

/**
 * Thu các nét từ khung `source` vào khung `box`: giữ tỉ lệ (cùng một hệ số cho hai chiều), căn giữa trong `box`.
 * Mọi điểm nằm trong `source` thì sau khi thu đều nằm trong `box`.
 */
export function fitStrokes(strokes: readonly (readonly Pt[])[], source: Rect, box: Rect): Pt[][] {
  const scale = Math.min(box.w / source.w, box.h / source.h);
  const offsetX = box.x + (box.w - source.w * scale) / 2;
  const offsetY = box.y + (box.h - source.h * scale) / 2;
  return strokes.map((stroke) =>
    stroke.map((p) => ({ x: offsetX + (p.x - source.x) * scale, y: offsetY + (p.y - source.y) * scale })),
  );
}
