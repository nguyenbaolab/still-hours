import type { TempoMap } from "../core/tempo-map";
import type { BulletEvent, Pattern, PatternEvent, TempoEvent } from "../data/pattern-types";
import type { BulletFeel } from "../data/rhythm-feel";
import { handlerFor, type SpawnContext } from "./spawners";

/** Một sự kiện đạn đã được xếp lịch (beat/giờ tuyệt đối trong cả trận, không phải trong một vòng). */
interface Scheduled {
  readonly event: BulletEvent;
  readonly fireBeat: number;
  /** Giây (theo đồng hồ nhịp, tính từ beat 0). */
  readonly fireTime: number;
  readonly warnBeat: number;
  readonly warnTime: number;
  /** Hướng nhắm đã khóa lúc bắt đầu cảnh báo (rad), nếu có. */
  aim: number | null;
}

const isTempo = (event: PatternEvent): event is TempoEvent => event.type === "tempo";

/**
 * Kiểm tra pattern; trả về danh sách lỗi (rỗng = hợp lệ). Chủ yếu để bắt lỗi khi viết dữ liệu mới,
 * nhất là QUY TẮC CÔNG BẰNG: đạn lớn/nguy hiểm không được thiếu cảnh báo.
 */
export function validatePattern(pattern: Pattern, feel: BulletFeel): string[] {
  const problems: string[] = [];
  const fail = (index: number, message: string): void => {
    problems.push(`${pattern.name} [sự kiện ${index}]: ${message}`);
  };
  const fraction = (value: unknown): boolean => typeof value === "number" && value >= 0 && value <= 1;

  if (!(pattern.lengthBeats > 0)) problems.push(`${pattern.name}: lengthBeats phải > 0`);
  if (pattern.bpm !== undefined && !(pattern.bpm > 0)) problems.push(`${pattern.name}: bpm phải > 0`);

  pattern.events.forEach((event, i) => {
    if (!Number.isFinite(event.beat) || event.beat < 0 || event.beat >= pattern.lengthBeats) {
      fail(i, `beat ${event.beat} nằm ngoài [0, ${pattern.lengthBeats})`);
    }

    switch (event.type) {
      case "tempo":
        if (!(event.bpm > 0)) fail(i, "tempo: bpm phải > 0");
        if ((event.overBeats ?? 0) < 0) fail(i, "tempo: overBeats không được âm");
        return;
      case "straight":
      case "aimed": {
        if (!fraction(event.at)) fail(i, `at ${event.at} phải trong [0, 1]`);
        const count = event.count ?? 1;
        if (!(count >= 1)) fail(i, "count phải >= 1");
        if (event.type === "straight" && !fraction(event.at + (count - 1) * (event.spacing ?? 0.2))) {
          fail(i, "hàng đạn tràn ra ngoài cạnh (at + (count-1)·spacing phải trong [0, 1])");
        }
        break;
      }
      case "burst":
        if (!fraction(event.x) || !fraction(event.y)) fail(i, "burst: x, y phải trong [0, 1]");
        if (!(event.count >= 1)) fail(i, "burst: count phải >= 1");
        break;
      case "sweep":
        if (!fraction(event.x) || !fraction(event.y)) fail(i, "sweep: x, y phải trong [0, 1]");
        if (!(event.length > 0)) fail(i, "sweep: length phải > 0");
        if (!(event.durationBeats > 0)) fail(i, "sweep: durationBeats phải > 0");
        if (!((event.hands ?? 1) >= 1)) fail(i, "sweep: hands phải >= 1");
        break;
    }

    // Công bằng: đạn lớn/nguy hiểm phải được báo trước.
    if (handlerFor(event).needsTelegraph(event, feel) && event.telegraphBeats !== undefined && !(event.telegraphBeats > 0)) {
      fail(i, `${event.type} là đạn lớn/nguy hiểm, bắt buộc có cảnh báo (telegraphBeats > 0)`);
    }
  });

  return problems;
}

/**
 * Chạy một pattern theo beat: tạo cảnh báo trước và sinh đạn đúng beat, lặp lại khi hết vòng, và áp dụng
 * các sự kiện đổi tempo lên TempoMap.
 *
 * Mọi thứ đi theo BEAT của đồng hồ nhịp (không theo tick), nên đạn khớp tiếng tích tắc. Mỗi vòng được "triển khai"
 * thành lịch tuyệt đối trước một vòng, để cảnh báo của những đạn ngay đầu vòng sau (bắt đầu từ cuối vòng trước)
 * và tempo của vòng sau đều đã sẵn khi cần.
 */
export class PatternRunner {
  /** Vòng hiện tại (0 = vòng đầu). */
  cycle = 0;

  private readonly bulletEvents: BulletEvent[];
  private readonly tempoEvents: TempoEvent[];
  private readonly startBpm: number;
  private expandedCycles = 0;

