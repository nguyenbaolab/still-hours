import type { SketchFeel } from "../data/sketch-feel";

/** Một đoạn nét chì. Danh sách đoạn là dữ liệu gốc, để tẩy và dựng lại tranh, không phải pixel. */
export interface StrokeSegment {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
  length: number;
  width: number;
  /** Đã bị tẩy. Vẫn giữ để vẽ vết mờ. */
  erased: boolean;
}

/** Một khúc vừa bị tẩy, theo thứ tự từ mới nhất về cũ. Cục gôm chạy dọc khúc này. */
export interface InkRun {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
  length: number;
  width: number;
}

/**
 * Nét đường đi của bánh răng. Chỉ thêm đoạn khi dời khỏi điểm mẫu trước một khoảng tối thiểu.
 * Tẩy đi ngược từ nét mới nhất, và cắt đôi đoạn nếu độ dài tẩy rơi giữa chừng.
 */
export class Sketch {
  readonly segments: StrokeSegment[] = [];
  /** Tăng mỗi lần tẩy, để lớp vẽ biết phải vẽ lại canvas phụ. */
  eraseGeneration = 0;

  private started = false;
  private anchorX = 0;
  private anchorY = 0;
  private liveWidth: number;

  constructor(private readonly feel: SketchFeel) {
    this.liveWidth = feel.width;
  }

  get count(): number {
    return this.segments.length;
  }

  /** Điểm mẫu gần nhất, để vẽ nét đang nối tới bánh răng. Null khi chưa có điểm nào. */
  get pen(): { x: number; y: number; width: number } | null {
    if (!this.started) return null;
    return { x: this.anchorX, y: this.anchorY, width: this.liveWidth };
  }

  /**
   * Ghi vị trí mới. `slow` = đang giữ Shift: nét đậm hơn và lấy mẫu dày hơn.
   * Đứng yên, hoặc chưa đi đủ khoảng mẫu, thì không sinh đoạn.
   */
  sample(x: number, y: number, slow: boolean): void {
    this.liveWidth = slow ? this.feel.slowWidth : this.feel.width;
    const min = slow ? this.feel.slowSampleDistance : this.feel.sampleDistance;
    if (!this.started) {
      this.started = true;
      this.anchorX = x;
      this.anchorY = y;
      return;
    }
    const dx = x - this.anchorX;
    const dy = y - this.anchorY;
    const dist = Math.hypot(dx, dy);
    if (dist < min) return;
    this.segments.push({
      x0: this.anchorX,
      y0: this.anchorY,
      x1: x,
      y1: y,
      length: dist,
      width: this.liveWidth,
      erased: false,
    });
    this.anchorX = x;
    this.anchorY = y;
  }

  /**
   * Tẩy `px` đường đi, từ đoạn mới nhất còn mực. Đoạn ngắn hơn phần còn lại thì tẩy hết rồi sang đoạn cũ hơn.
   * Đoạn dài hơn thì cắt: phần cũ giữ mực, phần mới thành vết tẩy.
   * Trả về các khúc vừa tẩy, mới nhất trước, để cục gôm chạy ngược.
   */
  erase(px: number): InkRun[] {
    if (!(px > 0)) return [];
    const taken: InkRun[] = [];
    let left = px;
    for (let i = this.segments.length - 1; i >= 0 && left > 0; i--) {
      const seg = this.segments[i] as StrokeSegment;
      if (seg.erased) continue;
      if (seg.length <= left + 1e-9) {
        seg.erased = true;
        left -= seg.length;
        taken.push(toRun(seg));
        continue;
      }
      const keep = seg.length - left;
      const t = keep / seg.length;
      const mx = seg.x0 + (seg.x1 - seg.x0) * t;
      const my = seg.y0 + (seg.y1 - seg.y0) * t;
      const erased: StrokeSegment = {
        x0: mx,
        y0: my,
        x1: seg.x1,
        y1: seg.y1,
        length: left,
        width: seg.width,
        erased: true,
      };
      seg.x1 = mx;
      seg.y1 = my;
      seg.length = keep;
      this.segments.splice(i + 1, 0, erased);
      taken.push(toRun(erased));
      left = 0;
    }
    if (taken.length > 0) this.eraseGeneration++;
    return taken;
  }
}

function toRun(seg: StrokeSegment): InkRun {
  return { x0: seg.x0, y0: seg.y0, x1: seg.x1, y1: seg.y1, length: seg.length, width: seg.width };
}

interface EraseJob {
  runs: InkRun[];
  traveled: number;
  total: number;
}

/** Cục gôm chạy ngược từ đầu mới của các khúc vừa tẩy. Phần chưa tới vẫn vẽ đè bằng mực. */
export class EraserPlay {
  private readonly jobs: EraseJob[] = [];

  push(runs: readonly InkRun[]): void {
    let total = 0;
    for (const run of runs) total += run.length;
    if (total <= 0) return;
    this.jobs.push({ runs: [...runs], traveled: 0, total });
  }

  /** `px` là quãng đường gôm đi trong tick này. */
  update(px: number): void {
    let left = px;
    while (left > 0 && this.jobs.length > 0) {
      const job = this.jobs[0] as EraseJob;
      const room = job.total - job.traveled;
      if (left >= room) {
        this.jobs.shift();
        left -= room;
      } else {
        job.traveled += left;
        left = 0;
      }
    }
  }

  /** Các khúc mực còn đè lên vết tẩy, và vị trí cục gôm. */
  overlay(): { segments: InkRun[]; tip: { x: number; y: number } | null } {
    const segments: InkRun[] = [];
    let tip: { x: number; y: number } | null = null;
    for (const job of this.jobs) {
      let skipped = 0;
      for (const run of job.runs) {
        const start = skipped;
        const end = skipped + run.length;
        skipped = end;
        if (job.traveled >= end) continue;
        const cut = Math.max(0, job.traveled - start);
        const xFrom = run.x1 + (run.x0 - run.x1) * (cut / run.length);
        const yFrom = run.y1 + (run.y0 - run.y1) * (cut / run.length);
        if (tip === null) tip = { x: xFrom, y: yFrom };
        segments.push({ x0: run.x0, y0: run.y0, x1: xFrom, y1: yFrom, length: run.length - cut, width: run.width });
      }
    }
    return { segments, tip };
  }
}
