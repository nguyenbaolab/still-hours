import type { TempoMap } from "../core/tempo-map";
import type { StillFeel } from "../data/flow-feel";

/**
 * Đứng yên thì thế giới hiện ra (cư dân 2, boss lượt 2). Cùng kiểu với `Pace`: chỉ gọi `TempoMap.setPace`, không giữ
 * bản đồ nhịp của riêng mình. Đứng yên liên tục `stillSeconds` thì hạ hệ số xuống `pace` từ beat nguyên kế tiếp; di
 * chuyển lại thì hồi về 1, cũng từ beat nguyên kế tiếp (đổi giữa một beat sẽ làm tiếng tích lệch lưới).
 *
 * Thời gian đo bằng giờ nghe được (đồng hồ âm thanh), không đếm tick, nên không lệch khi khung hình giật.
 * Cảnh nền (`backdrop`, 0..1) hiện dần khi đã đứng yên đủ và tắt nhanh khi di chuyển.
 */
export class Stillness {
  /** Đang hạ nhịp vì đứng yên. */
  active = false;
  /** Độ hiện của cảnh nền, 0..1. */
  backdrop = 0;

  private stillSince: number | null = null;

  constructor(
    private readonly tempo: TempoMap,
    private readonly feel: StillFeel,
  ) {}

  /**
   * Gọi một lần mỗi tick. `time`, `beat`: giờ và beat nghe được của tick này; `still`: xem `isStill`; `dt`: giây một tick.
   */
  update(time: number, beat: number, still: boolean, dt: number): void {
    const next = Math.max(0, Math.floor(beat) + 1);
    if (still) {
      this.stillSince ??= time;
      if (!this.active && time - this.stillSince >= this.feel.stillSeconds) {
        this.active = true;
        this.tempo.setPace(next, this.feel.pace);
      }
    } else {
      this.stillSince = null;
      if (this.active) {
        this.active = false;
        this.tempo.setPace(next, 1);
      }
    }
    const step = this.active ? dt / this.feel.fadeInSeconds : -dt / this.feel.fadeOutSeconds;
    this.backdrop = Math.min(1, Math.max(0, this.backdrop + step));
  }
}

/**
 * Tick này có tính là đứng yên không: không có input di chuyển, và bánh răng dịch (kể cả bị lực hút kéo) không quá
 * `maxStepPx`. `stepPx` là quãng từ vị trí đầu tick tới vị trí cuối tick.
 */
export function isStill(moveInput: boolean, stepPx: number, feel: StillFeel): boolean {
  return !moveInput && stepPx <= feel.maxStepPx;
}