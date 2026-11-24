import { TICK_RATE } from "../core/config";
import { fitStrokes, type Pt } from "../core/drawing";
import type { Input } from "../core/input";
import type { Renderer } from "../core/renderer";
import { BATTLE_LAYOUT } from "../data/battle-layout";
import type { VignetteKind } from "../data/residents/types";
import type { Scene } from "./scene";

/** Cảm giác cảnh kết (giây, px logic). */
export const VIGNETTE_FEEL = {
  /** Cảnh kết kéo dài chừng này. */
  seconds: 10,
  /** Cho bấm confirm bỏ qua sau chừng này giây (người chơi thua nhiều lần không phải ngồi xem lại). */
  skipAfterSeconds: 2,
  /** Cảnh "pencil": cầm bút lên sau chừng này giây, nhấc lên `liftPx` trong `liftSeconds`. */
  pencilAt: 3,
  liftPx: 6,
  liftSeconds: 0.5,
  /** Khung tờ giấy trên bàn: tranh của người chơi thu vào đây. */
  paper: { x: 240, y: 150, w: 160, h: 64 },
} as const;

export interface VignetteData {
  /** Nét tranh của người chơi, theo toạ độ khung né (400×160). Rỗng = tờ giấy trắng. */
  drawing: readonly (readonly Pt[])[];
}

const COLOR = {
  background: "#14100d",
  desk: "#5a4630",
  deskEdge: "#3a2c1c",
  paper: "#f1ead8",
  paperEdge: "#c9bfa4",
  ink: "#4a3f35",
  lamp: "#f2d23c",
} as const;

/**
 * Cảnh kết ngắn của một cư dân, không chữ. Hiện mới có "pencil" (Linh cầm bút chì lên); các kiểu khác chỉ là màn
 * tối cùng thời lượng (bước 6 thay bằng cảnh thật). Một tick = 1/TICK_RATE giây.
 */
export class VignetteScene implements Scene {
  private ticks = 0;
  private readonly fitted: Pt[][];

  constructor(
    private readonly kind: VignetteKind,
    private readonly input: Input,
    data: VignetteData,
  ) {
    this.fitted = fitStrokes(data.drawing, BATTLE_LAYOUT.arena, VIGNETTE_FEEL.paper);
  }

  get seconds(): number {
    return this.ticks / TICK_RATE;
  }

  get finished(): boolean {
    return this.seconds >= VIGNETTE_FEEL.seconds;
  }

  update(): void {
    this.ticks++;
    if (this.seconds >= VIGNETTE_FEEL.skipAfterSeconds && this.input.wasPressed("confirm")) {
      this.ticks = Math.ceil(VIGNETTE_FEEL.seconds * TICK_RATE);
    }
  }

  /** Độ cao bút đã nhấc lên (px), 0 trước lúc cầm. */
  get pencilLift(): number {
    const t = (this.seconds - VIGNETTE_FEEL.pencilAt) / VIGNETTE_FEEL.liftSeconds;
    return VIGNETTE_FEEL.liftPx * Math.min(1, Math.max(0, t));
  }

  render(renderer: Renderer): void {
    renderer.clear(COLOR.background);
    if (this.kind !== "pencil") return;
    const { paper } = VIGNETTE_FEEL;

    // Bàn học cạnh cửa sổ: một tấm ván, một ngọn đèn, tờ giấy.
    renderer.rect(100, 214, 440, 70, COLOR.desk);
    renderer.rect(100, 214, 440, 4, COLOR.deskEdge);
    renderer.rect(450, 120, 6, 94, COLOR.deskEdge);
    renderer.disc(453, 116, 8, COLOR.lamp);
    renderer.rect(paper.x - 4, paper.y - 4, paper.w + 8, paper.h + 8, COLOR.paperEdge);
    renderer.rect(paper.x, paper.y, paper.w, paper.h, COLOR.paper);
    renderer.clip(paper.x, paper.y, paper.w, paper.h);
    for (const stroke of this.fitted) {
      for (let i = 1; i < stroke.length; i++) {
        const a = stroke[i - 1] as Pt;
        const b = stroke[i] as Pt;
        renderer.line(a.x, a.y, b.x, b.y, 2, COLOR.ink);
      }
    }
    renderer.unclip();

    const girl = this.seconds >= VIGNETTE_FEEL.pencilAt ? "r4-pencil" : "r4";
    const size = renderer.sprites.size(girl);
    renderer.sprite(girl, 190 - size.width / 2, 170 - size.height / 2);
    const pencil = renderer.sprites.size("pencil");
    renderer.sprite("pencil", paper.x + paper.w + 24 - pencil.width / 2, 196 - this.pencilLift - pencil.height / 2);
  }
}
