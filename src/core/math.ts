/** Hình chữ nhật căn theo trục (AABB); (x, y) là góc trên trái. Dùng cho va chạm và vùng chơi. */
export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Hai hình chữ nhật có chồng lên nhau không. Chỉ chạm mép (không chồng diện tích) thì KHÔNG tính là va chạm. */
export function overlaps(a: Rect, b: Rect): boolean {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export function lerp(from: number, to: number, t: number): number {
  return from + (to - from) * t;
}
