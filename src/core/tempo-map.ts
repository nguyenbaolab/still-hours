/**
 * Bản đồ tempo: đổi qua lại giữa beat và thời gian (giây) khi BPM thay đổi trong lúc chơi.
 *
 * BPM được mô tả theo từng đoạn: đứng yên, hoặc đổi tuyến tính THEO BEAT từ BPM đầu đến BPM cuối (tăng/giảm dần).
 * Với BPM tuyến tính theo beat thì thời gian và beat đổi qua nhau được bằng công thức đóng (log/exp),
 * không cần tích phân số, nên không có sai số tích lũy:
 *   thời gian  t(b) = (60 / k) · ln(1 + k·b / bpm0)       (k = số BPM tăng thêm mỗi beat)
 *   beat       b(t) = (bpm0 / k) · (exp(k·t / 60) − 1)
 *
 * Thời gian ở đây là giây tính từ beat 0. Trước beat 0 (t < 0) coi như BPM đầu tiên kéo dài ngược về trước.
 */

interface Segment {
  readonly startBeat: number;
  /** Giây tính từ beat 0 tại startBeat. */
  readonly startTime: number;
  readonly bpmStart: number;
  /** BPM tại endBeat. Bằng bpmStart nếu đoạn không đổi BPM. */
  bpmEnd: number;
  /** Infinity với đoạn cuối cùng (BPM giữ nguyên mãi mãi). */
  endBeat: number;
}

const FLAT = 1e-9;

export class TempoMap {
  /** Tăng mỗi khi bản đồ bị đổi, để nơi đã lên lịch dựa trên nó (tiếng tích tắc...) biết mà tính lại. */
  version = 0;

  private readonly segments: Segment[];

  constructor(initialBpm: number) {
    assertBpm(initialBpm);
    this.segments = [{ startBeat: 0, startTime: 0, bpmStart: initialBpm, bpmEnd: initialBpm, endBeat: Infinity }];
  }

  bpmAtBeat(beat: number): number {
    return bpmWithin(this.segmentAtBeat(beat), beat);
  }

  /** Giây (từ beat 0) mà beat này diễn ra. */
  timeAtBeat(beat: number): number {
    const segment = this.segmentAtBeat(beat);
    return segment.startTime + secondsFor(segment, beat - segment.startBeat);
  }

  /** Vị trí beat (số thực) tại thời điểm này. */
  beatAtTime(time: number): number {
    const segment = this.segmentAtTime(time);
    return segment.startBeat + beatsAfter(segment, time - segment.startTime);
  }

  /**
   * Đổi BPM kể từ `atBeat`: tức thì (`overBeats` = 0) hoặc tăng/giảm dần trong `overBeats` beat.
   * Mọi thay đổi đã khai báo SAU `atBeat` bị bỏ đi; vị trí beat và thời gian trước `atBeat` giữ nguyên.
   * Gọi lần lượt theo thứ tự beat tăng dần để dựng một đường tempo, hoặc gọi ở "beat hiện tại" để đổi tempo giữa trận.
   */
  change(atBeat: number, bpm: number, overBeats = 0): void {
    assertBpm(bpm);
    if (!(atBeat >= 0)) throw new Error(`TempoMap.change: beat ${atBeat} không hợp lệ`);
    if (!(overBeats >= 0)) throw new Error(`TempoMap.change: overBeats ${overBeats} không hợp lệ`);

    const index = this.indexAtBeat(atBeat);
    const current = this.segments[index] as Segment;
    const fromBpm = bpmWithin(current, atBeat);
    const startTime = this.timeAtBeat(atBeat);

    // Cắt bỏ mọi thứ từ atBeat trở đi.
    this.segments.length = index + 1;
    if (current.startBeat === atBeat) {
      this.segments.pop();
    } else {
      current.bpmEnd = fromBpm;
      current.endBeat = atBeat;
    }

    if (overBeats > 0) {
      const ramp: Segment = { startBeat: atBeat, startTime, bpmStart: fromBpm, bpmEnd: bpm, endBeat: atBeat + overBeats };
      this.segments.push(ramp);
      this.segments.push({
        startBeat: ramp.endBeat,
        startTime: startTime + secondsFor(ramp, overBeats),
        bpmStart: bpm,
        bpmEnd: bpm,
        endBeat: Infinity,
      });
    } else {
      this.segments.push({ startBeat: atBeat, startTime, bpmStart: bpm, bpmEnd: bpm, endBeat: Infinity });
    }
    this.version++;
  }

  private indexAtBeat(beat: number): number {
    return this.search((segment) => segment.startBeat <= beat);
  }

  private segmentAtBeat(beat: number): Segment {
    return this.segments[this.indexAtBeat(beat)] as Segment;
  }

  private segmentAtTime(time: number): Segment {
    return this.segments[this.search((segment) => segment.startTime <= time)] as Segment;
  }

  /** Chỉ số của đoạn cuối cùng thoả `startsBefore` (các đoạn xếp theo thứ tự thời gian); mặc định đoạn đầu. */
  private search(startsBefore: (segment: Segment) => boolean): number {
    let low = 0;
    let high = this.segments.length - 1;
    while (low < high) {
      const mid = (low + high + 1) >> 1;
      if (startsBefore(this.segments[mid] as Segment)) low = mid;
      else high = mid - 1;
    }
    return low;
  }
}

function assertBpm(bpm: number): void {
  if (!(bpm > 0) || !Number.isFinite(bpm)) throw new Error(`BPM không hợp lệ: ${bpm}`);
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
