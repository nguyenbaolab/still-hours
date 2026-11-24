import { GAME_HEIGHT, GAME_WIDTH } from "../core/config";
import type { StrokeSegment } from "./sketch";

/**
 * Lớp nét chì vẽ sẵn lên một canvas phụ, chỉ thêm đoạn mới mỗi khung hình. Vẽ cả lớp một lần với độ đậm
 * cố định nên các đoạn chồng nhau không đậm lên từng chỗ. Canvas tạo lười ở lần `sync` đầu tiên:
 * test chạy trong Node không có DOM thì không bao giờ gọi tới.
 */
export class InkLayer {
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  private drawn = 0;

  /** Vẽ nốt các đoạn chưa có. Trả về canvas, hoặc null nếu không có DOM. */
  sync(segments: readonly StrokeSegment[], color: string): CanvasImageSource | null {
    if (typeof document === "undefined") return null;
    if (!this.canvas) {
      const canvas = document.createElement("canvas");
      canvas.width = GAME_WIDTH;
      canvas.height = GAME_HEIGHT;
      this.canvas = canvas;
      this.ctx = canvas.getContext("2d");
    }
    const ctx = this.ctx;
    if (!ctx) return null;
    ctx.strokeStyle = color;
    ctx.lineCap = "square";
    for (; this.drawn < segments.length; this.drawn++) {
      const seg = segments[this.drawn] as StrokeSegment;
      ctx.lineWidth = seg.width;
      ctx.beginPath();
      ctx.moveTo(Math.round(seg.x0), Math.round(seg.y0));
      ctx.lineTo(Math.round(seg.x1), Math.round(seg.y1));
      ctx.stroke();
    }
    return this.canvas;
  }
}
