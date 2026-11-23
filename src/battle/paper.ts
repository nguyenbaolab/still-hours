import type { Rect } from "../core/math";
import { TempoMap } from "../core/tempo-map";
import type { PaperFigure, PaperPoint, PaperStroke } from "../data/paper";
import type { Pattern } from "../data/pattern-types";

/** Vị trí giấy trong một vòng. `pass` bắt đầu từ 1; beat âm thì pass 0 (chưa vẽ). */
export interface PaperPlace {
  pass: number;
  /** Quãng giấy đã trôi trong vòng này, px, từ 0 đến hết bề rộng. */
  scroll: number;
}

export interface NibPoint {
  /** Px trên giấy, 0 = mép trái. */
  x: number;
  /** Px trên giấy, 0 = mép trên. */
  y: number;
}

/** Một cặp kim sinh từ hình. `beat` là lúc kim xuất hiện; `columnBeat` là lúc khe tới cột giữa. */
export interface PaperHand {
  beat: number;
  columnBeat: number;
  /** 0..1 */
  x: number;
  /** Độ cao tâm khe, 0..1. */
  at: number;
  pass: number;
}

/** Tempo kịch bản của pattern, hệ số nhịp = 1. */
export function scriptTempo(pattern: Pattern, defaultBpm: number): TempoMap {
  const tempo = new TempoMap(pattern.bpm ?? defaultBpm);
  const changes = pattern.events.filter((event) => event.type === "tempo").sort((a, b) => a.beat - b.beat);
  for (const event of changes) {
    if (event.type !== "tempo") continue;
    tempo.change(event.beat, event.bpm, event.overBeats ?? 0);
  }
  return tempo;
}

/** Beat nghe được → vòng giấy và quãng đã trôi. Hết vòng thì scroll về 0. */
export function paperPlace(beat: number, beatsPerPass: number, width: number): PaperPlace {
  if (!(beat >= 0) || !(beatsPerPass > 0) || !(width > 0)) return { pass: 0, scroll: 0 };
  const pass = Math.floor(beat / beatsPerPass) + 1;
  const into = beat - (pass - 1) * beatsPerPass;
  return { pass, scroll: (into / beatsPerPass) * width };
}

/** Cùng `paperPlace`, beat lấy từ thời gian nghe được (đã gồm hệ số nhịp). */
export function paperPlaceAtTime(time: number, tempo: TempoMap, beatsPerPass: number, width: number): PaperPlace {
  return paperPlace(tempo.beatAtTime(time), beatsPerPass, width);
}

/**
 * Điểm trên giấy đang nằm dưới ngòi.
 * Cột giữa là mốc: giấy trôi sang trái, nên x giấy = lệch ngang của bánh răng + quãng đã trôi.
 */
export function nibPoint(gearX: number, gearY: number, homeX: number, arenaTop: number, scroll: number, width: number): NibPoint {
  let x = gearX - homeX + scroll;
  if (width > 0) x = ((x % width) + width) % width;
  return { x, y: gearY - arenaTop };
}

/** Giật của khe theo beat: nhích lên hoặc xuống ngay sau mỗi nhịp, rồi về chỗ. */
export function handTwitch(beat: number, twitch: number): number {
  if (!(twitch > 0)) return 0;
  const frac = beat - Math.floor(beat);
  const kick = frac < 0.2 ? 1 - frac / 0.2 : 0;
  const dir = Math.floor(beat) % 2 === 0 ? 1 : -1;
  return dir * twitch * kick;
}

function pointSegmentDistance(px: number, py: number, x0: number, y0: number, x1: number, y1: number): number {
  const dx = x1 - x0;
  const dy = y1 - y0;
  const len2 = dx * dx + dy * dy;
  if (len2 < 1e-8) return Math.hypot(px - x0, py - y0);
  const t = Math.min(1, Math.max(0, ((px - x0) * dx + (py - y0) * dy) / len2));
  return Math.hypot(px - (x0 + dx * t), py - (y0 + dy * t));
}

/** Bút chạm giấy khi điểm dưới ngòi nằm trong một nét của đúng vòng hiện tại. */
export function penOnStroke(
  figure: PaperFigure,
  pass: number,
  paperX: number,
  paperY: number,
  radius: number,
  width: number,
  height: number,
): boolean {
  if (!(pass >= 1) || !(radius > 0)) return false;
  for (const stroke of figure.strokes) {
    if (stroke.pass !== pass) continue;
    for (let i = 1; i < stroke.points.length; i++) {
      const prev = stroke.points[i - 1] as PaperPoint;
      const point = stroke.points[i] as PaperPoint;
      const dist = pointSegmentDistance(paperX, paperY, prev.x * width, prev.y * height, point.x * width, point.y * height);
      if (dist <= radius) return true;
    }
  }
  return false;
}

interface GapSample {
  pass: number;
  x: number;
  y: number;
}

function strokeBounds(stroke: PaperStroke, width: number): { min: number; max: number } {
  let min = Infinity;
  let max = -Infinity;
  for (const point of stroke.points) {
    const x = point.x * width;
    if (x < min) min = x;
    if (x > max) max = x;
  }
  return { min, max };
}

