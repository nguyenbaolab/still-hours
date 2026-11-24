import type { SketchFeel } from "../data/sketch-feel";

/** Một đoạn nét chì. Danh sách đoạn là dữ liệu gốc, để dựng lại tranh, không phải pixel. */
export interface StrokeSegment {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
  length: number;
  width: number;
}

/**
 * Nét đường đi của bánh răng. Chỉ thêm đoạn khi dời khỏi điểm mẫu trước một khoảng tối thiểu.
 * Nhấc bút (`lift`) thì điểm tới không nối với nét cũ.
 */
export class Sketch {
  readonly segments: StrokeSegment[] = [];

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

  /** Nhấc bút. Điểm tới không nối với nét cũ. */
  lift(): void {
    this.started = false;
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
    });
    this.anchorX = x;
    this.anchorY = y;
  }
}

/** Một khúc của bản tua lại, theo thứ tự đã vẽ. Khúc cuối có thể bị cắt nếu mới tua tới giữa đoạn. */
export interface ReplayPiece {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
  width: number;
}

/** Phần nét đã được tua tới `drawnPx` px đường đi, từ đoạn cũ nhất. */
export function replayPieces(segments: readonly StrokeSegment[], drawnPx: number): ReplayPiece[] {
  const pieces: ReplayPiece[] = [];
  let left = drawnPx;
  for (const seg of segments) {
    if (!(left > 1e-9)) break;
    if (!(seg.length > 0)) continue;
    if (seg.length <= left + 1e-9) {
      pieces.push({ x0: seg.x0, y0: seg.y0, x1: seg.x1, y1: seg.y1, width: seg.width });
      left -= seg.length;
      continue;
    }
    const t = left / seg.length;
    pieces.push({
      x0: seg.x0,
      y0: seg.y0,
      x1: seg.x0 + (seg.x1 - seg.x0) * t,
      y1: seg.y0 + (seg.y1 - seg.y0) * t,
      width: seg.width,
    });
    break;
  }
  return pieces;
}
