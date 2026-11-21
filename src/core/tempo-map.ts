/**
 * Bản đồ tempo: đổi qua lại giữa beat và thời gian (giây) khi BPM thay đổi trong lúc chơi.
 *
 * BPM kịch bản mô tả theo từng đoạn: đứng yên, hoặc đổi tuyến tính THEO BEAT. Với BPM tuyến tính theo beat,
 * thời gian và beat đổi qua nhau bằng công thức đóng (log/exp), không tích phân số:
 *   thời gian  t(b) = (60 / k) · ln(1 + k·b / bpm0)       (k = số BPM tăng thêm mỗi beat)
 *   beat       b(t) = (bpm0 / k) · (exp(k·t / 60) − 1)
 *
 * Hệ số nhịp (`setPace`) là một lớp riêng, từng khúc hằng trong (0, 1], nhân lên BPM kịch bản.
 * Vì hệ số hằng trên từng khúc, BPM hiệu dụng vẫn tuyến tính theo beat nên công thức đóng vẫn đúng.
 * `change` không đụng lớp này: tempo kịch bản (kể cả vòng pattern đã triển khai) không bị cắt khi nhịp chậm.
 *
 * Thời gian nghe được (`timeAtBeat`) đã gồm hệ số. Thời gian kịch bản (`scriptTimeAtBeat`) là lúc hệ số bằng 1,
 * dùng để đo độ dài cảnh báo sao cho khi hệ số hồi về 1 cảnh báo không ngắn hơn mức tối thiểu.
 *
 * Thời gian là giây tính từ beat 0. Trước beat 0 (t < 0) coi như BPM đầu tiên kéo dài ngược về trước.
 */

interface ScriptSegment {
  startBeat: number;
  bpmStart: number;
  bpmEnd: number;
  endBeat: number;
}

interface PaceMark {
  startBeat: number;
  factor: number;
}

interface Segment {
  readonly startBeat: number;
  /** Giây tính từ beat 0 tại startBeat. */
  readonly startTime: number;
  readonly bpmStart: number;
  readonly bpmEnd: number;
  /** Infinity với đoạn cuối cùng. */
  readonly endBeat: number;
}

const FLAT = 1e-9;

export class TempoMap {
  /** Tăng mỗi khi bản đồ bị đổi, để nơi đã lên lịch dựa trên nó (tiếng tích tắc...) biết mà tính lại. */
  version = 0;

  /** BPM kịch bản, chưa nhân hệ số nhịp. */
  private readonly script: ScriptSegment[];
  /** Hệ số nhịp, từng khúc hằng, luôn trong (0, 1]. */
  private readonly pace: PaceMark[];
  /** BPM đã nhân hệ số: đây là thời gian người chơi nghe và đạn dùng. */
  private heard: Segment[] = [];
  /** Cùng các mốc, hệ số luôn bằng 1. */
  private plain: Segment[] = [];

  constructor(initialBpm: number) {
    assertBpm(initialBpm);
    this.script = [{ startBeat: 0, bpmStart: initialBpm, bpmEnd: initialBpm, endBeat: Infinity }];
    this.pace = [{ startBeat: 0, factor: 1 }];
    this.rebuild();
  }

  /** BPM hiệu dụng (đã nhân hệ số) tại beat này. */
  bpmAtBeat(beat: number): number {
    return bpmWithin(this.segmentOn(this.heard, (segment) => segment.startBeat <= beat), beat);
  }

  /** Hệ số nhịp đang có hiệu lực tại beat này. */
  paceAtBeat(beat: number): number {
    return this.paceFactorAt(beat);
  }

  /** Giây nghe được (từ beat 0) mà beat này diễn ra. Đã gồm hệ số nhịp. */
  timeAtBeat(beat: number): number {
    return this.timeOn(this.heard, beat);
  }

  /** Giây kịch bản, như thể hệ số luôn bằng 1. */
  scriptTimeAtBeat(beat: number): number {
    return this.timeOn(this.plain, beat);
  }

  /** Vị trí beat (số thực) tại thời điểm nghe được này. */
  beatAtTime(time: number): number {
    return this.beatOn(this.heard, time);
  }

