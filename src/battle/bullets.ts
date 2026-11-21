import { circleIntersectsRect, lerp, type Rect, segmentIntersectsBox } from "../core/math";
import type { Renderer } from "../core/renderer";
import type { BulletFeel } from "../data/rhythm-feel";
import { Pool } from "./pool";

const COLOR = {
  bullet: "#efe7d4",
  bulletBig: "#e0524a",
  hand: "#e0524a",
  handHub: "#ffd0c8",
  telegraph: "#ffb347",
  debugBullet: "#ff4de1",
} as const;

/** Đạn không sống quá số giây này (dọn rác an toàn nếu có đạn bay mãi). */
const MAX_LIFETIME_SECONDS = 40;
/** Phần hiển thị lớn hơn vùng va chạm bấy nhiêu px (cùng nguyên tắc: hình vẽ lớn hơn hitbox, người chơi thấy mình né sát). */
const DRAW_EXTRA_RADIUS = 0.5;

/**
 * Đạn chấm: vị trí là HÀM CỦA THỜI GIAN kể từ lúc xuất hiện (điểm xuất phát + vận tốc × thời gian), không cộng dồn
 * theo tick. Nhờ vậy đạn luôn đúng chỗ so với đồng hồ nhịp dù khung hình giật, và đạn xuất hiện trễ nửa tick vẫn
 * được đặt đúng chỗ như đã xuất hiện từ đúng beat.
 */
export class DotBullet {
  x = 0;
  y = 0;
  prevX = 0;
  prevY = 0;
  originX = 0;
  originY = 0;
  /** px/giây */
  vx = 0;
  vy = 0;
  /** Thời điểm (giây theo đồng hồ nhịp) đạn xuất hiện. */
  fireTime = 0;
  radius = 0;
  damage = 0;
  big = false;
}

/** Kim đồng hồ: đoạn thẳng từ tâm, góc là hàm của BEAT (nên quay nhanh/chậm theo tempo). */
export class HandBullet {
  cx = 0;
  cy = 0;
  angle = 0;
  prevAngle = 0;
  startAngle = 0;
  /** rad mỗi beat */
  angularVelocity = 0;
  fireBeat = 0;
  endBeat = 0;
  length = 0;
  thickness = 0;
  damage = 0;
}

export type TelegraphShape = "box" | "line" | "ring";

/** Hình cảnh báo nhấp nháy. Dùng chung các trường tùy theo `shape`. */
export class Telegraph {
  shape: TelegraphShape = "box";
  x = 0;
  y = 0;
  /** box: chiều rộng, cao. line: điểm cuối. ring: bán kính ở `w`. */
  w = 0;
  h = 0;
  dashed = false;
  startTime = 0;
  endTime = 0;
}

/** Toàn bộ đạn và cảnh báo đang hoạt động trong khung né. */
export class BulletWorld {
  readonly dots: Pool<DotBullet>;
  readonly hands: Pool<HandBullet>;
  readonly telegraphs: Pool<Telegraph>;
  /** Số lần phải bỏ qua đạn/cảnh báo vì pool đầy (nên là 0; tăng `maxBullets` nếu khác 0). */
  dropped = 0;

  /** Thời gian và beat của tick hiện tại (từ `step`). */
  private time = 0;
  private beat = 0;

  constructor(
    private readonly arena: Rect,
    private readonly feel: BulletFeel,
  ) {
    this.dots = new Pool(feel.maxBullets, () => new DotBullet());
    this.hands = new Pool(32, () => new HandBullet());
    this.telegraphs = new Pool(64, () => new Telegraph());
  }

  get activeBullets(): number {
    return this.dots.size + this.hands.size;
  }

  /** Đưa mọi thứ đang có tới thời điểm mới, và dọn những gì đã hết hạn. Gọi mỗi tick, TRƯỚC khi sinh đạn mới. */
  step(time: number, beat: number): void {
    this.time = time;
    this.beat = beat;
    const { arena } = this;
    const centerX = arena.x + arena.w / 2;
    const centerY = arena.y + arena.h / 2;

    for (let i = 0; i < this.dots.size; ) {
      const dot = this.dots.at(i);
      dot.prevX = dot.x;
      dot.prevY = dot.y;
      const age = Math.max(0, time - dot.fireTime);
      dot.x = dot.originX + dot.vx * age;
      dot.y = dot.originY + dot.vy * age;

      // Bị loại khi đã ra ngoài khung VÀ đang bay xa khỏi khung (đạn mới xuất hiện ở ngoài mép nhưng bay vào thì giữ lại).
      const margin = dot.radius + 2;
      const outside =
        dot.x < arena.x - margin ||
        dot.x > arena.x + arena.w + margin ||
        dot.y < arena.y - margin ||
        dot.y > arena.y + arena.h + margin;
      const leaving = (dot.x - centerX) * dot.vx + (dot.y - centerY) * dot.vy > 0;
      if ((outside && leaving) || age > MAX_LIFETIME_SECONDS) this.dots.release(i);
      else i++;
    }

    for (let i = 0; i < this.hands.size; ) {
      const hand = this.hands.at(i);
      if (beat >= hand.endBeat) {
        this.hands.release(i);
        continue;
      }
      hand.prevAngle = hand.angle;
      hand.angle = hand.startAngle + hand.angularVelocity * (beat - hand.fireBeat);
      i++;
    }

    for (let i = 0; i < this.telegraphs.size; ) {
      if (time >= this.telegraphs.at(i).endTime) this.telegraphs.release(i);
      else i++;
    }
  }

