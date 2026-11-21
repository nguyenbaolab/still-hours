import type { Rect } from "../core/math";
import type { AimedEvent, BulletEvent, BurstEvent, Side, StraightEvent, SweepEvent } from "../data/pattern-types";
import type { BulletFeel } from "../data/rhythm-feel";
import type { BulletWorld } from "./bullets";

/**
 * Mỗi LOẠI đạn là một handler: nó biết cách báo trước (`warn`) và sinh đạn (`spawn`) từ dữ liệu sự kiện.
 * Thêm loại đạn mới = khai báo kiểu trong data/pattern-types.ts + thêm một handler vào `HANDLERS` ở cuối file này;
 * bộ chạy pattern (pattern-runner.ts) không phải sửa.
 */

export interface SpawnContext {
  readonly arena: Rect;
  readonly world: BulletWorld;
  readonly feel: BulletFeel;
  /** Tâm người chơi ở tick hiện tại. Bộ chạy pattern cập nhật trước mỗi lần gọi handler. */
  playerX: number;
  playerY: number;
}

export interface EventHandler<E extends BulletEvent> {
  /** Sự kiện này có BẮT BUỘC cảnh báo không (đạn lớn hoặc nguy hiểm). */
  needsTelegraph(event: E, feel: BulletFeel): boolean;
  /**
   * Tạo hình cảnh báo nhấp nháy từ `warnTime` tới `fireTime` (giây, theo đồng hồ nhịp).
   * Nếu đạn nhắm vào người chơi, KHÓA hướng nhắm lúc này và trả về (rad) để người chơi có thời gian né; ngược lại trả null.
   */
  warn(ctx: SpawnContext, event: E, warnTime: number, fireTime: number): number | null;
  /** Sinh đạn thật. `lockedAim` là hướng đã khóa lúc cảnh báo (null nếu không có cảnh báo: nhắm ngay bây giờ). */
  spawn(ctx: SpawnContext, event: E, lockedAim: number | null, fireTime: number, fireBeat: number): void;
}

const DEG = Math.PI / 180;
/** Bề dày dải đánh dấu ở mép khung (px). */
const EDGE_MARK = 8;
/** Đạn xuất hiện cách mép khung bấy nhiêu px (ngoài bán kính) để lúc đầu nằm hẳn ngoài khung. */
const SPAWN_MARGIN = 4;
/** Độ dài đường ngắm cảnh báo (px): đủ dài để vượt qua khung, phần thừa bị cắt. */
const AIM_LINE = 520;
const BURST_RING_RADIUS = 12;

const degToRad = (degrees: number): number => degrees * DEG;

interface EdgePoint {
  x: number;
  y: number;
  /** Hướng đi vào trong khung (rad). */
  inward: number;
}

/** Điểm trên cạnh `from` ở vị trí `at` (0..1), lùi ra ngoài khung `offset` px. */
function edgePoint(arena: Rect, from: Side, at: number, offset: number): EdgePoint {
  switch (from) {
    case "left":
      return { x: arena.x - offset, y: arena.y + at * arena.h, inward: 0 };
    case "right":
      return { x: arena.x + arena.w + offset, y: arena.y + at * arena.h, inward: Math.PI };
    case "top":
      return { x: arena.x + at * arena.w, y: arena.y - offset, inward: Math.PI / 2 };
    case "bottom":
      return { x: arena.x + at * arena.w, y: arena.y + arena.h + offset, inward: -Math.PI / 2 };
  }
}

/** Dải đánh dấu nằm sát mép trong của khung, ngay chỗ đạn sẽ chui ra. */
function addEdgeMark(ctx: SpawnContext, from: Side, at: number, radius: number, warnTime: number, fireTime: number): void {
  const { arena, world } = ctx;
  const p = edgePoint(arena, from, at, 0);
  switch (from) {
    case "left":
      world.addTelegraph("box", arena.x, p.y - radius, EDGE_MARK, 2 * radius, false, warnTime, fireTime);
      break;
    case "right":
      world.addTelegraph("box", arena.x + arena.w - EDGE_MARK, p.y - radius, EDGE_MARK, 2 * radius, false, warnTime, fireTime);
      break;
    case "top":
      world.addTelegraph("box", p.x - radius, arena.y, 2 * radius, EDGE_MARK, false, warnTime, fireTime);
      break;
    case "bottom":
      world.addTelegraph("box", p.x - radius, arena.y + arena.h - EDGE_MARK, 2 * radius, EDGE_MARK, false, warnTime, fireTime);
      break;
  }
}

