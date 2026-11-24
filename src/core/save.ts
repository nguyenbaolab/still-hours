import type { ResidentId } from "../data/residents/types";
import { SAVE_FEEL } from "../data/flow-feel";
import type { Pt } from "./drawing";
import type { Rect } from "./math";

/** Khóa localStorage (CLAUDE.md, "Lưu tiến trình"). */
export const SAVE_KEY = "still-hours/save/v1";
export const SETTINGS_KEY = "still-hours/settings/v1";

const RESIDENT_IDS: readonly ResidentId[] = ["r1", "r2", "r3", "r4", "boss"];

/** Khung tranh của cô bé trong dữ liệu lưu: số nguyên trong khung 400×160. */
export const DRAWING_WIDTH = 400;
export const DRAWING_HEIGHT = 160;

export interface SaveData {
  version: 1;
  seenIntro: boolean;
  /** Theo thứ tự đã giải thoát. */
  freed: ResidentId[];
  /** Tổng thời gian chơi (giây). */
  playSeconds: number;
  /** Tranh của r4: x, y xen kẽ, số nguyên trong khung 400×160; cặp -1, -1 = nhấc bút. Null = chưa có. */
  drawing: number[] | null;
  /** Đã qua boss, đang ở màn kết. */
  finished: boolean;
}

export interface Settings {
  muted: boolean;
}

export function newSave(): SaveData {
  return { version: 1, seenIntro: false, freed: [], playSeconds: 0, drawing: null, finished: false };
}

export function serializeSave(data: SaveData): string {
  return JSON.stringify(data);
}

const isInt = (value: unknown): value is number => typeof value === "number" && Number.isInteger(value);

/**
 * Đọc bản lưu từ chuỗi. JSON hỏng, sai `version`, sai kiểu hay thiếu trường thì trả về null (không ném lỗi).
 * Không sửa lại dữ liệu: không đọc được thì coi như không có bản lưu.
 */
export function parseSave(text: string): SaveData | null {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return null;
  }
  if (typeof raw !== "object" || raw === null) return null;
  const o = raw as Record<string, unknown>;
  if (o.version !== 1) return null;
  if (typeof o.seenIntro !== "boolean" || typeof o.finished !== "boolean") return null;
  if (typeof o.playSeconds !== "number" || !Number.isFinite(o.playSeconds) || o.playSeconds < 0) return null;
  if (!Array.isArray(o.freed)) return null;
  const freed: ResidentId[] = [];
  for (const id of o.freed) {
    if (typeof id !== "string" || !RESIDENT_IDS.includes(id as ResidentId) || freed.includes(id as ResidentId)) return null;
    freed.push(id as ResidentId);
  }
  let drawing: number[] | null = null;
  if (o.drawing !== null) {
    if (!Array.isArray(o.drawing) || o.drawing.length % 2 !== 0) return null;
    if (!o.drawing.every(isInt)) return null;
    drawing = o.drawing as number[];
  }
  return { version: 1, seenIntro: o.seenIntro, freed, playSeconds: o.playSeconds, drawing, finished: o.finished };
}

export function parseSettings(text: string): Settings {
  try {
    const raw: unknown = JSON.parse(text);
    if (typeof raw === "object" && raw !== null && typeof (raw as Record<string, unknown>).muted === "boolean") {
      return { muted: (raw as Record<string, unknown>).muted as boolean };
    }
  } catch {
    // rơi xuống mặc định
  }
  return { muted: false };
}

/** Phần của `Storage` mà kho lưu dùng. */
export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

/** localStorage của trình duyệt, hoặc null nếu bị chặn (chế độ riêng tư): khi đó chơi không lưu. */
export function browserStorage(): StorageLike | null {
  try {
    return typeof window === "undefined" ? null : window.localStorage;
  } catch {
    return null;
  }
}

/**
 * Kho lưu tiến trình và cài đặt. Mọi lỗi của `Storage` (đầy, bị chặn) bị nuốt: chơi không lưu, không báo lỗi.
 * Phiên debug (`blocked()` trả về true) không đọc cũng không ghi.
 */
export class SaveStore {
  constructor(
    private readonly storage: StorageLike | null,
    private readonly blocked: () => boolean = () => false,
  ) {}

  load(): SaveData | null {
    if (this.blocked() || !this.storage) return null;
    try {
      const text = this.storage.getItem(SAVE_KEY);
      return text === null ? null : parseSave(text);
    } catch {
      return null;
    }
  }

  exists(): boolean {
    return this.load() !== null;
  }

  write(data: SaveData): void {
    if (this.blocked() || !this.storage) return;
    try {
      this.storage.setItem(SAVE_KEY, serializeSave(data));
    } catch {
      // chơi không lưu
    }
  }