  /** Vị trí beat trên đồng hồ kịch bản (hệ số 1). */
  scriptBeatAtTime(time: number): number {
    return this.beatOn(this.plain, time);
  }

  /**
   * Đổi BPM kịch bản kể từ `atBeat`: tức thì (`overBeats` = 0) hoặc tăng/giảm dần trong `overBeats` beat.
   * Mọi thay đổi kịch bản đã khai báo SAU `atBeat` bị bỏ đi; hệ số nhịp không bị đụng tới.
   */
  change(atBeat: number, bpm: number, overBeats = 0): void {
    assertBpm(bpm);
    if (!(atBeat >= 0) || !Number.isFinite(atBeat)) throw new Error(`TempoMap.change: beat ${atBeat} không hợp lệ`);
    if (!(overBeats >= 0) || !Number.isFinite(overBeats)) {
      throw new Error(`TempoMap.change: overBeats ${overBeats} không hợp lệ`);
    }

    const index = this.search(this.script, (segment) => segment.startBeat <= atBeat);
    const current = this.script[index] as ScriptSegment;
    const fromBpm = scriptBpm(current, atBeat);

    this.script.length = index + 1;
    if (current.startBeat === atBeat) {
      this.script.pop();
    } else {
      current.bpmEnd = fromBpm;
      current.endBeat = atBeat;
    }

    if (overBeats > 0) {
      this.script.push({ startBeat: atBeat, bpmStart: fromBpm, bpmEnd: bpm, endBeat: atBeat + overBeats });
      this.script.push({ startBeat: atBeat + overBeats, bpmStart: bpm, bpmEnd: bpm, endBeat: Infinity });
    } else {
      this.script.push({ startBeat: atBeat, bpmStart: bpm, bpmEnd: bpm, endBeat: Infinity });
    }
    this.rebuild();
    this.version++;
  }

  /**
   * Đặt hệ số nhịp kể từ `atBeat`. Hệ số hằng cho tới lần đặt sau; không tăng dần trong đoạn
   * (tăng dần sẽ làm BPM hiệu dụng không còn tuyến tính, công thức đóng không còn đúng).
   * Không đụng BPM kịch bản. Hệ số ngoài (0, 1] bị từ chối: lớn hơn 1 sẽ làm cảnh báo đã hẹn ngắn hơn mức tối thiểu.
   * Không đổi gì thì không tăng `version`.
   */
  setPace(atBeat: number, factor: number): void {
    if (!(atBeat >= 0) || !Number.isFinite(atBeat)) throw new Error(`TempoMap.setPace: beat ${atBeat} không hợp lệ`);
    if (!(factor > 0) || factor > 1 || !Number.isFinite(factor)) {
      throw new Error(`TempoMap.setPace: hệ số ${factor} phải nằm trong (0, 1]`);
    }

    const index = this.search(this.pace, (mark) => mark.startBeat <= atBeat);
    const current = this.pace[index] as PaceMark;
    const hasFuture = this.pace.length > index + 1;
    if (current.startBeat === atBeat) {
      if (current.factor === factor && !hasFuture) return;
      this.pace.length = index;
    } else if (current.factor === factor && !hasFuture) {
      return;
    } else {
      this.pace.length = index + 1;
    }
    this.pace.push({ startBeat: atBeat, factor });
    this.rebuild();
    this.version++;
  }

  private paceFactorAt(beat: number): number {
    const index = this.search(this.pace, (mark) => mark.startBeat <= beat);
    return (this.pace[index] as PaceMark).factor;
  }

