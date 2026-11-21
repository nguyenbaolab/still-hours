import type { Rect } from "../core/math";
import { TempoMap } from "../core/tempo-map";
import type { GuideFigure, GuidePoint } from "../data/guide";
import type { Pattern } from "../data/pattern-types";
import type { Sketch } from "./sketch";

export interface GuideLimits {
  /** `PLAYER_FEEL.speed`. */
  speed: number;
  /** `PLAYER_FEEL.slowSpeed`. Khúc chi tiết không được vượt mức này. */
  slowSpeed: number;
  /** Trần khúc thường = speed × speedRatio. */
  speedRatio: number;
}

export interface GuidePose {
  x: number;
  y: number;
  aheadX: number;
  aheadY: number;
}

/** Tempo kịch bản của pattern, hệ số nhịp = 1. Dùng khi kiểm tốc độ đốm sáng. */
export function scriptTempo(pattern: Pattern, defaultBpm: number): TempoMap {
  const tempo = new TempoMap(pattern.bpm ?? defaultBpm);
  const changes = pattern.events.filter((event) => event.type === "tempo").sort((a, b) => a.beat - b.beat);
  for (const event of changes) {
    if (event.type !== "tempo") continue;
    tempo.change(event.beat, event.bpm, event.overBeats ?? 0);
  }
  return tempo;
}

/**
 * Kiểm tra hình dẫn đường. Trả về danh sách lỗi (rỗng = hợp lệ).
 * Tốc độ đo trên tempo kịch bản: hệ số nhịp chỉ làm đốm chậm hơn, không nhanh hơn.
 */
export function validateGuide(figure: GuideFigure, arena: Rect, tempo: TempoMap, limits: GuideLimits): string[] {
  const problems: string[] = [];
  const fail = (message: string): void => {
    problems.push(`${figure.name}: ${message}`);
  };
  if (figure.points.length < 2) {
    fail("cần ít nhất hai điểm");
    return problems;
  }
  const fraction = (value: number): boolean => value >= 0 && value <= 1;
  figure.points.forEach((point, index) => {
    if (!fraction(point.x) || !fraction(point.y)) fail(`điểm ${index} nằm ngoài khung`);
    if (!Number.isFinite(point.beat)) fail(`điểm ${index} không có beat`);
  });

  for (let i = 1; i < figure.points.length; i++) {
    const prev = figure.points[i - 1] as GuidePoint;
    const point = figure.points[i] as GuidePoint;
    const dt = tempo.scriptTimeAtBeat(point.beat) - tempo.scriptTimeAtBeat(prev.beat);
    if (!(dt > 0)) {
      fail(`beat phải tăng tại điểm ${i}`);
      continue;
    }
    const dx = (point.x - prev.x) * arena.w;
    const dy = (point.y - prev.y) * arena.h;
    const speed = Math.hypot(dx, dy) / dt;
    const cap = point.detail ? limits.slowSpeed : limits.speed * limits.speedRatio;
    if (speed > cap + 1e-4) {
      const kind = point.detail ? "khúc chi tiết" : "khúc";
      fail(`${kind} tới beat ${point.beat} quá nhanh (${speed.toFixed(0)} px/giây, trần ${cap.toFixed(0)})`);
    }
  }
  return problems;
}

function pointAt(points: readonly GuidePoint[], beat: number, arena: Rect): { x: number; y: number } {
  const first = points[0] as GuidePoint;
  const last = points[points.length - 1] as GuidePoint;
  const place = (point: GuidePoint, t: number, next: GuidePoint): { x: number; y: number } => ({
    x: arena.x + (point.x + (next.x - point.x) * t) * arena.w,
    y: arena.y + (point.y + (next.y - point.y) * t) * arena.h,
  });
  if (beat <= first.beat) return place(first, 0, first);
  if (beat >= last.beat) return place(last, 0, last);
  let index = 1;
  while (index < points.length - 1 && (points[index] as GuidePoint).beat < beat) index++;
  const prev = points[index - 1] as GuidePoint;
  const next = points[index] as GuidePoint;
  const span = next.beat - prev.beat;
  const t = span > 0 ? (beat - prev.beat) / span : 0;
  return place(prev, t, next);
}

/** Vị trí đốm sáng và điểm khoảng `lookAheadBeats` phía trước. Chỉ phụ thuộc beat. */
export function guidePose(figure: GuideFigure, beat: number, arena: Rect, lookAheadBeats: number): GuidePose {
  const here = pointAt(figure.points, beat, arena);
  const ahead = pointAt(figure.points, beat + lookAheadBeats, arena);
  return { x: here.x, y: here.y, aheadX: ahead.x, aheadY: ahead.y };
}

/** Cùng `guidePose`, nhưng beat là beat NGHE ĐƯỢC tại `time` (đã gồm hệ số nhịp). */
export function guidePoseAtTime(
  figure: GuideFigure,
  time: number,
  tempo: TempoMap,
  arena: Rect,
  lookAheadBeats: number,
): GuidePose {
  return guidePose(figure, tempo.beatAtTime(time), arena, lookAheadBeats);
}

/** Bút chạm giấy khi bánh răng nằm trong vùng sáng. Ra ngoài thì nhấc bút, không nối nét qua khoảng trống. */
export function traceOnLight(
  sketch: Sketch,
  x: number,
  y: number,
  lightX: number,
  lightY: number,
  radius: number,
  slow: boolean,
): boolean {
  if (Math.hypot(x - lightX, y - lightY) > radius) {
    sketch.lift();
    return false;
  }
  sketch.sample(x, y, slow);
  return true;
}