/** Các điểm đặt khe, cách nhau `spacing` px dọc nét, cộng điểm đầu và điểm cuối. */
export function gapSamples(figure: PaperFigure, width: number, height: number, spacing: number): GapSample[] {
  const samples: GapSample[] = [];
  for (const stroke of figure.strokes) {
    const first = stroke.points[0];
    if (!first) continue;
    samples.push({ pass: stroke.pass, x: first.x * width, y: first.y * height });
    let carried = 0;
    for (let i = 1; i < stroke.points.length; i++) {
      const prev = stroke.points[i - 1] as PaperPoint;
      const point = stroke.points[i] as PaperPoint;
      const x0 = prev.x * width;
      const y0 = prev.y * height;
      const x1 = point.x * width;
      const y1 = point.y * height;
      const length = Math.hypot(x1 - x0, y1 - y0);
      if (!(length > 0)) continue;
      let walked = spacing - carried;
      while (walked <= length + 1e-6) {
        const t = walked / length;
        samples.push({ pass: stroke.pass, x: x0 + (x1 - x0) * t, y: y0 + (y1 - y0) * t });
        walked += spacing;
      }
      carried = length - (walked - spacing);
      if (carried < -1e-6) carried = 0;
    }
    const last = stroke.points[stroke.points.length - 1] as PaperPoint;
    const endX = last.x * width;
    const prevSample = samples[samples.length - 1];
    if (!prevSample || Math.hypot(endX - prevSample.x, last.y * height - prevSample.y) > 1) {
      samples.push({ pass: stroke.pass, x: endX, y: last.y * height });
    }
  }
  return samples;
}

function tooFar(dx: number, dy: number, paperSpeed: number, playerSpeed: number): boolean {
  if (!(paperSpeed > 0)) return true;
  const dt = dx / paperSpeed;
  return Math.abs(dy) > playerSpeed * dt + 1e-3;
}

/**
 * Kiểm tra hình giấy. Tốc độ đo trên tempo kịch bản: hệ số nhịp chỉ làm giấy trôi chậm hơn.
 * Trả về danh sách lỗi (rỗng = hợp lệ).
 */
export function validatePaper(
  figure: PaperFigure,
  arena: Rect,
  tempo: TempoMap,
  beatsPerPass: number,
  spacing: number,
  playerSpeed: number,
): string[] {
  const problems: string[] = [];
  const fail = (message: string): void => {
    problems.push(`${figure.name}: ${message}`);
  };
  if (!(beatsPerPass > 0)) fail("beatsPerPass phải > 0");
  if (figure.strokes.length === 0) fail("chưa có nét");

  const fraction = (value: number): boolean => value >= 0 && value <= 1;
  figure.strokes.forEach((stroke, index) => {
    if (!Number.isInteger(stroke.pass) || stroke.pass < 1) fail(`nét ${index} không có vòng`);
    if (stroke.points.length < 2) fail(`nét ${index} cần ít nhất hai điểm`);
    for (let i = 0; i < stroke.points.length; i++) {
      const point = stroke.points[i] as PaperPoint;
      if (!fraction(point.x) || !fraction(point.y)) fail(`nét ${index} có điểm ngoài khung`);
      if (i > 0 && !(point.x > (stroke.points[i - 1] as PaperPoint).x)) fail(`nét ${index} có x không tăng`);
    }
  });

  const byPass = new Map<number, PaperStroke[]>();
  for (const stroke of figure.strokes) {
    const list = byPass.get(stroke.pass) ?? [];
    list.push(stroke);
    byPass.set(stroke.pass, list);
  }
  for (const [pass, strokes] of byPass) {
    const ranges = strokes
      .map((stroke) => strokeBounds(stroke, arena.w))
      .sort((a, b) => a.min - b.min);
    for (let i = 1; i < ranges.length; i++) {
      const prev = ranges[i - 1] as { min: number; max: number };
      const next = ranges[i] as { min: number; max: number };
      if (next.min < prev.max - 1e-3) fail(`vòng ${pass} có hai nét chồng khoảng x`);
    }
  }

  const passSeconds = tempo.scriptTimeAtBeat(beatsPerPass) - tempo.scriptTimeAtBeat(0);
  const paperSpeed = passSeconds > 0 ? arena.w / passSeconds : 0;
  const samples = gapSamples(figure, arena.w, arena.h, spacing);
  const grouped = new Map<number, GapSample[]>();
  for (const sample of samples) {
    const list = grouped.get(sample.pass) ?? [];
    list.push(sample);
    grouped.set(sample.pass, list);
  }
  for (const [pass, list] of grouped) {
    list.sort((a, b) => a.x - b.x);
    for (let i = 1; i < list.length; i++) {
      const prev = list[i - 1] as GapSample;
      const next = list[i] as GapSample;
      if (tooFar(next.x - prev.x, next.y - prev.y, paperSpeed, playerSpeed)) {
        fail(`vòng ${pass} có khe quá xa (${prev.x.toFixed(0)} → ${next.x.toFixed(0)})`);
      }
    }
  }
  return problems;
}

/** Sinh cặp kim từ hình. Mỗi `spacing` px dọc nét là một khe đúng độ cao nét đó. */
export function handsFromFigure(
  figure: PaperFigure,
  arena: Rect,
  beatsPerPass: number,
  spacing: number,
): PaperHand[] {
  const hands: PaperHand[] = [];
  const samples = gapSamples(figure, arena.w, arena.h, spacing);
  for (const sample of samples) {
    const passStart = (sample.pass - 1) * beatsPerPass;
    const across = sample.x / arena.w;
    const columnBeat = passStart + across * beatsPerPass;
    const lead = sample.x - arena.w / 2;
    const beat = lead <= 0 ? passStart : passStart + (lead / arena.w) * beatsPerPass;
    hands.push({
      beat,
      columnBeat,
      x: across,
      at: sample.y / arena.h,
      pass: sample.pass,
    });
  }
  return hands;
}
