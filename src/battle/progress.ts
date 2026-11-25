/**
 * Logic thuần của tiến độ, sao, mốc và gợi ý. Không vẽ (xem `progress-hud.ts`), không phát sự kiện, không đọc đồng hồ:
 * mọi hàm nhận số vào và trả số ra, nên test được bằng số.
 */

import { gameEvents, type GameEvents } from "../core/game-events";
import type { PlayerFeel } from "../data/feel";
import type { ResidentId } from "../data/residents/types";
import { stageOf } from "./mechanism";
import { DRAW_FEEL } from "../data/sketch-feel";
import { HINTS, HUD_FEEL, type HudFeel } from "../data/hud-feel";
import type { Mechanism, Part } from "../data/mechanisms/types";
import type { Pattern } from "../data/pattern-types";

function clamp01(value: number): number {
  if (!(value > 0)) return 0;
  return value > 1 ? 1 : value;
}

/**
 * Tiến độ pha né, 0..1: "còn bao xa thì thắng".
 * - `length`: beat nghe được / `lengthBeats` (nhịp chậm lại thì beat đi chậm theo, thanh cũng đi chậm theo).
 * - `page`: số beat đã vẽ / `drawBeats`, hoặc beat / (`DRAW_FEEL.maxLoops` × `lengthBeats`), cái nào xa hơn, vì trang khép khi
 *   một trong hai tới.
 * - `exit`: số vòng đã qua (kể cả các lần thua trước) tính theo beat / số vòng khe cửa mở hẳn (`widths.length`).
 *   Bước ra sớm hơn khi khe đã mở thì pha thắng sớm hơn thanh.
 */
export function dodgeProgress(
  pattern: Pattern,
  beat: number,
  drawnBeats = 0,
  carriedLoops = 0,
  maxLoops: number = DRAW_FEEL.maxLoops,
): number {
  const length = pattern.lengthBeats;
  if (!(length > 0)) return 0;
  const now = Math.max(0, beat);
  const finish = pattern.finish;
  if (finish?.kind === "page") {
    const byPage = finish.drawBeats > 0 ? drawnBeats / finish.drawBeats : 1;
    const byTime = now / (maxLoops * length);
    return clamp01(Math.max(byPage, byTime));
  }
  if (finish?.kind === "exit") {
    const loops = Math.max(1, finish.widths.length);
    return clamp01((carriedLoops * length + now) / (loops * length));
  }
  return clamp01(now / length);
}

/** Sao theo máu còn lại lúc thắng: 1..3. */
export function starsFor(hp: number, maxHp: number, feel: HudFeel = HUD_FEEL): 1 | 2 | 3 {
  if (!(maxHp > 0)) return 1;
  const fraction = hp / maxHp;
  if (fraction >= feel.stars.three) return 3;
  if (fraction >= feel.stars.two) return 2;
  return 1;
}

/** Các mốc trong `milestones` mà tiến độ vừa vượt qua khi đi từ `from` tới `to` (mốc ≤ `to` và > `from`), theo thứ tự tăng. */
export function crossedMilestones(from: number, to: number, milestones: readonly number[] = HUD_FEEL.milestones): number[] {
  return milestones.filter((mark) => mark > from && mark <= to).sort((a, b) => a - b);
}

/** Loại gợi ý riêng của một pattern: đứng yên, khe cửa, chữ, hoặc thường. */
export type DodgeHintKind = "still" | "exit" | "word" | "plain";

/** Loại gợi ý của pattern; null với pha có bút (Linh), không có gợi ý chữ. */
export function dodgeHintKind(pattern: Pattern): DodgeHintKind | null {
  if (pattern.pencil) return null;
  if (pattern.finish?.kind === "exit") return "exit";
  if (pattern.still) return "still";
  if (pattern.events.some((event) => event.type === "word")) return "word";
  return "plain";
}

/**
 * Gợi ý hiện ở pha né sau khi thua `losses` lần ở lượt này. Chưa đủ `hintAfterLosses` thì không có.
 * Đủ thì một dòng riêng theo loại pha; từ `generalHintAfterLosses` thì thêm dòng chung (Shift).
 * Pha có bút (Linh) không có gợi ý chữ nào (cả dòng chung): CLAUDE.md đòi không chữ hướng dẫn ở đó; sự kiện `stuck` vẫn phát
 * và nhân vật hướng dẫn (đợt sau) là bên nói.
 */
