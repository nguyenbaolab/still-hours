import type { TempoMap } from "../core/tempo-map";
import type { DisassemblyFeel } from "../data/disassembly-feel";
import type { Mechanism, Part } from "../data/mechanisms/types";

export type Direction = "up" | "down" | "left" | "right";

const DIRECTION: Record<Direction, { x: number; y: number }> = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
};

export type WorkCue = "unscrew" | "lift" | "unhook" | "clack";

export interface WorkResult {
  cue: WorkCue | null;
  /** Id vừa tháo xong, nếu lần này tháo xong. */
  removedId: string | null;
  /** Id các bộ phận chặn vừa được chỉ ra. */
  flashed: readonly string[];
}

const QUIET: WorkResult = { cue: null, removedId: null, flashed: [] };

/**
 * Kiểm cỗ máy. Trả về danh sách lỗi (tiếng Việt), rỗng nếu dùng được.
 * Bắt id chặn không có, id trùng, vòng lặp, không đúng một core, và đường tới core bị kẹt.
 */
export function validateMechanism(mechanism: Mechanism): string[] {
  const problems: string[] = [];
  const fail = (message: string): void => {
    problems.push(`${mechanism.name}: ${message}`);
  };
  const seen = new Set<string>();
  for (const part of mechanism.parts) {
    if (seen.has(part.id)) fail(`id "${part.id}" trùng`);
    seen.add(part.id);
  }
  for (const part of mechanism.parts) {
    for (const blocker of part.blockedBy) {
      if (!seen.has(blocker)) fail(`"${part.id}" bị chặn bởi "${blocker}" không có trong máy`);
    }
  }

  if (hasCycle(mechanism.parts)) fail("có vòng lặp");

  const cores = mechanism.parts.filter((part) => part.core).length;
  if (cores === 0) fail("thiếu core");
  else if (cores !== 1) fail("không đúng một core");

  if (!canReachCore(mechanism.parts)) fail("không có thứ tự tháo tới core");
  return problems;
}

function hasCycle(parts: readonly Part[]): boolean {
  const known = new Set(parts.map((part) => part.id));
  const blocked = new Map(parts.map((part) => [part.id, part.blockedBy]));
  const color = new Map<string, number>();
  const visit = (id: string): boolean => {
    const state = color.get(id) ?? 0;
    if (state === 1) return true;
    if (state === 2) return false;
    color.set(id, 1);
    for (const next of blocked.get(id) ?? []) {
      if (known.has(next) && visit(next)) return true;
    }
    color.set(id, 2);
    return false;
  };
  for (const part of parts) {
    if (visit(part.id)) return true;
  }
  return false;
}

/** Có thứ tự tháo hết các bộ phận chặn để tới core hay không. Vòng lặp trên đường đó thì không. */
function canReachCore(parts: readonly Part[]): boolean {
  const core = parts.find((part) => part.core);
  if (!core) return false;
  const removed = new Set<string>();
  for (let guard = 0; guard <= parts.length; guard++) {
    const next = parts.find(
      (part) => !removed.has(part.id) && part.blockedBy.every((id) => removed.has(id)),
    );
    if (!next) return removed.has(core.id);
    removed.add(next.id);
    if (removed.has(core.id)) return true;
  }
  return false;
}

/**
 * Bộ phận gần nhất còn trong nửa mặt phẳng của `direction`.
 * Trục y hướng xuống, cùng hệ với màn hình. Không có ai theo hướng đó thì trả về null.
 */
export function neighborId(
  parts: readonly { id: string; x: number; y: number }[],
  currentId: string,
  direction: Direction,
): string | null {
  const current = parts.find((part) => part.id === currentId);
  if (!current) return null;
  const dir = DIRECTION[direction];
  let bestId: string | null = null;
  let best = Infinity;
  for (const part of parts) {
    if (part.id === currentId) continue;
    const dx = part.x - current.x;
    const dy = part.y - current.y;
    const forward = dx * dir.x + dy * dir.y;
    if (!(forward > 1e-6)) continue;
    const distance = Math.hypot(dx, dy);
    if (distance < best - 1e-9 || (Math.abs(distance - best) <= 1e-9 && (bestId === null || part.id < bestId))) {
      best = distance;
      bestId = part.id;
    }
  }
  return bestId;
}

/**
 * Bấm có rơi vào cửa sổ một tiếng tích tắc hay không.
 * Beat lấy từ giờ nghe được (`beatAtTime`). `rhythmic` false thì lúc nào cũng kịp.
 */
export function onBeat(tempo: TempoMap, time: number, window: number, rhythmic: boolean): boolean {
  if (!rhythmic) return true;
  const beat = tempo.beatAtTime(time);
  return Math.abs(beat - Math.round(beat)) <= window;
}

/**
 * Trạng thái một lần tháo. Không vẽ, không phát tiếng: trả về việc vừa xảy ra để pha gọi âm thanh.
 * Mọi mốc thời gian là giây nghe được trên `tempo`.
 */
export class Workbench {
  readonly removed = new Set<string>();
  selectedId: string;
  finished = false;
  /** Câu đang đọc. Null khi không có. */
  memory: string | null = null;
  private readonly notches = new Map<string, number>();
  private readonly flashUntil = new Map<string, number>();
  private liftFrom: number | null = null;
  private liftPart: string | null = null;

