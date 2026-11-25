import type { AudioPort } from "../audio/audio-engine";
import type { CueName } from "../audio/cues";
import { GAME_WIDTH, TICK_RATE } from "../core/config";
import { fitStrokes, type Pt } from "../core/drawing";
import type { Input } from "../core/input";
import type { Renderer } from "../core/renderer";
import { BATTLE_LAYOUT } from "../data/battle-layout";
import type { VignetteKind } from "../data/residents/types";
import { drawBackdrop } from "./backdrop";
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
  /** Cảnh "phone" (bác Hòa): chuông đổ ở những giây này, rồi mờ dần về đen trước khi biết có ai nghe máy. */
  ringAt: [1, 3.2, 5.4],
  phoneFadeFrom: 6.5,
  phoneFadeSeconds: 3,
  /** Cảnh "lookUp" (chú Minh): ô trời hiện dần từ `skyFrom` trong `skySeconds`; chú ngẩng đầu ở `lookAt`. */
  skyFrom: 2,
  skySeconds: 3,
  lookAt: 3,
  /** Cảnh "hum" (chị Vân): bốn nốt ngân nga bắt đầu ở `humAt`, mỗi nốt `noteGap` giây. */
  humAt: 2,
  noteGap: 0.5,
  /** Cảnh "leave" (ông Khải): đặt đồng hồ xuống bàn ở `setDownAt`, rồi bước ra cửa từ `walkFrom` tới `walkTo`. */
  setDownAt: 2.5,
  walkFrom: 4,
  walkTo: 9,
} as const;

/** Tiếng của từng cảnh kết, theo giây. */
export const VIGNETTE_CUES: Readonly<Record<VignetteKind, readonly { at: number; cue: CueName }[]>> = {
  phone: VIGNETTE_FEEL.ringAt.map((at) => ({ at, cue: "ring" as const })),
  lookUp: [],
  hum: [{ at: VIGNETTE_FEEL.humAt, cue: "hum" }],
  pencil: [],
  leave: [{ at: VIGNETTE_FEEL.setDownAt, cue: "chime" }],
};

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
 * Cảnh kết ngắn của một cư dân, không chữ, ~10 giây: "phone" (bác Hòa bấm số, chuông đổ, mờ), "lookUp" (chú Minh ngẩng
 * đầu, ô trời có màu), "hum" (chị Vân ngân nga), "pencil" (Linh cầm bút chì lên), "leave" (ông Khải đặt đồng hồ xuống
 * rồi bước ra cửa). Một tick = 1/TICK_RATE giây. `audio` tùy chọn: có thì phát tiếng theo `VIGNETTE_CUES`.
 */
export class VignetteScene implements Scene {
  private ticks = 0;
  private readonly fitted: Pt[][];
  private cueIndex = 0;

  constructor(
    private readonly kind: VignetteKind,
    private readonly input: Input,
    data: VignetteData,
    private readonly audio?: AudioPort,
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
    const cues = VIGNETTE_CUES[this.kind];
    while (this.cueIndex < cues.length && this.seconds >= (cues[this.cueIndex] as { at: number }).at) {
      this.audio?.playCue((cues[this.cueIndex] as { cue: CueName }).cue);
      this.cueIndex++;
    }
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
    switch (this.kind) {
      case "pencil":
        this.renderPencil(renderer);
        return;
      case "phone":
        this.renderPhone(renderer);
        return;
      case "lookUp":
        this.renderLookUp(renderer);
        return;
      case "hum":
        this.renderHum(renderer);
        return;
      case "leave":
        this.renderLeave(renderer);
        return;
    }
  }

  private ground(renderer: Renderer): void {
    renderer.rect(0, 250, GAME_WIDTH, 110, "#1e1814");
    renderer.rect(0, 250, GAME_WIDTH, 3, "#2e251d");
  }

  private put(renderer: Renderer, id: string, cx: number, bottom: number): void {
    const size = renderer.sprites.size(id);
    renderer.sprite(id, Math.round(cx - size.width / 2), Math.round(bottom - size.height));
  }

  /** Bác Hòa trước cửa cơ quan, điện thoại sáng lên mỗi hồi chuông, rồi màn mờ dần về đen. */
  private renderPhone(renderer: Renderer): void {
    const t = this.seconds;
    renderer.rect(0, 0, GAME_WIDTH, 250, "#171310");
    this.ground(renderer);
    renderer.rect(430, 90, 130, 160, "#2a2420");
    renderer.rect(448, 108, 28, 36, "#12161a");
    renderer.rect(514, 108, 28, 36, "#12161a");
    renderer.disc(495, 78, 11, "#3a342c");
    renderer.disc(495, 78, 8, "#e8d7b0");
    renderer.rect(494, 74, 2, 6, "#2a241c");
    renderer.rect(470, 170, 30, 80, "#3a2814");
    this.put(renderer, "r1", 320, 248);
    const ringing = VIGNETTE_FEEL.ringAt.some((at) => t >= at && t < at + 0.9);
    if (ringing) {
      renderer.setAlpha(0.25);
      renderer.disc(346, 214, 22, "#cfe8ff");
      renderer.setAlpha(1);
    }
    renderer.rect(342, 206, 8, 14, ringing ? "#e8f4ff" : "#8fb4d4");
    const fade = Math.min(1, Math.max(0, (t - VIGNETTE_FEEL.phoneFadeFrom) / VIGNETTE_FEEL.phoneFadeSeconds));
    if (fade > 0) {
      renderer.setAlpha(fade);
      renderer.rect(0, 0, GAME_WIDTH, 360, COLOR.background);
      renderer.setAlpha(1);
    }
  }

