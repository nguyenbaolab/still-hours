import { clamp, type Rect } from "../core/math";
import type { DrawFeel, SketchFeel } from "../data/sketch-feel";
import { Sketch } from "./sketch";

/**
 * Trang vẽ của một trận (cư dân 4). Do `BattleScene` giữ và truyền cho từng pha né, nên thua rồi chơi lại
 * không mất nét: mọi nét đều được tính. Logic thuần, không vẽ, không phát tiếng.
 */
export class PageState {
  readonly sketch: Sketch;
  /** Số beat đã vẽ của lượt hiện tại. Giữ nguyên khi thua; về 0 khi `closeRound`. */
  drawnBeats = 0;
  /** Số đoạn nét thuộc các lượt trước. Lúc lộ tranh, chúng hiện sẵn bằng sáp. */
  pastSegments = 0;

  constructor(feel: SketchFeel) {
    this.sketch = new Sketch(feel);
  }

  /** Xong một lượt (thắng): nét của lượt này thành "nét lượt trước", beat vẽ về 0. */
  closeRound(): void {
    this.drawnBeats = 0;
    this.pastSegments = this.sketch.count;
    this.sketch.lift();
  }
}

export interface Point {
  x: number;
  y: number;
}

/** Vị trí bút nằm đầu lượt, theo toạ độ màn hình. */
export function pencilHome(arena: Rect, pencil: Point): Point {
  return { x: arena.x + pencil.x * arena.w, y: arena.y + pencil.y * arena.h };
}

/**
 * Cầm bút được không: tâm bánh răng cách tâm bút ≤ `pickupRadius`, và đã qua `pickupDelaySeconds`
 * kể từ lần rơi gần nhất (`secondsSinceDrop`, Infinity nếu chưa rơi lần nào).
 */
export function pencilPickup(gear: Point, pencil: Point, feel: DrawFeel, secondsSinceDrop: number): boolean {
  if (secondsSinceDrop < feel.pickupDelaySeconds) return false;
  return Math.hypot(gear.x - pencil.x, gear.y - pencil.y) <= feel.pickupRadius;
}

/**
 * Chỗ bút rơi: văng `dropDistance` từ bánh răng, theo hướng từ tâm đạn xao nhãng về tâm bánh răng,
 * rồi kẹp trong khung cách mép `dropMargin`. Đạn nằm đúng tâm bánh răng (không có hướng) thì văng lên trên.
 */
export function dropPoint(gear: Point, distraction: Point, arena: Rect, feel: DrawFeel): Point {
  let dx = gear.x - distraction.x;
  let dy = gear.y - distraction.y;
  const length = Math.hypot(dx, dy);
  if (length < 1e-6) {
    dx = 0;
    dy = -1;
  } else {
    dx /= length;
    dy /= length;
  }
  return {
    x: clamp(gear.x + dx * feel.dropDistance, arena.x + feel.dropMargin, arena.x + arena.w - feel.dropMargin),
    y: clamp(gear.y + dy * feel.dropDistance, arena.y + feel.dropMargin, arena.y + arena.h - feel.dropMargin),
  };
}

/**
 * Beat vẽ thêm trong tick này. Chỉ tính khi đang cầm bút VÀ bánh răng đã dịch (`moved`).
 * `beatDelta` là số beat NGHE ĐƯỢC trôi qua trong tick, nên hệ số nhịp dưới 1 làm cùng thời gian thật vẽ được ít beat hơn.
 */
export function addDrawnBeats(current: number, holding: boolean, moved: boolean, beatDelta: number): number {
  if (!holding || !moved || !(beatDelta > 0)) return current;
  return current + beatDelta;
}
