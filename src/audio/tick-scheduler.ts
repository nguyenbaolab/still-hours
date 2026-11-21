import type { BeatClock } from "../core/beat-clock";

/** "Tích" ở beat chẵn, "tắc" ở beat lẻ. */
export type TickKind = "tick" | "tock";

/**
 * Nơi phát ra tiếng. Tách khỏi bộ lên lịch để sau này thay bằng file âm thanh thật (cùng giao diện),
 * và để kiểm thử logic lên lịch mà không cần trình duyệt.
 */
export interface TickSink {
  /** Phát tiếng vào đúng thời điểm `time` (giây, hệ thời gian của AudioContext). Trả về hàm hủy nếu chưa phát. */
  play(time: number, kind: TickKind): { cancel(): void };
}

/** Lên lịch trước bấy nhiêu giây: đủ dài để vài khung hình giật cũng không làm lỡ nhịp. */
const LOOKAHEAD_SECONDS = 0.2;
/** Beat đã trễ quá mức này (ví dụ tab bị treo) thì bỏ qua thay vì phát muộn, để nhịp không bị "dồn cục". */
const LATE_TOLERANCE_SECONDS = 0.03;
/** Tiếng sắp phát trong khoảng này thì không hủy khi tempo đổi (đã quá gần để hủy an toàn). */
const CANCEL_SAFETY_SECONDS = 0.02;

interface Pending {
  readonly beat: number;
  readonly time: number;
  readonly cancel: () => void;
}

/**
 * Lên lịch tiếng tích tắc theo đúng bản đồ tempo của BeatClock bằng thời gian của AudioContext.
 *
 * Vì sao lên lịch trước thay vì phát khi vòng lặp game chạy tới: vòng lặp game đi theo khung hình (jitter hàng chục ms),
 * còn AudioContext phát chính xác tới từng mẫu âm thanh tại thời điểm đã hẹn. Mỗi beat n được hẹn đúng lúc
 * `origin + tempo.timeAtBeat(n)`: công thức, không cộng dồn, nên không bao giờ lệch dần.
 */
export class TickScheduler {
  private nextBeat = 0;
  private pending: Pending[] = [];
  private seenVersion: number;

  constructor(
    private readonly clock: BeatClock,
    /** Thời gian thô của AudioContext (currentTime), dùng để biết cái gì đã/chưa phát. */
    private readonly contextTime: () => number,
    /** Null nếu không có âm thanh (trình duyệt không hỗ trợ): chỉ đếm beat. */
    private readonly sink: TickSink | null,
  ) {
    this.seenVersion = clock.tempo.version;
  }

  /** Gọi mỗi tick. Lên lịch mọi beat sẽ rơi vào khoảng `LOOKAHEAD_SECONDS` sắp tới. */
  update(): void {
    const now = this.contextTime();
    const { tempo } = this.clock;
    const origin = this.clock.scheduleOrigin;

    // Bỏ những tiếng đã phát xong khỏi danh sách chờ.
    let kept = 0;
    for (const item of this.pending) {
      if (item.time > now) this.pending[kept++] = item;
    }
    this.pending.length = kept;

    // Tempo bị đổi sau khi đã hẹn: những tiếng chưa phát có thể sai giờ, hủy và hẹn lại theo bản đồ mới.
    // Tiếng sắp phát trong khoảnh khắc nữa thì để yên (luồng âm thanh có thể đã nhận nó rồi; hủy muộn sẽ phát dở).
    if (tempo.version !== this.seenVersion) {
      this.seenVersion = tempo.version;
      let keep = 0;
      while (keep < this.pending.length && (this.pending[keep] as Pending).time <= now + CANCEL_SAFETY_SECONDS) keep++;
      const firstCancelled = this.pending[keep];
      if (firstCancelled) this.nextBeat = firstCancelled.beat;
      for (let i = keep; i < this.pending.length; i++) (this.pending[i] as Pending).cancel();
      this.pending.length = keep;
    }

    for (;;) {
      const time = origin + tempo.timeAtBeat(this.nextBeat);
      if (time > now + LOOKAHEAD_SECONDS) break;

      if (this.sink && time >= now - LATE_TOLERANCE_SECONDS) {
        const kind: TickKind = this.nextBeat % 2 === 0 ? "tick" : "tock";
        const handle = this.sink.play(Math.max(time, now), kind);
        this.pending.push({ beat: this.nextBeat, time, cancel: handle.cancel });
      }
      this.nextBeat++;
    }
  }

  /**
   * Hủy tiếng đã hẹn mà chưa phát, và hẹn lại từ beat chưa tới.
   * Dùng khi nhịp bị giữ (xem tranh): mốc hẹn đổi, tiếng đã xếp theo mốc cũ sẽ sớm.
   */
  dropPending(): void {
    const now = this.contextTime();
    for (const item of this.pending) item.cancel();
    this.pending.length = 0;
    const { tempo } = this.clock;
    const origin = this.clock.scheduleOrigin;
    let beat = Math.max(0, Math.ceil(this.clock.beat - 1e-4));
    for (let guard = 0; guard < 100000 && origin + tempo.timeAtBeat(beat) <= now + 1e-4; guard++) beat++;
    this.nextBeat = beat;
    this.seenVersion = tempo.version;
  }
}
