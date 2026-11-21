/**
 * TẠM THỜI (bước 1). Vật cản đơn giản chỉ để thử va chạm và máu.
 * Bước 2 thay bằng đạn thật theo beat; khi đó xóa file này và src/data/temp-obstacles.ts.
 */
import { TICK_RATE } from "../core/config";
import type { Rect } from "../core/math";
import type { TempObstacleData } from "../data/temp-obstacles";

export class TempObstacle {
  x: number;
  y: number;
  prevX: number;
  prevY: number;
  readonly w: number;
  readonly h: number;
  readonly damage: number;

  private vx: number;
  private vy: number;

  constructor(data: TempObstacleData, arena: Rect) {
    this.x = this.prevX = arena.x + data.x;
    this.y = this.prevY = arena.y + data.y;
    this.w = data.w;
    this.h = data.h;
    this.damage = data.damage;
    this.vx = data.vx / TICK_RATE;
    this.vy = data.vy / TICK_RATE;
  }

  /** Di chuyển thẳng, nảy lại khi chạm mép khung. */
  update(arena: Rect): void {
    this.prevX = this.x;
    this.prevY = this.y;
    this.x += this.vx;
    this.y += this.vy;

    if (this.x < arena.x) {
      this.x = arena.x;
      this.vx = Math.abs(this.vx);
    } else if (this.x + this.w > arena.x + arena.w) {
      this.x = arena.x + arena.w - this.w;
      this.vx = -Math.abs(this.vx);
    }

    if (this.y < arena.y) {
      this.y = arena.y;
      this.vy = Math.abs(this.vy);
    } else if (this.y + this.h > arena.y + arena.h) {
      this.y = arena.y + arena.h - this.h;
      this.vy = -Math.abs(this.vy);
    }
  }

  rectAt(x: number, y: number): Rect {
    return { x, y, w: this.w, h: this.h };
  }

  get rect(): Rect {
    return this.rectAt(this.x, this.y);
  }
}
