import type { TimeSource } from "../core/beat-clock";
import { clamp } from "../core/math";
import { AMBIENCE_FEEL, type AmbienceFeel } from "../data/flow-feel";
import type { AudioFeel } from "../data/rhythm-feel";
import { playCue as synthCue, type CueName } from "./cues";
import { createTickSink } from "./tick-sound";
import { createWindBed, type WindBed } from "./wind";
import type { TickSink } from "./tick-scheduler";

/** Phần của âm thanh mà trận đấu cần. AudioEngine thật hiện thực nó; kiểm thử dùng bản giả. */
export interface AudioPort extends TimeSource {
  /** Thời gian thô của AudioContext (giây), hệ thời gian dùng để hẹn giờ phát âm thanh. */
  contextTime(): number;
  readonly tickSink: TickSink | null;
  /** Tiếng tích xa (nhỏ, đục) cho lớp nền thị trấn và màn bắt đầu. Null nếu không có âm thanh. */
  readonly distantSink: TickSink | null;
  readonly muted: boolean;
  toggleMute(): void;
  /** Tiếng phản hồi ngay lập tức (ôm / nhả một câu). Đi qua gain tổng, nên tắt tiếng là tắt luôn. */
  playCue(cue: CueName, hz?: number): void;
  /** Độ to của gió nền (0 = im), vào/ra dần. Chưa mở khóa âm thanh thì nhớ lại và áp dụng khi mở khóa. */
  setWind(level: number): void;
}

/** Độ trễ đầu ra (giây) tối đa chấp nhận; số báo cáo vô lý hơn thế bị cắt. */
const MAX_LATENCY_SECONDS = 0.25;
const MUTE_FADE_SECONDS = 0.02;

/**
 * Quản lý AudioContext: mở khóa (trình duyệt chặn âm thanh tới khi người dùng tương tác), tắt/bật tiếng,
 * và là NGUỒN THỜI GIAN CHỦ của trận (xem BeatClock).
 *
 * Vì sao đồng hồ âm thanh là chủ: tiếng tích tắc chạy theo đồng hồ phần cứng của thiết bị âm thanh, còn vòng lặp
 * game chạy theo khung hình. Hai đồng hồ có tốc độ hơi khác nhau và vòng lặp game còn bỏ mất thời gian mỗi khi
 * khựng, nên nếu đạn đếm theo tick thì sau vài phút sẽ lệch tiếng. Lấy chính đồng hồ âm thanh làm gốc thì cả hai
 * cùng đọc một thước đo.
 */
export class AudioEngine implements AudioPort {
  tickSink: TickSink | null = null;
  distantSink: TickSink | null = null;

  private wind: WindBed | null = null;
  private windLevel = 0;
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private unlocked = false;
  private unavailable = false;
  private pausedByVisibility = false;
  private lastHeard = 0;
  private _muted = false;

  constructor(
    private readonly feel: AudioFeel,
    private readonly visualDelaySeconds: number,
    private readonly ambience: AmbienceFeel = AMBIENCE_FEEL,
  ) {
    if (typeof AudioContext === "undefined") {
      this.unavailable = true;
      return;
    }

    // Phải tạo/resume AudioContext NGAY TRONG sự kiện của người dùng thì mọi trình duyệt (kể cả Safari) mới cho phát.
    const unlock = (): void => this.unlock();
    for (const type of ["keydown", "pointerdown", "touchend"] as const) {
      window.addEventListener(type, unlock, { capture: true });
    }

    // Tab bị ẩn thì tạm dừng đồng hồ âm thanh: trận đấu tạm dừng theo, không bị "trôi" qua lúc vắng mặt.
    document.addEventListener("visibilitychange", () => {
      const ctx = this.ctx;
      if (!ctx || !this.unlocked) return;
      if (document.hidden) {
        this.pausedByVisibility = true;
        void ctx.suspend();
      } else if (this.pausedByVisibility) {
        this.pausedByVisibility = false;
        void ctx.resume();
      }
    });
  }

  /** Sẵn sàng bắt đầu trận: người dùng đã tương tác (âm thanh chạy), hoặc không có âm thanh để mà chờ. */
  get ready(): boolean {
    return this.unlocked || this.unavailable;
  }

  get muted(): boolean {
    return this._muted;
  }

  toggleMute(): void {
    this._muted = !this._muted;
    this.applyVolume();
  }

  /** Đặt trạng thái tắt tiếng (đọc từ cài đặt lúc khởi động). Chưa mở khóa âm thanh cũng được. */
  setMuted(muted: boolean): void {
    this._muted = muted;
    this.applyVolume(true);
  }

  playCue(cue: CueName, hz?: number): void {
    if (!this.ctx || !this.master || !this.unlocked) return;
    synthCue(this.ctx, this.master, cue, this.ctx.currentTime, hz);
  }

  setWind(level: number): void {
    this.windLevel = Math.max(0, level);
    this.wind?.setLevel(this.windLevel, this.ambience.windFadeSeconds);
  }

  contextTime(): number {
    return this.ctx ? this.ctx.currentTime : performance.now() / 1000;
  }

  /**
   * Thời điểm (hệ thời gian AudioContext) của âm thanh đang ĐƯỢC NGHE ngay lúc này: thời gian thô trừ độ trễ đầu ra,
   * để đạn xuất hiện đúng lúc người chơi nghe thấy tiếng tích. Đơn điệu tăng (không bao giờ đi lùi).
   * Chỉ gọi sau khi `ready` (trước đó AudioContext chưa chạy, thời gian chưa có nghĩa).
   */
  heardTime(): number {
    const ctx = this.ctx;
    const latency = ctx ? clamp(ctx.outputLatency || ctx.baseLatency || 0, 0, MAX_LATENCY_SECONDS) : 0;
    this.lastHeard = Math.max(this.lastHeard, this.contextTime() - latency - this.visualDelaySeconds);
    return this.lastHeard;
  }

  private unlock(): void {
    if (this.unlocked) return;

    if (!this.ctx) {
      try {
        const ctx = new AudioContext({ latencyHint: "interactive" });
        const master = ctx.createGain();
        master.connect(ctx.destination);
        this.ctx = ctx;
        this.master = master;
        this.tickSink = createTickSink(ctx, master, this.feel);
        this.distantSink = createTickSink(ctx, master, this.feel, {
          gain: this.ambience.distantGain,
          softnessHz: this.ambience.distantSoftnessHz,
        });
        this.wind = createWindBed(ctx, master, this.ambience);
        this.wind.setLevel(this.windLevel, 0);
        this.applyVolume(true);
        ctx.addEventListener("statechange", () => this.syncState());
      } catch {
        this.unavailable = true;
        return;
      }
    }

    // Bị từ chối (ví dụ phím vừa bấm không tính là tương tác) thì thôi, lần bấm sau sẽ thử lại.
    this.ctx.resume().then(
      () => this.syncState(),
      () => undefined,
    );
  }

  private syncState(): void {
    if (this.ctx?.state === "running") this.unlocked = true;
  }

  private applyVolume(immediate = false): void {
    if (!this.ctx || !this.master) return;
    const target = this._muted ? 0 : this.feel.volume;
    if (immediate) this.master.gain.value = target;
    else this.master.gain.setTargetAtTime(target, this.ctx.currentTime, MUTE_FADE_SECONDS);
  }
}
