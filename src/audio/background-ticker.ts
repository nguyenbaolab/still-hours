import { TickScheduler, type TickSink } from "./tick-scheduler";
import { BeatClock, type TimeSource } from "../core/beat-clock";

/** Phần của âm thanh mà tiếng tích nền cần. */
export interface TickerAudio extends TimeSource {
  contextTime(): number;
}

/**
 * Một tiếng tích nền đều đặn (thị trấn: xa, 40 BPM; màn bắt đầu: mỗi giây một tiếng). Dùng đúng đồng hồ nhịp và bộ lên lịch
 * của pha trận (đồng hồ âm thanh làm chủ), chỉ khác là không có gì đi theo nhịp này. `stop()` hủy mọi tiếng đã hẹn
 * mà chưa phát; sau đó `update()` không làm gì.
 */
export class BackgroundTicker {
  private readonly clock: BeatClock;
  private readonly ticks: TickScheduler;
  private running = true;

  constructor(audio: TickerAudio, bpm: number, sink: TickSink | null, delaySeconds: number) {
    this.clock = new BeatClock(audio, bpm, audio.contextTime() + delaySeconds);
    this.ticks = new TickScheduler(this.clock, () => audio.contextTime(), sink);
  }

  get active(): boolean {
    return this.running;
  }

  update(): void {
    if (!this.running) return;
    this.clock.update();
    this.ticks.update();
  }

  stop(): void {
    if (!this.running) return;
    this.running = false;
    this.ticks.dropPending();
  }
}