  private warnQueue: Scheduled[] = [];
  private fireQueue: Scheduled[] = [];
  private warnCursor = 0;
  private fireCursor = 0;

  constructor(
    private readonly pattern: Pattern,
    private readonly tempo: TempoMap,
    private readonly feel: BulletFeel,
    defaultBpm: number,
  ) {
    const problems = validatePattern(pattern, feel);
    if (problems.length > 0) throw new Error(`Pattern không hợp lệ:\n${problems.join("\n")}`);

    // Sắp xếp theo beat; sort ổn định nên các sự kiện cùng beat giữ nguyên thứ tự khai báo.
    const sorted = [...pattern.events].sort((a, b) => a.beat - b.beat);
    this.tempoEvents = sorted.filter(isTempo);
    this.bulletEvents = sorted.filter((event): event is BulletEvent => !isTempo(event));
    this.startBpm = pattern.bpm ?? defaultBpm;
  }

  /** Gọi mỗi tick (sau `BulletWorld.step`). `ctx` mang vị trí người chơi hiện tại để nhắm đạn. */
  update(beat: number, ctx: SpawnContext): void {
    const length = this.pattern.lengthBeats;
    this.cycle = this.pattern.loop ? Math.max(0, Math.floor(beat / length)) : 0;

    const wanted = this.pattern.loop ? this.cycle + 2 : 1;
    while (this.expandedCycles < wanted) this.expandCycle(this.expandedCycles++);

    // Cảnh báo trước, đạn sau: nếu một khung hình giật làm cả hai tới hạn cùng lúc thì hướng nhắm vẫn được khóa trước.
    while (this.warnCursor < this.warnQueue.length) {
      const scheduled = this.warnQueue[this.warnCursor] as Scheduled;
      if (scheduled.warnBeat > beat) break;
      this.warnCursor++;
      const aim = handlerFor(scheduled.event).warn(ctx, scheduled.event, scheduled.warnTime, scheduled.fireTime);
      scheduled.aim = aim;
    }
    while (this.fireCursor < this.fireQueue.length) {
      const scheduled = this.fireQueue[this.fireCursor] as Scheduled;
      if (scheduled.fireBeat > beat) break;
      this.fireCursor++;
      handlerFor(scheduled.event).spawn(ctx, scheduled.event, scheduled.aim, scheduled.fireTime, scheduled.fireBeat);
    }

    // Dọn phần đã xử lý để hàng đợi không phình mãi khi lặp lâu.
    if (this.warnCursor > 64) {
      this.warnQueue.splice(0, this.warnCursor);
      this.warnCursor = 0;
    }
    if (this.fireCursor > 64) {
      this.fireQueue.splice(0, this.fireCursor);
      this.fireCursor = 0;
    }
  }

  /** Xếp lịch tuyệt đối cho một vòng: áp tempo, rồi tính giờ cảnh báo và giờ sinh đạn của từng sự kiện. */
  private expandCycle(cycle: number): void {
    const base = cycle * this.pattern.lengthBeats;

    // Đầu mỗi vòng sau, BPM trở về BPM khởi đầu; sau đó áp các sự kiện tempo của vòng này, theo thứ tự beat.
    if (cycle > 0) this.tempo.change(base, this.startBpm, 0);
    for (const event of this.tempoEvents) this.tempo.change(base + event.beat, event.bpm, event.overBeats ?? 0);

    const warns: Scheduled[] = [];
    const fires: Scheduled[] = [];
    for (const event of this.bulletEvents) {
      const fireBeat = base + event.beat;
      const fireTime = this.tempo.timeAtBeat(fireBeat);
      const warnBeats = event.telegraphBeats ?? (handlerFor(event).needsTelegraph(event, this.feel) ? this.feel.telegraphBeats : 0);

      let warnBeat = fireBeat;
      let warnTime = fireTime;
      if (warnBeats > 0) {
        // Cảnh báo kéo dài `warnBeats` beat nhưng không ngắn hơn telegraphMinSeconds (BPM cao thì 1 beat quá ngắn).
        const seconds = Math.max(fireTime - this.tempo.timeAtBeat(fireBeat - warnBeats), this.feel.telegraphMinSeconds);
        warnTime = fireTime - seconds;
        warnBeat = this.tempo.beatAtTime(warnTime);
      }

      const scheduled: Scheduled = { event, fireBeat, fireTime, warnBeat, warnTime, aim: null };
      fires.push(scheduled);
      if (warnBeats > 0) warns.push(scheduled);
    }

    this.warnQueue.splice(0, this.warnCursor);
    this.warnCursor = 0;
    this.warnQueue.push(...warns);
    this.warnQueue.sort((a, b) => a.warnBeat - b.warnBeat);

    this.fireQueue.splice(0, this.fireCursor);
    this.fireCursor = 0;
    this.fireQueue.push(...fires);
    this.fireQueue.sort((a, b) => a.fireBeat - b.fireBeat);
  }
}