  clear(): void {
    if (this.blocked() || !this.storage) return;
    try {
      this.storage.removeItem(SAVE_KEY);
    } catch {
      // chơi không lưu
    }
  }

  /** Chỉ cập nhật thời gian chơi, và chỉ khi đã có bản lưu (dùng khi đóng tab hoặc tab bị ẩn). */
  touchPlaySeconds(seconds: number): void {
    const current = this.load();
    if (!current) return;
    this.write({ ...current, playSeconds: Math.max(current.playSeconds, seconds) });
  }

  loadSettings(): Settings {
    if (!this.storage) return { muted: false };
    try {
      const text = this.storage.getItem(SETTINGS_KEY);
      return text === null ? { muted: false } : parseSettings(text);
    } catch {
      return { muted: false };
    }
  }

  saveSettings(settings: Settings): void {
    if (!this.storage) return;
    try {
      this.storage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    } catch {
      // bỏ qua
    }
  }
}

/** Khoảng cách từ điểm p tới đoạn a–b. */
function distanceToSegment(p: Pt, a: Pt, b: Pt): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const lengthSq = dx * dx + dy * dy;
  if (lengthSq === 0) return Math.hypot(p.x - a.x, p.y - a.y);
  const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / lengthSq));
  return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy));
}

/** Ramer–Douglas–Peucker: giữ điểm đầu và điểm cuối, bỏ điểm nào lệch khỏi đường nối dưới `epsilon`. */
export function simplifyStroke(points: readonly Pt[], epsilon: number): Pt[] {
  if (points.length <= 2) return [...points];
  const keep = new Array<boolean>(points.length).fill(false);
  keep[0] = true;
  keep[points.length - 1] = true;
  const stack: [number, number][] = [[0, points.length - 1]];
  while (stack.length > 0) {
    const [from, to] = stack.pop() as [number, number];
    let worst = -1;
    let farthest = epsilon;
    for (let i = from + 1; i < to; i++) {
      const d = distanceToSegment(points[i] as Pt, points[from] as Pt, points[to] as Pt);
      if (d > farthest) {
        farthest = d;
        worst = i;
      }
    }
    if (worst >= 0) {
      keep[worst] = true;
      stack.push([from, worst], [worst, to]);
    }
  }
  return points.filter((_, i) => keep[i]);
}

/**
 * Tranh của người chơi (nét theo toạ độ màn hình) thành dãy số để lưu: tọa độ nguyên trong khung `arena` (400×160),
 * giản lược bằng RDP với sai số `epsilon`; quá `maxNumbers` thì tăng sai số gấp đôi tới khi vừa. Giữa hai nét có
 * một cặp -1, -1 (nhấc bút). Mỗi nét giữ điểm đầu và điểm cuối.
 */
export function encodeDrawing(
  strokes: readonly (readonly Pt[])[],
  arena: Rect,
  epsilon: number = SAVE_FEEL.drawingEpsilon,
  maxNumbers: number = SAVE_FEEL.drawingMaxNumbers,
): number[] {
  const local = strokes.map((stroke) =>
    stroke.map((p) => ({
      x: Math.min(DRAWING_WIDTH, Math.max(0, p.x - arena.x)),
      y: Math.min(DRAWING_HEIGHT, Math.max(0, p.y - arena.y)),
    })),
  );
  for (let eps = epsilon, guard = 0; guard < 24; eps *= 2, guard++) {
    const numbers: number[] = [];
    for (const stroke of local) {
      if (stroke.length === 0) continue;
      if (numbers.length > 0) numbers.push(-1, -1);
      for (const p of simplifyStroke(stroke, eps)) numbers.push(Math.round(p.x), Math.round(p.y));
    }
    if (numbers.length <= maxNumbers) return numbers;
  }
  return [];
}

/** Dãy số đã lưu về các nét, theo toạ độ trong khung 400×160 (cộng `origin` nếu muốn về toạ độ màn hình). */
export function decodeDrawing(numbers: readonly number[], origin: Pt = { x: 0, y: 0 }): Pt[][] {
  const strokes: Pt[][] = [];
  let current: Pt[] = [];
  for (let i = 0; i + 1 < numbers.length; i += 2) {
    const x = numbers[i] as number;
    const y = numbers[i + 1] as number;
    if (x === -1 && y === -1) {
      if (current.length > 0) strokes.push(current);
      current = [];
      continue;
    }
    current.push({ x: origin.x + x, y: origin.y + y });
  }
  if (current.length > 0) strokes.push(current);
  return strokes;
}