  /** Chú Minh dừng lại, ngẩng đầu; ô trời phía trên chỗ chú có màu. */
  private renderLookUp(renderer: Renderer): void {
    const t = this.seconds;
    this.ground(renderer);
    const sky = Math.min(1, Math.max(0, (t - VIGNETTE_FEEL.skyFrom) / VIGNETTE_FEEL.skySeconds));
    drawBackdrop(renderer, "dusk", { x: 200, y: 20, w: 240, h: 130 }, sky, t);
    renderer.rect(150, 228, 340, 4, "#6a5a48");
    renderer.rect(168, 232, 4, 18, "#4a3822");
    renderer.rect(468, 232, 4, 18, "#4a3822");
    this.put(renderer, t >= VIGNETTE_FEEL.lookAt ? "r2-up" : "r2", 320, 248);
  }

  /** Chị Vân ngồi trên ghế đá, bốn nốt nhạc nổi lên theo tiếng ngân nga. */
  private renderHum(renderer: Renderer): void {
    const t = this.seconds;
    this.ground(renderer);
    renderer.rect(96, 96, 70, 88, "#2a3330");
    renderer.rect(102, 102, 58, 76, "#d8c9a3");
    renderer.rect(108, 118, 46, 2, "#5c5346");
    renderer.rect(108, 132, 40, 2, "#5c5346");
    renderer.rect(108, 146, 46, 2, "#5c5346");
    renderer.rect(270, 232, 100, 8, "#7a5c3a");
    renderer.rect(276, 240, 6, 14, "#4a3822");
    renderer.rect(358, 240, 6, 14, "#4a3822");
    this.put(renderer, "r3", 320, 236);
    for (let i = 0; i < 4; i++) {
      const age = t - (VIGNETTE_FEEL.humAt + i * VIGNETTE_FEEL.noteGap);
      if (age < 0 || age > 2) continue;
      renderer.setAlpha(Math.max(0, 1 - age / 2));
      renderer.disc(352 + i * 10 + Math.sin(age * 3) * 4, 190 - age * 22, 3, "#f2d23c");
      renderer.setAlpha(1);
    }
  }

  /** Ông Khải đặt chiếc đồng hồ sửa dở xuống bàn, đứng dậy, bước ra cửa tháp. */
  private renderLeave(renderer: Renderer): void {
    const t = this.seconds;
    this.ground(renderer);
    renderer.rect(0, 88, 110, 162, "#1a1612");
    renderer.rect(108, 88, 4, 162, "#3a3228");
    renderer.rect(120, 214, 150, 6, COLOR.desk);
    renderer.rect(126, 220, 6, 34, COLOR.deskEdge);
    renderer.rect(258, 220, 6, 34, COLOR.deskEdge);
    renderer.rect(540, 120, 60, 134, "#f2d23c");
    renderer.rect(546, 126, 48, 128, "#fff4c8");
    const walk = Math.min(1, Math.max(0, (t - VIGNETTE_FEEL.walkFrom) / (VIGNETTE_FEEL.walkTo - VIGNETTE_FEEL.walkFrom)));
    const x = 250 + walk * walk * (3 - 2 * walk) * 320;
    const placed = t >= VIGNETTE_FEEL.setDownAt;
    this.put(renderer, "clock-face", placed ? 200 : x + 18, placed ? 214 : 206);
    this.put(renderer, "boss", x, 248);
  }

  private renderPencil(renderer: Renderer): void {
    const { paper } = VIGNETTE_FEEL;

    // Bàn học cạnh cửa sổ: một tấm ván, một ngọn đèn, tờ giấy.
    renderer.rect(500, 40, 100, 130, "#243038");
    renderer.rect(508, 48, 38, 50, "#9ec4d0");
    renderer.rect(554, 48, 38, 50, "#8eb4c0");
    renderer.rect(508, 106, 84, 52, "#7aa4b0");
    renderer.rect(100, 214, 440, 70, COLOR.desk);
    renderer.rect(100, 214, 440, 4, COLOR.deskEdge);
    renderer.rect(450, 120, 6, 94, COLOR.deskEdge);
    renderer.setAlpha(0.28);
    renderer.disc(453, 116, 26, COLOR.lamp);
    renderer.setAlpha(1);
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
