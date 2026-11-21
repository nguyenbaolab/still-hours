import { TempoMap } from "./tempo-map";

/** Nguồn thời gian chủ của trận. Trong game thật là đồng hồ phần cứng của AudioContext (xem AudioEngine). */
export interface TimeSource {
  /** Giây, đơn điệu tăng: thời điểm âm thanh ĐANG ĐƯỢC NGHE THẤY (đã trừ độ trễ đầu ra), cùng hệ với `origin`. */
  heardTime(): number;
}

/**
 * Đồng hồ nhịp chung của một trận. Beat là hàm của thời gian nguồn chứ KHÔNG đếm theo tick,
 * nên đạn (xuất hiện khi beat tới) và tiếng tích tắc (lên lịch theo cùng bản đồ tempo) không thể lệch dần.
 *
 * Gọi `update()` một lần ở đầu mỗi tick; trong tick đó mọi nơi đọc `time`/`beat`/`bpm` đều thấy cùng một giá trị.
 */
export class BeatClock {
  readonly tempo: TempoMap;

  /** Giây tính từ `origin` (hệ thời gian của nguồn). Âm trong lúc dạo đầu trước beat 0. */
  time = 0;
  /** Vị trí beat hiện tại (số thực, âm trước beat 0). */
  beat = 0;
  bpm: number;

  /** `origin`: thời điểm (theo hệ thời gian của nguồn) mà beat 0 diễn ra. */
  constructor(
    private readonly source: TimeSource,
    initialBpm: number,
    readonly origin: number,
  ) {
    this.tempo = new TempoMap(initialBpm);
    this.bpm = initialBpm;
    this.update();
  }

  update(): void {
    this.time = this.source.heardTime() - this.origin;
    this.beat = this.tempo.beatAtTime(this.time);
    this.bpm = this.tempo.bpmAtBeat(this.beat);
  }
}