  constructor(
    readonly mechanism: Mechanism,
    private readonly feel: DisassemblyFeel,
  ) {
    const problems = validateMechanism(mechanism);
    if (problems.length > 0) throw new Error(`Cỗ máy không hợp lệ:\n${problems.join("\n")}`);
    const first = mechanism.parts[0];
    if (!first) throw new Error(`Cỗ máy không hợp lệ:\n${mechanism.name}: không có bộ phận`);
    this.selectedId = first.id;
  }

  notchCount(id: string): number {
    return this.notches.get(id) ?? 0;
  }

  isFlashing(id: string, beat: number): boolean {
    return (this.flashUntil.get(id) ?? -Infinity) > beat;
  }

  /** 0..1 khi đang giữ nhấc đúng bộ phận đang chọn. */
  liftProgress(beat: number): number {
    if (this.liftFrom === null || this.liftPart !== this.selectedId || this.feel.liftBeats <= 0) return 0;
    return Math.min(1, Math.max(0, (beat - this.liftFrom) / this.feel.liftBeats));
  }

  /** Nhảy con trỏ. Bộ phận đã tháo không được chọn. */
  move(direction: Direction): void {
    if (this.memory || this.finished) return;
    const next = neighborId(this.available(), this.selectedId, direction);
    if (next) this.selectedId = next;
  }

  /**
   * Một lần bấm confirm lên bộ phận đang chọn (vặn hoặc gỡ).
   * Nhấc không đi lối này: giữ phím xử lý ở `hold`.
   */
  press(tempo: TempoMap, time: number): WorkResult {
    if (this.memory || this.finished) return QUIET;
    const part = this.selected();
    if (!part) return QUIET;
    const beat = tempo.beatAtTime(time);
    const blocking = this.stillBlocking(part);
    if (blocking.length > 0) {
      this.light(blocking, beat);
      return { cue: null, removedId: null, flashed: blocking };
    }
    if (part.operation === "lift") return QUIET;
    if (!onBeat(tempo, time, this.feel.beatWindow, this.mechanism.rhythmic)) {
      return { cue: "clack", removedId: null, flashed: [] };
    }
    if (part.operation === "unscrew") {
      const count = this.notchCount(part.id) + 1;
      this.notches.set(part.id, count);
      if (count < this.feel.unscrewSteps) return { cue: "unscrew", removedId: null, flashed: [] };
    }
    return this.takeOff(part, "unhook");
  }

  /**
   * Giữ hoặc nhả confirm khi bộ phận đang chọn là kiểu nhấc.
   * Đủ `liftBeats` beat nghe được thì rời. Nhả trước đó thì lần giữ sau đếm lại.
   */
  hold(tempo: TempoMap, time: number, down: boolean): WorkResult {
    if (!down || this.memory || this.finished) {
      this.liftFrom = null;
      this.liftPart = null;
      return QUIET;
    }
    const part = this.selected();
    if (!part || part.operation !== "lift") {
      this.liftFrom = null;
      this.liftPart = null;
      return QUIET;
    }
    const beat = tempo.beatAtTime(time);
    const blocking = this.stillBlocking(part);
    if (blocking.length > 0) {
      this.liftFrom = null;
      this.liftPart = null;
      return QUIET;
    }
    if (this.liftPart !== part.id || this.liftFrom === null) {
      this.liftPart = part.id;
      this.liftFrom = beat;
      return QUIET;
    }
    if (beat - this.liftFrom < this.feel.liftBeats) return QUIET;
    this.liftFrom = null;
    this.liftPart = null;
    return this.takeOff(part, "lift");
  }

  /** Đóng câu ký ức đang mở. Lần bấm vừa tháo không gọi hàm này. */
  closeMemory(): void {
    this.memory = null;
  }

  /** Chơi lại từ đầu, cùng cỗ máy. */
  reset(): void {
    this.removed.clear();
    this.notches.clear();
    this.flashUntil.clear();
    this.memory = null;
    this.finished = false;
    this.liftFrom = null;
    this.liftPart = null;
    const first = this.mechanism.parts[0];
    if (first) this.selectedId = first.id;
  }

  private available(): Part[] {
    return this.mechanism.parts.filter((part) => !this.removed.has(part.id));
  }

  private selected(): Part | undefined {
    return this.mechanism.parts.find((part) => part.id === this.selectedId && !this.removed.has(part.id));
  }

  private stillBlocking(part: Part): string[] {
    return part.blockedBy.filter((id) => !this.removed.has(id));
  }

  private light(ids: readonly string[], beat: number): void {
    const until = beat + this.feel.blockFlashBeats;
    for (const id of ids) this.flashUntil.set(id, until);
  }

  private takeOff(part: Part, cue: WorkCue): WorkResult {
    this.removed.add(part.id);
    this.notches.delete(part.id);
    if (part.memory) this.memory = part.memory;
    if (part.core) this.finished = true;
    const rest = this.available();
    let nearest: Part | undefined;
    let best = Infinity;
    for (const other of rest) {
      const distance = Math.hypot(other.x - part.x, other.y - part.y);
      if (distance < best) {
        best = distance;
        nearest = other;
      }
    }
    if (nearest) this.selectedId = nearest.id;
    return { cue: part.operation === "unscrew" ? "unscrew" : cue, removedId: part.id, flashed: [] };
  }
}