  /** Sinh một viên đạn chấm tại điểm (x, y), bay theo hướng `angle` (rad) với `speed` px/giây. */
  spawnDot(x: number, y: number, angle: number, speed: number, radius: number, damage: number, fireTime: number): void {
    const dot = this.dots.acquire();
    if (!dot) {
      this.dropped++;
      return;
    }
    dot.originX = x;
    dot.originY = y;
    dot.vx = Math.cos(angle) * speed;
    dot.vy = Math.sin(angle) * speed;
    dot.fireTime = fireTime;
    dot.radius = radius;
    dot.damage = damage;
    dot.big = radius >= this.feel.bigRadius;
    const age = Math.max(0, this.time - fireTime);
    dot.x = dot.prevX = x + dot.vx * age;
    dot.y = dot.prevY = y + dot.vy * age;
  }

  /** Sinh một kim đồng hồ quay quanh (cx, cy). `angularVelocity` tính bằng rad mỗi beat. */
  spawnHand(
    cx: number,
    cy: number,
    startAngle: number,
    angularVelocity: number,
    length: number,
    damage: number,
    fireBeat: number,
    durationBeats: number,
  ): void {
    const hand = this.hands.acquire();
    if (!hand) {
      this.dropped++;
      return;
    }
    hand.cx = cx;
    hand.cy = cy;
    hand.startAngle = startAngle;
    hand.angularVelocity = angularVelocity;
    hand.length = length;
    hand.thickness = this.feel.handThickness;
    hand.damage = damage;
    hand.fireBeat = fireBeat;
    hand.endBeat = fireBeat + durationBeats;
    hand.angle = hand.prevAngle = startAngle + angularVelocity * (this.beat - fireBeat);
  }

  addTelegraph(shape: TelegraphShape, x: number, y: number, w: number, h: number, dashed: boolean, startTime: number, endTime: number): void {
    const telegraph = this.telegraphs.acquire();
    if (!telegraph) {
      this.dropped++;
      return;
    }
    telegraph.shape = shape;
    telegraph.x = x;
    telegraph.y = y;
    telegraph.w = w;
    telegraph.h = h;
    telegraph.dashed = dashed;
    telegraph.startTime = startTime;
    telegraph.endTime = endTime;
  }

  /** Máu mất nếu hitbox đang chạm đạn nào đó (0 = không trúng). Cảnh báo không gây sát thương. */
  hit(hitbox: Rect): number {
    for (let i = 0; i < this.dots.size; i++) {
      const dot = this.dots.at(i);
      if (circleIntersectsRect(dot.x, dot.y, dot.radius, hitbox)) return dot.damage;
    }
    for (let i = 0; i < this.hands.size; i++) {
      const hand = this.hands.at(i);
      const half = hand.thickness / 2;
      const hit = segmentIntersectsBox(
        hand.cx,
        hand.cy,
        hand.cx + Math.cos(hand.angle) * hand.length,
        hand.cy + Math.sin(hand.angle) * hand.length,
        hitbox.x - half,
        hitbox.y - half,
        hitbox.x + hitbox.w + half,
        hitbox.y + hitbox.h + half,
      );
      if (hit) return hand.damage;
    }
    return 0;
  }

  /** Vẽ cảnh báo và đạn, cắt trong khung (đạn "chui" ra từ mép khung). `debug` thêm vùng va chạm thật. */
  render(renderer: Renderer, alpha: number, debug: boolean): void {
    const { arena } = this;
    renderer.clip(arena.x, arena.y, arena.w, arena.h);

    const flash = this.feel.telegraphFlashSeconds;
    for (let i = 0; i < this.telegraphs.size; i++) {
      const t = this.telegraphs.at(i);
      if (Math.floor((this.time - t.startTime) / flash) % 2 === 1) continue; // pha tắt của nhấp nháy
      if (t.shape === "box") renderer.rect(t.x, t.y, t.w, t.h, COLOR.telegraph);
      else if (t.shape === "ring") renderer.ring(t.x, t.y, t.w, COLOR.telegraph);
      else renderer.line(t.x, t.y, t.w, t.h, 1, COLOR.telegraph, t.dashed ? 3 : 0);
    }

    for (let i = 0; i < this.dots.size; i++) {
      const dot = this.dots.at(i);
      const x = lerp(dot.prevX, dot.x, alpha);
      const y = lerp(dot.prevY, dot.y, alpha);
      renderer.disc(x, y, dot.radius + DRAW_EXTRA_RADIUS, dot.big ? COLOR.bulletBig : COLOR.bullet);
      if (debug) renderer.ring(x, y, dot.radius, COLOR.debugBullet);
    }

    for (let i = 0; i < this.hands.size; i++) {
      const hand = this.hands.at(i);
      const angle = lerp(hand.prevAngle, hand.angle, alpha);
      const tipX = hand.cx + Math.cos(angle) * hand.length;
      const tipY = hand.cy + Math.sin(angle) * hand.length;
      renderer.line(hand.cx, hand.cy, tipX, tipY, hand.thickness, COLOR.hand);
      renderer.disc(hand.cx, hand.cy, hand.thickness + 0.5, COLOR.handHub);
      if (debug) renderer.line(hand.cx, hand.cy, tipX, tipY, 1, COLOR.debugBullet);
    }

    renderer.unclip();
  }
}
