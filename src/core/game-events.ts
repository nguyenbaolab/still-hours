/**
 * HỆ THỐNG SỰ KIỆN CỦA TRẬN. Chỉ PHÁT sự kiện; không có giao diện hay nhân vật nào ở đây. Task sau (nhân vật hướng
 * dẫn) đăng ký nghe qua `gameEvents.on(...)`. Mô tả đầy đủ: `docs/events.md`.
 *
 * - Tên sự kiện là hằng số (`GAME_EVENTS`) và union type (`GameEventName`), payload có kiểu theo từng tên (`GameEventMap`).
 * - `on` trả về hàm hủy nghe; `off` hủy theo (tên, handler); `once` nghe một lần.
 * - Một handler ném lỗi không làm hỏng game và không chặn các handler khác (lỗi được `console.error`).
 * - Phát sự kiện không bao giờ đổi trạng thái game: nghe hay không nghe thì game chạy y hệt.
 */

import type { ResidentId } from "../data/residents/types";

/** Tên sự kiện cố định. */
export const GAME_EVENTS = {
  /** Ghi điểm: tháo đúng một bộ phận, hoặc qua một mốc tiến độ của pha né. */
  score: "score",
  /** Làm sai: bị đạn trúng ở pha né, hoặc bấm sai ở pha tháo (lệch nhịp, bấm bộ phận còn bị chặn). */
  mistake: "mistake",
  /** Gần thắng: pha hiện tại đã đi được ≥ `HUD_FEEL.nearWinFraction`. Mỗi lần chơi một pha chỉ phát một lần. */
  nearWin: "nearWin",
  /** Kẹt lâu: thua nhiều lần cùng một lượt né, hoặc không tiến bộ gì lâu ở pha tháo. */
  stuck: "stuck",
  /** Qua màn: xong pha né của một lượt (có sao), và xong cả trận với một cư dân. */
  clear: "clear",
} as const;

export type GameEventName = (typeof GAME_EVENTS)[keyof typeof GAME_EVENTS];

/** Đang ở pha nào của trận. */
export type BattlePhaseKind = "dodge" | "disassemble";

/** Chỗ trong trận mà sự kiện xảy ra. `resident` là null khi pha chạy ngoài `BattleScene` (test, pattern thử). */
export interface BattlePlace {
  resident: ResidentId | null;
  /** Lượt 1..3. */
  round: number;
  phase: BattlePhaseKind;
}

export interface ScoreEvent extends BattlePlace {
  /** `part`: tháo xong một bộ phận. `milestone`: pha né qua một mốc tiến độ (mỗi 25%). */
  reason: "part" | "milestone";
  /** Điểm của lần ghi này (`HUD_FEEL.points`). */
  points: number;
  /** Tổng điểm của trận này tính tới lúc đó (đặt lại về 0 khi bắt đầu trận với cư dân mới). */
  total: number;
  /** `part`: id bộ phận. `milestone`: mốc 0..1 vừa qua (0.25, 0.5, 0.75). */
  detail: string | number;
}

export interface MistakeEvent extends BattlePlace {
  /** `hit`: trúng đạn. `off-beat`: bấm lệch nhịp. `blocked`: bấm bộ phận còn bị chặn. */
  kind: "hit" | "off-beat" | "blocked";
  /** Chỉ `hit`: máu vừa mất và máu còn lại. */
  damage?: number;
  hp?: number;
  maxHp?: number;
}

export interface NearWinEvent extends BattlePlace {
  /** Tiến độ lúc phát, 0..1. */
  progress: number;
  /** Chỉ pha né: máu còn lại. */
  hp?: number;
  maxHp?: number;
}

export interface StuckEvent extends BattlePlace {
  /** `losses`: thua liên tiếp nhiều lần ở cùng một lượt né. `idle`: pha tháo không tiến bộ gì lâu. */
  reason: "losses" | "idle";
  /** `losses`: số lần thua của lượt này. `idle`: số giây nghe được không tiến bộ. */
  amount: number;
  /** Chỉ `idle`: bộ phận đang chọn lúc đó. */
  partId?: string;
}

