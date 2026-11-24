/**
 * Dụng cụ cho test (không nằm trong bản build của game): đồng hồ âm thanh giả, mô phỏng khung hình giật/treo,
 * và tích phân số độc lập để đối chiếu với công thức của engine.
 */
import type { AudioPort } from "../audio/audio-engine";
import type { CueName } from "../audio/cues";
import type { TickKind, TickSink } from "../audio/tick-scheduler";

/** Bộ sinh số giả ngẫu nhiên xác định (cùng seed → cùng dãy), để test lặp lại được. */
export function lcg(seed: number): () => number {
  let state = seed >>> 0;
  return () => ((state = (Math.imul(state, 1664525) + 1013904223) >>> 0) / 2 ** 32);
}

/** Tích phân Simpson. `steps` phải chẵn. Hàm phải mượt trên [a, b] (chia nhỏ ở các điểm gãy trước khi gọi). */
export function simpson(f: (x: number) => number, a: number, b: number, steps = 2000): number {
  const h = (b - a) / steps;
  let sum = f(a) + f(b);
  for (let i = 1; i < steps; i++) sum += f(a + i * h) * (i % 2 === 1 ? 4 : 2);
  return (sum * h) / 3;
}

export interface PlayRecord {
  /** Thời điểm được hẹn phát (hệ thời gian AudioContext). */
  time: number;
  kind: TickKind;
  /** Giờ của đồng hồ âm thanh lúc bộ lên lịch gọi `play`. */
  calledAt: number;
  cancelled: boolean;
}

/** Đồng hồ âm thanh giả: tiến theo từng "khung hình" do `simulate` quyết định, ghi lại mọi tiếng được hẹn. */
export class FakeAudio implements AudioPort {
  /** Giờ thô của AudioContext (giây). */
  t: number;
  muted = false;
  readonly plays: PlayRecord[] = [];
  readonly cues: CueName[] = [];
  readonly tickSink: TickSink;

  constructor(
    start = 5,
    /** Độ trễ đầu ra giả (giây): đồng hồ "nghe thấy" chậm hơn giờ thô chừng này. */
    readonly latency = 0.03,
  ) {
    this.t = start;
    this.tickSink = {
      play: (time, kind) => {
        const record: PlayRecord = { time, kind, calledAt: this.t, cancelled: false };
        this.plays.push(record);
        return {
          cancel: () => {
            record.cancelled = true;
          },
        };
      },
    };
  }

  contextTime(): number {
    return this.t;
  }

  heardTime(): number {
    return this.t - this.latency;
  }

  toggleMute(): void {
    this.muted = !this.muted;
  }

  playCue(cue: CueName): void {
    this.cues.push(cue);
  }
}

export interface SimulateOptions {
  /** Tổng thời gian mô phỏng (giây). */
  seconds: number;
  audio: FakeAudio;
  /** Gọi một lần mỗi "khung hình", sau khi đồng hồ âm thanh đã tiến `dt`. */
  step: (dt: number) => void;
  /** Mỗi khung hình dài 1/60 s ± jitter (giây). */
  jitter?: number;
  /** Một lần treo: khung hình bắt đầu từ `at` giây kéo dài `length` giây. */
  stall?: { at: number; length: number };
  seed?: number;
  /** Kiểm tra sau mỗi khung hình; trả về true thì dừng sớm. */
  stopWhen?: () => boolean;
}

/** Chạy các khung hình có jitter (và tùy chọn một lần treo). Trả về độ dài từng khung hình. */
export function simulate({ seconds, audio, step, jitter = 0.004, stall, seed = 1, stopWhen }: SimulateOptions): number[] {
  const random = lcg(seed);
  const frames: number[] = [];
  let elapsed = 0;
  let stalled = false;
  while (elapsed < seconds) {
    let dt = 1 / 60 + (random() * 2 - 1) * jitter;
    if (stall && !stalled && elapsed >= stall.at) {
      dt = stall.length;
      stalled = true;
    }
    elapsed += dt;
    audio.t += dt;
    frames.push(dt);
    step(dt);
    if (stopWhen?.()) break;
  }
  return frames;
}