  private rebuild(): void {
    const knots = new Set<number>([0]);
    for (const segment of this.script) {
      if (segment.startBeat > 0) knots.add(segment.startBeat);
      if (Number.isFinite(segment.endBeat)) knots.add(segment.endBeat);
    }
    for (const mark of this.pace) if (mark.startBeat > 0) knots.add(mark.startBeat);
    const bounds = [...knots].sort((a, b) => a - b);

    const heard: Segment[] = [];
    const plain: Segment[] = [];
    let heardTime = 0;
    let plainTime = 0;
    for (let i = 0; i < bounds.length; i++) {
      const startBeat = bounds[i] as number;
      const endBeat = bounds[i + 1] ?? Infinity;
      const source = this.script[this.search(this.script, (segment) => segment.startBeat <= startBeat)] as ScriptSegment;
      const factor = this.paceFactorAt(startBeat);
      const bpmStart = scriptBpm(source, startBeat);
      const bpmEnd = Number.isFinite(endBeat) ? scriptBpm(source, endBeat) : bpmStart;
      const heardSegment: Segment = {
        startBeat,
        endBeat,
        startTime: heardTime,
        bpmStart: bpmStart * factor,
        bpmEnd: bpmEnd * factor,
      };
      const plainSegment: Segment = { startBeat, endBeat, startTime: plainTime, bpmStart, bpmEnd };
      heard.push(heardSegment);
      plain.push(plainSegment);
      if (Number.isFinite(endBeat)) {
        const beats = endBeat - startBeat;
        heardTime += secondsFor(heardSegment, beats);
        plainTime += secondsFor(plainSegment, beats);
      }
    }
    this.heard = heard;
    this.plain = plain;
  }

  private timeOn(timeline: Segment[], beat: number): number {
    const segment = this.segmentOn(timeline, (item) => item.startBeat <= beat);
    return segment.startTime + secondsFor(segment, beat - segment.startBeat);
  }

  private beatOn(timeline: Segment[], time: number): number {
    const segment = this.segmentOn(timeline, (item) => item.startTime <= time);
    return segment.startBeat + beatsAfter(segment, time - segment.startTime);
  }

  private segmentOn(timeline: Segment[], startsBefore: (segment: Segment) => boolean): Segment {
    return timeline[this.search(timeline, startsBefore)] as Segment;
  }

  /** Chỉ số phần tử cuối cùng thoả `startsBefore`; mặc định phần tử đầu. */
  private search<T>(items: readonly T[], startsBefore: (item: T) => boolean): number {
    let low = 0;
    let high = items.length - 1;
    while (low < high) {
      const mid = (low + high + 1) >> 1;
      if (startsBefore(items[mid] as T)) low = mid;
      else high = mid - 1;
    }
    return low;
  }
}

function assertBpm(bpm: number): void {
  if (!(bpm > 0) || !Number.isFinite(bpm)) throw new Error(`BPM không hợp lệ: ${bpm}`);
}

function scriptBpm(segment: ScriptSegment, beat: number): number {
  const span = segment.endBeat - segment.startBeat;
  const k = Number.isFinite(span) && span > 0 ? (segment.bpmEnd - segment.bpmStart) / span : 0;
  const clamped = Math.min(Math.max(beat, segment.startBeat), Number.isFinite(segment.endBeat) ? segment.endBeat : beat);
  return segment.bpmStart + k * (clamped - segment.startBeat);
}

/** BPM tăng thêm mỗi beat trong đoạn (0 nếu đoạn không đổi BPM). */
function slope(segment: Segment): number {
  const span = segment.endBeat - segment.startBeat;
  return Number.isFinite(span) && span > 0 ? (segment.bpmEnd - segment.bpmStart) / span : 0;
}

function bpmWithin(segment: Segment, beat: number): number {
  return segment.bpmStart + slope(segment) * (Math.min(beat, segment.endBeat) - segment.startBeat);
}

/** Số giây trôi qua sau `beats` beat kể từ đầu đoạn. */
function secondsFor(segment: Segment, beats: number): number {
  const k = slope(segment);
  if (Math.abs(k) < FLAT) return (60 * beats) / segment.bpmStart;
  return (60 / k) * Math.log(1 + (k * beats) / segment.bpmStart);
}

/** Số beat trôi qua sau `seconds` giây kể từ đầu đoạn. */
function beatsAfter(segment: Segment, seconds: number): number {
  const k = slope(segment);
  if (Math.abs(k) < FLAT) return (seconds * segment.bpmStart) / 60;
  return (segment.bpmStart / k) * (Math.exp((k * seconds) / 60) - 1);
}
