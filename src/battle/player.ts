import { TICK_RATE } from "../core/config";
import type { Input } from "../core/input";
import { clamp, type Rect } from "../core/math";
import type { PlayerFeel } from "../data/feel";

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
    const half = this.bodySize / 2;
    this.x = clamp(this.x + dx * step, arena.x + half, arena.x + arena.w - half);
    this.y = clamp(this.y + dy * step, arena.y + half, arena.y + arena.h - half);

    if (this.invincibleTicks > 0) this.invincibleTicks--;
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

  /** Hồi đầy máu, kèm một khoảng bất tử để không bị trúng lại ngay. */
  resetHealth(): void {
    this.hp = this.feel.maxHp;
    this.invincibleTicks = this.invincibleTotalTicks;
  }
}