export interface ClearEvent {
  resident: ResidentId | null;
  /** `round`: vừa thắng pha né của lượt `round`. `battle`: vừa xong cả trận. */
  scope: "round" | "battle";
  /** Lượt 1..3 (với `battle` là lượt cuối, 3). */
  round: number;
  /** `round`: sao của lượt này (1..3). `battle`: tổng sao của ba lượt (3..9). */
  stars: number;
  /** `round`: máu còn lại lúc thắng. `battle`: không có. */
  hp?: number;
  maxHp?: number;
  /** Chỉ `battle`: sao từng lượt, và tổng điểm của trận. */
  starsByRound?: readonly number[];
  score?: number;
}

export interface GameEventMap {
  score: ScoreEvent;
  mistake: MistakeEvent;
  nearWin: NearWinEvent;
  stuck: StuckEvent;
  clear: ClearEvent;
}

export type GameEventHandler<N extends GameEventName> = (event: GameEventMap[N]) => void;

/** Tên có trong `GAME_EVENTS` hay không (để kiểm tên đến từ nguồn ngoài, ví dụ cấu hình). */
export function isGameEventName(name: string): name is GameEventName {
  return (Object.values(GAME_EVENTS) as string[]).includes(name);
}

/**
 * Bộ phát sự kiện có kiểu. Có thể tạo nhiều bản (test, hoặc một trận riêng); game dùng `gameEvents` dùng chung.
 */
export class GameEvents {
  private readonly handlers = new Map<GameEventName, Set<GameEventHandler<GameEventName>>>();

  /** Nghe sự kiện `name`. Trả về hàm hủy nghe (gọi lần hai không sao). Cùng một handler đăng ký hai lần chỉ nghe một lần. */
  on<N extends GameEventName>(name: N, handler: GameEventHandler<N>): () => void {
    let set = this.handlers.get(name);
    if (!set) {
      set = new Set();
      this.handlers.set(name, set);
    }
    set.add(handler as GameEventHandler<GameEventName>);
    return () => this.off(name, handler);
  }

  /** Nghe đúng một lần rồi tự hủy. Trả về hàm hủy nghe (dùng được trước khi sự kiện tới). */
  once<N extends GameEventName>(name: N, handler: GameEventHandler<N>): () => void {
    const unsubscribe = this.on(name, (event) => {
      unsubscribe();
      handler(event);
    });
    return unsubscribe;
  }

  /** Hủy nghe. Không có handler đó thì không làm gì. */
  off<N extends GameEventName>(name: N, handler: GameEventHandler<N>): void {
    const set = this.handlers.get(name);
    if (!set) return;
    set.delete(handler as GameEventHandler<GameEventName>);
    if (set.size === 0) this.handlers.delete(name);
  }

  /**
   * Phát sự kiện tới mọi handler đang nghe, theo thứ tự đăng ký. Handler đăng ký hoặc hủy trong lúc phát chỉ có tác dụng
   * từ lần phát sau. Handler ném lỗi thì ghi lỗi và đi tiếp.
   */
  emit<N extends GameEventName>(name: N, event: GameEventMap[N]): void {
    const set = this.handlers.get(name);
    if (!set || set.size === 0) return;
    for (const handler of [...set]) {
      try {
        handler(event);
      } catch (error) {
        console.error(`[game-events] handler của "${name}" ném lỗi`, error);
      }
    }
  }

  /** Số handler đang nghe `name` (hoặc tổng mọi tên nếu bỏ trống). */
  listenerCount(name?: GameEventName): number {
    if (name) return this.handlers.get(name)?.size ?? 0;
    let total = 0;
    for (const set of this.handlers.values()) total += set.size;
    return total;
  }

  /** Hủy mọi handler (của một tên, hoặc tất cả). */
  clear(name?: GameEventName): void {
    if (name) this.handlers.delete(name);
    else this.handlers.clear();
  }
}

/** Bộ phát dùng chung của game. Các pha và `BattleScene` phát vào đây trừ khi được truyền bộ khác. */
export const gameEvents = new GameEvents();
