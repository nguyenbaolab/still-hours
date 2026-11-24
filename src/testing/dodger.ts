/**
 * Bot né đạn có nhìn thấy cảnh báo (không vào bản build). Mỗi vài tick, thử 9 hướng đi (8 hướng của bàn phím + đứng yên), mô phỏng
 * thân bánh răng đi thẳng theo hướng đó trong ~0,56 giây và đạn bay theo đúng quỹ đạo của chúng, chọn hướng ít nguy
 * hiểm nhất. Đạn chấm và đạn xao nhãng đi thẳng theo vận tốc; kim quay theo beat; vùng cảnh báo (hộp, vòng, đường
 * ngắm) cũng bị tránh. Chữ không trừ máu nên bỏ qua. Có một mục tiêu (tùy chọn) chỉ để phá thế hòa, không lấn nguy hiểm.
 *
 * Không có phản xạ hoàn hảo hay biết trước tương lai: bot chỉ thấy những gì người chơi thấy tại tick đó. Nó vẫn mạnh hơn
 * người chơi thật ở chỗ tính chính xác quỹ đạo, nên số lần thua của bot là cận dưới của người thật.
 */
import type { Input } from "../core/input";
import type { Rect } from "../core/math";
import type { BulletWorld } from "../battle/bullets";
import { steer } from "./bots";

export interface DodgerView {
  x: number;
  y: number;
}

export interface DodgerContext {
  arena: Rect;
  /** Beat mỗi giây ở lúc này (để quay kim). */
  beatsPerSecond: number;
  /** Nửa cạnh hitbox của bánh răng (px). */
  hitHalf: number;
  /** px mỗi giây khi đi hết tốc. */
  speed: number;
  /** Mục tiêu muốn tới (phá thế hòa). */
  goal?: { x: number; y: number } | null;
  /** Coi đạn xao nhãng là nguy hiểm (khi đang cầm bút). */
  avoidDistractions?: boolean;
  /** Trọng số kéo về mục tiêu mỗi px (mặc định 0,12). */
  goalWeight?: number;
  /** Cho phép đi ra ngoài khung (đang ra khe cửa): không kẹp vị trí mô phỏng. */
  free?: boolean;
}

const HORIZON_STEPS = 7;
const STEP_SECONDS = 0.08;
const MARGIN = 6;
const DECIDE_EVERY = 2;

function distanceToSegment(px: number, py: number, ax: number, ay: number, bx: number, by: number): number {
  const dx = bx - ax;
  const dy = by - ay;
  const lengthSq = dx * dx + dy * dy;
  const t = lengthSq === 0 ? 0 : Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / lengthSq));
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}

export class DodgerBot {
  private direction: { x: number; y: number } | null = null;
  private ticks = 0;
  /** Số lần quyết định, để test kiểm bot có hoạt động. */
  decisions = 0;

  constructor(private readonly input: Input) {}

  act(player: DodgerView, world: BulletWorld, ctx: DodgerContext): void {
    if (this.direction === null || this.ticks++ % DECIDE_EVERY === 0) {
      this.direction = this.decide(player, world, ctx);
      this.decisions++;
    }
    steer(this.input, this.direction.x, this.direction.y, 0.001);
  }

  private decide(player: DodgerView, world: BulletWorld, ctx: DodgerContext): { x: number; y: number } {
    let best = { x: 0, y: 0 };
    let bestScore = Infinity;
    const candidates: { x: number; y: number }[] = [{ x: 0, y: 0 }];
    // Input là bàn phím (8 hướng, chéo được chuẩn hóa như `Player.update`), nên chỉ thử đúng 8 hướng đó.
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2;
      const x = Math.round(Math.cos(angle));
      const y = Math.round(Math.sin(angle));
      const length = Math.hypot(x, y);
      candidates.push({ x: x / length, y: y / length });
    }
    for (const dir of candidates) {
      const score = this.score(player, world, ctx, dir);
      if (score < bestScore - 1e-9) {
        bestScore = score;
        best = dir;
      }
    }
    return best;
  }

  private score(player: DodgerView, world: BulletWorld, ctx: DodgerContext, dir: { x: number; y: number }): number {
    const { arena, hitHalf } = ctx;
    const stepPx = ctx.speed * STEP_SECONDS;
    let danger = 0;
    let px = player.x;
    let py = player.y;
    for (let k = 1; k <= HORIZON_STEPS; k++) {
      px += dir.x * stepPx;
      py += dir.y * stepPx;
      if (!ctx.free) {
        px = Math.max(arena.x + hitHalf, Math.min(arena.x + arena.w - hitHalf, px));
        py = Math.max(arena.y + hitHalf, Math.min(arena.y + arena.h - hitHalf, py));
      }
      const t = k * STEP_SECONDS;
      for (let i = 0; i < world.dots.size; i++) {
        const dot = world.dots.at(i);
        if (!(dot.damage > 0)) continue;
        const d = Math.hypot(px - (dot.x + dot.vx * t), py - (dot.y + dot.vy * t));
        danger += this.penalty(d, dot.radius + hitHalf);
      }
      for (let i = 0; i < world.hands.size; i++) {
        const hand = world.hands.at(i);
        if (!(hand.damage > 0)) continue;
        const angle = hand.angle + hand.angularVelocity * ctx.beatsPerSecond * t;
        const ex = hand.cx + Math.cos(angle) * hand.length;
        const ey = hand.cy + Math.sin(angle) * hand.length;
        danger += this.penalty(distanceToSegment(px, py, hand.cx, hand.cy, ex, ey), hand.thickness / 2 + hitHalf);
      }
      if (ctx.avoidDistractions) {
        for (let i = 0; i < world.distractions.size; i++) {
          const item = world.distractions.at(i);
          const d = Math.hypot(px - (item.x + item.vx * t), py - (item.y + item.vy * t));
          danger += 0.3 * this.penalty(d, item.radius + hitHalf);
        }
      }
    }
    // Vùng cảnh báo: chỉ tính ở cuối quãng mô phỏng.
    for (let i = 0; i < world.telegraphs.size; i++) {
      const tg = world.telegraphs.at(i);
      if (tg.shape === "box") {
        if (px > tg.x - hitHalf && px < tg.x + tg.w + hitHalf && py > tg.y - hitHalf && py < tg.y + tg.h + hitHalf) danger += 40;
      } else if (tg.shape === "ring") {
        const d = Math.hypot(px - tg.x, py - tg.y);
        if (d < tg.w + hitHalf) danger += 40;
      } else {
        const d = distanceToSegment(px, py, tg.x, tg.y, tg.w, tg.h);
        if (d < hitHalf + 6) danger += 25;
      }
    }
    const goal = ctx.goal ?? { x: arena.x + arena.w / 2, y: arena.y + arena.h / 2 };
    const pull = ctx.goal ? (ctx.goalWeight ?? 0.12) : 0.03;
    return danger + pull * Math.hypot(px - goal.x, py - goal.y);
  }

  private penalty(distance: number, hitRadius: number): number {
    const safe = hitRadius + MARGIN;
    if (distance >= safe) return 0;
    const over = safe - distance;
    return over * over + (distance < hitRadius ? 400 : 0);
  }
}