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

/** Hình tròn (tâm cx, cy, bán kính r) có chồng lên hình chữ nhật không. Chỉ chạm mép thì KHÔNG tính là va chạm. */
export function circleIntersectsRect(cx: number, cy: number, r: number, rect: Rect): boolean {
  const dx = cx - clamp(cx, rect.x, rect.x + rect.w);
  const dy = cy - clamp(cy, rect.y, rect.y + rect.h);
  return dx * dx + dy * dy < r * r;
}

/**
 * Đoạn thẳng (x0,y0)→(x1,y1) có cắt hộp [left,right]×[top,bottom] không (phương pháp "slab", không cấp phát).
 * Muốn đoạn có độ dày `t`, nới hộp ra mỗi phía `t / 2` trước khi gọi.
 */
export function segmentIntersectsBox(
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  left: number,
  top: number,
  right: number,
  bottom: number,
): boolean {
  // Đoạn thẳng là x0 + t·dx với t ∈ [0, 1]; thu hẹp khoảng t sao cho đồng thời nằm trong dải x và dải y.
  let enter = 0;
  let leave = 1;

  const dx = x1 - x0;
  if (dx === 0) {
    if (x0 < left || x0 > right) return false;
  } else {
    let near = (left - x0) / dx;
    let far = (right - x0) / dx;
    if (near > far) [near, far] = [far, near];
    enter = Math.max(enter, near);
    leave = Math.min(leave, far);
    if (enter > leave) return false;
  }

  const dy = y1 - y0;
  if (dy === 0) {
    if (y0 < top || y0 > bottom) return false;
  } else {
    let near = (top - y0) / dy;
    let far = (bottom - y0) / dy;
    if (near > far) [near, far] = [far, near];
    enter = Math.max(enter, near);
    leave = Math.min(leave, far);
    if (enter > leave) return false;
  }

  return true;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export function lerp(from: number, to: number, t: number): number {
  return from + (to - from) * t;
}