const straight: EventHandler<StraightEvent> = {
  needsTelegraph: (event, feel) => (event.radius ?? feel.radius) >= feel.bigRadius,

  warn(ctx, event, warnTime, fireTime) {
    const radius = event.radius ?? ctx.feel.radius;
    const spacing = event.spacing ?? 0.2;
    for (let i = 0; i < (event.count ?? 1); i++) {
      addEdgeMark(ctx, event.from, event.at + i * spacing, radius, warnTime, fireTime);
    }
    return null;
  },

  spawn(ctx, event, _aim, fireTime) {
    const radius = event.radius ?? ctx.feel.radius;
    const spacing = event.spacing ?? 0.2;
    for (let i = 0; i < (event.count ?? 1); i++) {
      const p = edgePoint(ctx.arena, event.from, event.at + i * spacing, radius + SPAWN_MARGIN);
      ctx.world.spawnDot(p.x, p.y, p.inward, event.speed ?? ctx.feel.speed, radius, event.damage ?? ctx.feel.damage, fireTime);
    }
  },
};

const aimed: EventHandler<AimedEvent> = {
  needsTelegraph: (event, feel) => (event.radius ?? feel.radius) >= feel.bigRadius,

  warn(ctx, event, warnTime, fireTime) {
    const radius = event.radius ?? ctx.feel.radius;
    const origin = edgePoint(ctx.arena, event.from, event.at, radius + SPAWN_MARGIN);
    const aim = Math.atan2(ctx.playerY - origin.y, ctx.playerX - origin.x);

    addEdgeMark(ctx, event.from, event.at, radius, warnTime, fireTime);
    for (const angle of fanAngles(aim, event)) {
      ctx.world.addTelegraph(
        "line",
        origin.x,
        origin.y,
        origin.x + Math.cos(angle) * AIM_LINE,
        origin.y + Math.sin(angle) * AIM_LINE,
        true,
        warnTime,
        fireTime,
      );
    }
    return aim;
  },

  spawn(ctx, event, lockedAim, fireTime) {
    const radius = event.radius ?? ctx.feel.radius;
    const origin = edgePoint(ctx.arena, event.from, event.at, radius + SPAWN_MARGIN);
    const aim = lockedAim ?? Math.atan2(ctx.playerY - origin.y, ctx.playerX - origin.x);
    for (const angle of fanAngles(aim, event)) {
      ctx.world.spawnDot(origin.x, origin.y, angle, event.speed ?? ctx.feel.speed, radius, event.damage ?? ctx.feel.damage, fireTime);
    }
  },
};

/** Các hướng của một quạt `count` viên, cách nhau `spreadDeg`, đối xứng quanh `center`. */
function fanAngles(center: number, event: AimedEvent): number[] {
  const count = event.count ?? 1;
  const spread = degToRad(event.spreadDeg ?? 15);
  return Array.from({ length: count }, (_, i) => center + (i - (count - 1) / 2) * spread);
}

const FULL_CIRCLE = Math.PI * 2;

/** Hướng của từng viên trong vụ tỏa: vòng tròn đều, hoặc quạt có hai viên ngoài cùng nằm ở rìa cung. */
function burstAngles(center: number, event: BurstEvent): number[] {
  const arc = degToRad(event.arcDeg ?? 360);
  if (arc >= FULL_CIRCLE - 1e-9) {
    return Array.from({ length: event.count }, (_, i) => center + (i * FULL_CIRCLE) / event.count);
  }
  if (event.count === 1) return [center];
  return Array.from({ length: event.count }, (_, i) => center - arc / 2 + (i * arc) / (event.count - 1));
}

