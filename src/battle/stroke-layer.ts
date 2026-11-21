import { GAME_HEIGHT, GAME_WIDTH } from "../core/config";
import type { Renderer } from "../core/renderer";
import type { SketchFeel } from "../data/sketch-feel";
import { EraserPlay, type Sketch, type StrokeSegment } from "./sketch";

/**
 * Các đoạn đã chốt được ghi vào canvas phụ. Chỉ vẽ lại toàn bộ khi có lần tẩy
 * (thứ tự đoạn đổi, một đoạn bị cắt). Đoạn mới thì vẽ thêm.
 */
export class StrokeLayer {
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  private seenErase = 0;
  private seenCount = 0;

  constructor(private readonly feel: SketchFeel) {}

  render(
    renderer: Renderer,
    sketch: Sketch,
    eraser: EraserPlay,
    playerX: number,
    playerY: number,
  ): void {
    this.sync(sketch);
    if (this.canvas) renderer.image(this.canvas, 0, 0);
    else this.drawAll(renderer, sketch);

    const pen = sketch.pen;
    if (pen) {
      const dx = playerX - pen.x;
      const dy = playerY - pen.y;
      if (dx * dx + dy * dy > 0.25) renderer.line(pen.x, pen.y, playerX, playerY, pen.width, this.feel.color);
    }

    const { segments, tip } = eraser.overlay();
    for (const seg of segments) renderer.line(seg.x0, seg.y0, seg.x1, seg.y1, seg.width, this.feel.color);
    if (tip) {
      const size = 8;
      renderer.rect(tip.x - size / 2, tip.y - size / 2, size, size, this.feel.eraserColor);
    }
  }

  private sync(sketch: Sketch): void {
    if (!this.ensure()) return;
    if (this.seenErase !== sketch.eraseGeneration) {
      this.rebuild(sketch);
      this.seenErase = sketch.eraseGeneration;
      this.seenCount = sketch.segments.length;
      return;
    }
    const ctx = this.ctx;
    if (!ctx) return;
    while (this.seenCount < sketch.segments.length) {
      this.stroke(ctx, sketch.segments[this.seenCount] as StrokeSegment);
      this.seenCount++;
    }
  }

  private ensure(): boolean {
    if (this.ctx) return true;
    if (typeof document === "undefined") return false;
    const canvas = document.createElement("canvas");
    canvas.width = GAME_WIDTH;
    canvas.height = GAME_HEIGHT;
    const ctx = canvas.getContext("2d");
    if (!ctx) return false;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    this.canvas = canvas;
    this.ctx = ctx;
    return true;
  }

  private rebuild(sketch: Sketch): void {
    const ctx = this.ctx;
    if (!ctx) return;
    ctx.clearRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    for (let i = 0; i < sketch.segments.length; i++) this.stroke(ctx, sketch.segments[i] as StrokeSegment);
  }

  private stroke(ctx: CanvasRenderingContext2D, seg: StrokeSegment): void {
    const alpha = seg.erased ? this.feel.erasedAlpha : 1;
    if (alpha <= 0) return;
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = this.feel.color;
    ctx.lineWidth = seg.width;
    ctx.beginPath();
    ctx.moveTo(seg.x0, seg.y0);
    ctx.lineTo(seg.x1, seg.y1);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }

  /** Không có canvas (test trong Node): vẽ thẳng từng đoạn. */
  private drawAll(renderer: Renderer, sketch: Sketch): void {
    for (let i = 0; i < sketch.segments.length; i++) {
      const seg = sketch.segments[i] as StrokeSegment;
      if (seg.erased && this.feel.erasedAlpha <= 0) continue;
      renderer.line(seg.x0, seg.y0, seg.x1, seg.y1, seg.width, this.feel.color);
    }
  }
}
