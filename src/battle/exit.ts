import type { Rect } from "../core/math";
import type { ExitFinish, Side } from "../data/pattern-types";

/**
 * Khe cửa của boss (CLAUDE.md, "Boss"). Khe mở trên một cạnh khung ở những beat nhất định của mỗi vòng, rộng dần theo số
 * vòng đã qua, và bánh răng ra khỏi viền ngoài qua khe thì thắng. Mọi thứ ở đây là hàm thuần theo BEAT, không theo tick.
 */

/** Một khe đang mở: cạnh, và đoạn dọc cạnh (px, toạ độ màn hình) mà bánh răng có thể lách qua. */
export interface Door {
  side: Side;
  from: number;
  to: number;
}

export interface ExitView {
  /** Khe đang mở ở beat này. */
  open: boolean;
  /** 1 beat trước khi mở: đoạn viền ở khe nhấp nháy (cảnh báo công bằng). */
  warn: boolean;
  /** Số vòng đã qua (cộng phần mang từ các lần thua) mà beat này đang ở. */
  loop: number;
  /** Khe (null khi không mở), và khe sẽ mở dù lúc này đang đóng (để vẽ cảnh báo). */
  door: Door | null;
  nextDoor: Door;
}

/** Số beat báo trước khi khe mở. */
export const EXIT_WARN_BEATS = 1;

/** Khe đặt trên `arena` với độ rộng `width` px, tâm ở `rule.at`. */
export function doorFor(rule: ExitFinish, arena: Rect, width: number): Door {
  const horizontal = rule.side === "top" || rule.side === "bottom";
  const origin = horizontal ? arena.x : arena.y;
  const span = horizontal ? arena.w : arena.h;
  const center = origin + rule.at * span;
  const from = Math.max(origin, center - width / 2);
  const to = Math.min(origin + span, center + width / 2);
  return { side: rule.side, from, to };
}

/**
 * Trạng thái khe ở `beat` của một pha có vòng dài `lengthBeats`. `carriedLoops`: số vòng đã qua từ những lần thua trước
 * (không đặt lại khi thua). Beat âm (dạo đầu) thì khe đóng.
 */
export function exitView(rule: ExitFinish, lengthBeats: number, beat: number, carriedLoops: number, arena: Rect): ExitView {
  const cycle = beat < 0 ? 0 : Math.floor(beat / lengthBeats);
  const inLoop = beat < 0 ? -1 : beat - cycle * lengthBeats;
  const loop = carriedLoops + cycle;
  const index = (list: readonly number[]): number => list[Math.min(loop, list.length - 1)] ?? 0;
  const width = index(rule.widths);
  const duration = index(rule.openBeats);
  // Từ vòng thứ `widths.length + 1` trở đi, khe mở ngay từ beat 0.
  const start = loop >= rule.widths.length ? 0 : rule.openBeat;
  const nextDoor = doorFor(rule, arena, width);
  const open = inLoop >= start && inLoop < start + duration;
  const warn = !open && start > 0 && inLoop >= start - EXIT_WARN_BEATS && inLoop < start;
  return { open, warn, loop, door: open ? nextDoor : null, nextDoor };
}

/** Tâm bánh răng đã ra khỏi viền ngoài của khung qua cạnh `side`. */
export function hasExited(x: number, y: number, arena: Rect, side: Side): boolean {
  if (side === "right") return x > arena.x + arena.w;
  if (side === "left") return x < arena.x;
  if (side === "bottom") return y > arena.y + arena.h;
  return y < arena.y;
}