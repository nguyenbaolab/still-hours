import { TICK_RATE } from "../core/config";
import type { Input } from "../core/input";
import { clamp, type Rect } from "../core/math";
import type { PlayerFeel } from "../data/feel";
import type { Door } from "./exit";

/** Bánh răng được đi quá mép khung chừng này (px) ngoài nửa thân, để tâm ra khỏi viền ngoài qua khe. */
const EXIT_OVERSHOOT = 12;

/**
 * Bánh răng của người chơi. Toạ độ (x, y) là TÂM bánh răng, tính bằng pixel logic, không làm tròn.
 * Chỉ chứa logic (di chuyển, va chạm, máu); việc vẽ nằm ở DodgePhase.
 */
export class Player {
  x = 0;
  y = 0;
  /** Vị trí ở tick trước, để nội suy khi vẽ (mượt trên màn hình tần số quét khác 60 Hz). */
  prevX = 0;
  prevY = 0;
  hp: number;
  /** Khe cửa đang mở (boss). Có thì bánh răng được lách qua khe; không thì bị kẹp trong khung như thường. */
  door: Door | null = null;

  /** Số tick bất tử còn lại; 0 = đang có thể bị trúng. */
  private invincibleTicks = 0;

  private readonly pxPerTick: number;
  private readonly slowPxPerTick: number;
  private readonly invincibleTotalTicks: number;
  private readonly blinkTicks: number;

  /** `bodySize`: cạnh hình vẽ bánh răng (px), dùng để giữ nguyên hình vẽ nằm trong khung. Hitbox nhỏ hơn, lấy từ `feel`. */
  constructor(
    private readonly feel: PlayerFeel,
    readonly bodySize: number,
  ) {
    this.hp = feel.maxHp;
    this.pxPerTick = feel.speed / TICK_RATE;
    this.slowPxPerTick = feel.slowSpeed / TICK_RATE;
    this.invincibleTotalTicks = Math.round(feel.invincibleSeconds * TICK_RATE);
    this.blinkTicks = Math.max(1, Math.round(feel.blinkSeconds * TICK_RATE));
  }

  get maxHp(): number {
    return this.feel.maxHp;
  }

  /** Đặt bánh răng vào vị trí mới ngay lập tức (không nội suy từ vị trí cũ). */
  place(x: number, y: number): void {
    this.x = this.prevX = x;
    this.y = this.prevY = y;
  }

  /** Di chuyển theo input, giữ trong `arena`, và đếm lùi thời gian bất tử. */
  update(input: Input, arena: Rect): void {
    this.prevX = this.x;
    this.prevY = this.y;

    // Chuẩn hóa chỉ khi vượt quá 1: đi chéo không nhanh hơn đi thẳng, còn input analog (sau này) nhỏ hơn 1 vẫn giữ nguyên.
    let dx = input.move.x;
    let dy = input.move.y;
    const length = Math.hypot(dx, dy);
    if (length > 1) {
      dx /= length;
      dy /= length;
    }

    const step = input.isDown("slow") ? this.slowPxPerTick : this.pxPerTick;
    this.moveTo(this.x + dx * step, this.y + dy * step, arena);

    if (this.invincibleTicks > 0) this.invincibleTicks--;
  }

  /** Xê dịch thêm trong tick này (lực hút), không đụng `prev`, vẫn kẹp trong khung. */
  shift(dx: number, dy: number, arena: Rect): void {
    this.moveTo(this.x + dx, this.y + dy, arena);
  }

  /**
   * Đặt vị trí mới, kẹp trong khung. Có khe cửa thì: ở trong khung, chỉ lách ra được nếu cả thân nằm lọt trong khe; đã ở
   * ngoài mép (trong khe) thì hai bên khe là tường; khe đóng khi đang ở ngoài mép thì bị đẩy về trong khung.
   */
  private moveTo(nx: number, ny: number, arena: Rect): void {
    const half = this.bodySize / 2;
    const minX = arena.x + half;
    const maxX = arena.x + arena.w - half;
    const minY = arena.y + half;
    const maxY = arena.y + arena.h - half;
    const door = this.door;
    const oldX = this.x;
    const oldY = this.y;
    let x = clamp(nx, minX, maxX);
    let y = clamp(ny, minY, maxY);
    if (door) {
      const horizontal = door.side === "left" || door.side === "right";
      const outward = door.side === "right" || door.side === "bottom" ? 1 : -1;
      const limit = horizontal ? (outward > 0 ? maxX : minX) : outward > 0 ? maxY : minY;
      const across = horizontal ? nx : ny;
      const along = horizontal ? ny : nx;
      const oldAcross = horizontal ? oldX : oldY;
      const lo = door.from + half;
      const hi = door.to - half;
      const wantsOut = (across - limit) * outward > 1e-9;
      const alreadyOut = (oldAcross - limit) * outward > 1e-9;
      if (wantsOut || alreadyOut) {
        let alongOut = along;
        let acrossOut = across;
        if (alreadyOut) {
          alongOut = clamp(along, lo, hi);
        } else if (along < lo || along > hi) {
          // Chưa vào khe và không lọt: vẫn kẹp ở mép.
          acrossOut = limit;
        }
        const reach = limit + outward * (half + EXIT_OVERSHOOT);
        acrossOut = outward > 0 ? Math.min(acrossOut, reach) : Math.max(acrossOut, reach);
        if (horizontal) {
          x = acrossOut;
          y = clamp(alongOut, minY, maxY);
        } else {
          y = acrossOut;
          x = clamp(alongOut, minX, maxX);
        }
      }
    }
    this.x = x;
    this.y = y;
  }

  /** Hitbox (nhỏ hơn hình vẽ) khi tâm ở (cx, cy). */
  hitboxAt(cx: number, cy: number): Rect {
    const size = this.feel.hitboxSize;
    return { x: cx - size / 2, y: cy - size / 2, w: size, h: size };
  }

  get hitbox(): Rect {
    return this.hitboxAt(this.x, this.y);
  }

  get invincible(): boolean {
    return this.invincibleTicks > 0;
  }

  /** Hình vẽ có đang hiện không. Khi bất tử thì nhấp nháy, bắt đầu bằng ẩn để báo hiệu "vừa trúng". */
  get visible(): boolean {
    if (this.invincibleTicks === 0) return true;
    const elapsed = this.invincibleTotalTicks - this.invincibleTicks;
    return Math.floor(elapsed / this.blinkTicks) % 2 === 1;
  }

  /** Trừ máu và bật bất tử. Trả về false (không làm gì) nếu đang bất tử. */
  hit(damage: number): boolean {
    if (this.invincible) return false;
    this.hp = Math.max(0, this.hp - damage);
    this.invincibleTicks = this.invincibleTotalTicks;
    return true;
  }
}