function burstOrigin(ctx: SpawnContext, event: BurstEvent): { x: number; y: number } {
  return { x: ctx.arena.x + event.x * ctx.arena.w, y: ctx.arena.y + event.y * ctx.arena.h };
}

const burst: EventHandler<BurstEvent> = {
  needsTelegraph: () => true,

  warn(ctx, event, warnTime, fireTime) {
    const { x, y } = burstOrigin(ctx, event);
    const center = event.aimed ? Math.atan2(ctx.playerY - y, ctx.playerX - x) : degToRad(event.angleDeg ?? 0);

    ctx.world.addTelegraph("ring", x, y, BURST_RING_RADIUS, 0, false, warnTime, fireTime);
    if (degToRad(event.arcDeg ?? 360) < FULL_CIRCLE - 1e-9) {
      // Quạt: vạch hai rìa của cung để người chơi thấy hướng bắn.
      const angles = burstAngles(center, event);
      for (const angle of [angles[0], angles[angles.length - 1]]) {
        if (angle === undefined) continue;
        ctx.world.addTelegraph("line", x, y, x + Math.cos(angle) * AIM_LINE, y + Math.sin(angle) * AIM_LINE, true, warnTime, fireTime);
      }
    }
    return event.aimed ? center : null;
  },

  spawn(ctx, event, lockedAim, fireTime) {
    const { x, y } = burstOrigin(ctx, event);
    const center = event.aimed
      ? (lockedAim ?? Math.atan2(ctx.playerY - y, ctx.playerX - x))
      : degToRad(event.angleDeg ?? 0);
    for (const angle of burstAngles(center, event)) {
      ctx.world.spawnDot(x, y, angle, event.speed ?? ctx.feel.speed, event.radius ?? ctx.feel.radius, event.damage ?? ctx.feel.damage, fireTime);
    }
  },
};

const sweepOrigin = (ctx: SpawnContext, event: SweepEvent): { x: number; y: number } => ({
  x: ctx.arena.x + event.x * ctx.arena.w,
  y: ctx.arena.y + event.y * ctx.arena.h,
});

const sweep: EventHandler<SweepEvent> = {
  needsTelegraph: () => true,

  warn(ctx, event, warnTime, fireTime) {
    const { x, y } = sweepOrigin(ctx, event);
    const hands = event.hands ?? 1;
    ctx.world.addTelegraph("ring", x, y, 6, 0, false, warnTime, fireTime);
    for (let i = 0; i < hands; i++) {
      const angle = degToRad(event.startAngleDeg) + (i * FULL_CIRCLE) / hands;
      ctx.world.addTelegraph("line", x, y, x + Math.cos(angle) * event.length, y + Math.sin(angle) * event.length, true, warnTime, fireTime);
    }
    return null;
  },

  spawn(ctx, event, _aim, _fireTime, fireBeat) {
    const { x, y } = sweepOrigin(ctx, event);
    const hands = event.hands ?? 1;
    for (let i = 0; i < hands; i++) {
      ctx.world.spawnHand(
        x,
        y,
        degToRad(event.startAngleDeg) + (i * FULL_CIRCLE) / hands,
        degToRad(event.degreesPerBeat),
        event.length,
        event.damage ?? ctx.feel.damage,
        fireBeat,
        event.durationBeats,
      );
    }
  },
};

const HANDLERS: { [K in BulletEvent["type"]]: EventHandler<Extract<BulletEvent, { type: K }>> } = {
  straight,
  aimed,
  burst,
  sweep,
};

/** Handler của một sự kiện đạn, theo `event.type`. */
export function handlerFor(event: BulletEvent): EventHandler<BulletEvent> {
  // TypeScript không tự suy ra được tương ứng giữa `type` và handler khi `event` là union; bảng HANDLERS đã đảm bảo.
  return HANDLERS[event.type] as unknown as EventHandler<BulletEvent>;
}