export function dodgeHints(pattern: Pattern, losses: number, feel: HudFeel = HUD_FEEL): string[] {
  if (losses < feel.hintAfterLosses || pattern.pencil) return [];
  const kind = dodgeHintKind(pattern);
  if (!kind) return [];
  const lines: string[] = [HINTS.dodge[kind]];
  if (losses >= feel.generalHintAfterLosses) lines.push(HINTS.dodgeGeneral);
  return lines;
}

/** Bộ phận đang bị chặn bởi bộ phận chưa tháo. */
export function isBlocked(part: Part, removed: ReadonlySet<string>): boolean {
  return part.blockedBy.some((id) => !removed.has(id));
}

/** Gợi ý ở pha tháo khi lâu không tiến bộ, theo bộ phận đang chọn. Không có bộ phận thì gợi ý chọn bằng mũi tên. */
export function disassembleHint(part: Part | undefined, removed: ReadonlySet<string>, rhythmic: boolean): string {
  const text = HINTS.disassemble;
  if (!part) return text.move;
  if (isBlocked(part, removed)) return text.blocked;
  if (part.operation === "lift") return text.lift;
  if (part.operation === "unscrew") return rhythmic ? text.unscrewRhythmic : text.unscrew;
  return rhythmic ? text.unhookRhythmic : text.unhook;
}

/** Số bộ phận của tầng `stage` (chỉ tầng đó) và số đã tháo. */
export function stageCounts(mechanism: Mechanism, removed: ReadonlySet<string>, stage: number): { total: number; done: number } {
  let total = 0;
  let done = 0;
  for (const part of mechanism.parts) {
    if (stageOf(part) !== stage) continue;
    total++;
    if (removed.has(part.id)) done++;
  }
  return { total, done };
}

/**
 * Tiến độ pha tháo của một tầng, 0..1: bộ phận đã tháo / tổng, cộng phần lẻ của thao tác đang làm (`partial`, 0..1).
 * Tầng không có bộ phận thì coi là xong.
 */
export function disassembleProgress(total: number, done: number, partial = 0): number {
  if (!(total > 0)) return 1;
  return clamp01((done + clamp01(partial)) / total);
}

/** Tổng điểm của một trận (xem `HUD_FEEL.points`). Một bản cho cả trận, dùng chung giữa các pha. */
export class ScoreBoard {
  total = 0;

  add(points: number): number {
    this.total += points;
    return this.total;
  }
}

/**
 * Những gì một pha cần biết về trận chứa nó, để phát sự kiện và vẽ HUD. `BattleScene` dựng một bản cho mỗi pha;
 * pha chạy riêng (test, pattern thử) dùng `soloContext`.
 */
export interface RoundContext {
  /** Cư dân của trận; null khi chạy ngoài `BattleScene`. */
  resident: ResidentId | null;
  /** Lượt 1..`rounds` (với pha tháo, là tầng). */
  round: number;
  rounds: number;
  /** Sao các lượt đã xong (theo thứ tự lượt). */
  stars: readonly number[];
  /** Số lần đã thua ở lượt né này (pha tháo: 0). */
  losses: number;
  /** Máu tối đa của người chơi ở pha né (bỏ trống = `PLAYER_FEEL.maxHp`). */
  maxHp?: number;
  /** Ghi đè cảm giác của người chơi ở pha né (hitbox, thời gian bất tử...) theo cư dân; bỏ trống = `PLAYER_FEEL`. */
  player?: Partial<PlayerFeel>;
  score: ScoreBoard;
  events: GameEvents;
}

/** Ngữ cảnh khi pha chạy riêng lẻ: không có cư dân, một lượt, dùng bộ phát dùng chung. */
export function soloContext(partial: Partial<RoundContext> = {}): RoundContext {
  return { resident: null, round: 1, rounds: 3, stars: [], losses: 0, score: new ScoreBoard(), events: gameEvents, ...partial };
}
