import type { AudioPort } from "../audio/audio-engine";
import { TickScheduler } from "../audio/tick-scheduler";
import { stageOf, type Workbench } from "./mechanism";
import { disassembleHint, disassembleProgress, soloContext, stageCounts, type RoundContext } from "./progress";
import { drawBattleHud } from "./progress-hud";
import { HUD_FEEL } from "../data/hud-feel";
import { BeatClock } from "../core/beat-clock";
import { DEBUG } from "../core/debug";
import type { Input } from "../core/input";
import type { Renderer } from "../core/renderer";
import { DISASSEMBLY_FEEL, DISASSEMBLY_LAYOUT } from "../data/disassembly-feel";
import type { Mechanism } from "../data/mechanisms/types";
import { RHYTHM_FEEL } from "../data/rhythm-feel";
import type { Scene } from "../scenes/scene";

const COLOR = {
  background: "#0b0908",
  frame: "#ffffff",
  bench: "#000000",
  text: "#ffffff",
  memory: "#f4efe4",
  hint: "#8a7f68",
  flash: "#f2d23c",
  pip: "#e0b04a",
  pipEmpty: "#3a342c",
  debug: "#9fb3a8",
} as const;

export type DisassembleOutcome = "playing" | "done";

/**
 * Pha tháo lắp của một tầng: con trỏ chọn bộ phận, confirm thao tác theo nhịp nghe được.
 * Không biết pha né đạn. `Workbench` do người gọi giữ (một cho cả trận, qua ba tầng); tầng xong
 * (đã tháo hết bộ phận của tầng và đóng câu ký ức cuối) thì `outcome` là `done`.
 */
export class DisassemblePhase implements Scene {
  private clock: BeatClock;
  private ticks: TickScheduler;
  private memoryShown = 0;
  private heardAt: number;
  private done = false;
  private readonly ctx: RoundContext;
  /** Giây nghe được từ lúc pha bắt đầu (bảng "xong lượt" mờ dần), và từ lần tiến bộ cuối (gợi ý khi kẹt). */
  private age = 0;
  private idle = 0;
  private nextStuckAt = HUD_FEEL.idleSeconds;
  private progressMark = "";
  private nearWinSent = false;

  constructor(
    private readonly input: Input,
    private readonly audio: AudioPort,
    private readonly mechanism: Mechanism,
    private readonly bench: Workbench,
    private readonly stage: number,
    /** Trận chứa pha này (sự kiện, HUD). Không có thì pha chạy riêng (`soloContext` với `round` = tầng). */
    context?: RoundContext,
  ) {
    this.ctx = context ?? soloContext({ round: stage });
    this.bench.setStage(stage);
    this.clock = this.makeClock();
    this.ticks = new TickScheduler(this.clock, () => audio.contextTime(), audio.tickSink);
    this.heardAt = audio.heardTime();
  }

  get outcome(): DisassembleOutcome {
    return this.done ? "done" : "playing";
  }

  update(): void {
    if (this.done) return;

    const heard = this.audio.heardTime();
    const heardDt = Math.max(0, heard - this.heardAt);
    this.heardAt = heard;
    this.age += heardDt;
    this.clock.update();
    this.ticks.update();

    const { tempo } = this.clock;
    const time = this.clock.time;

    if (this.bench.memory) {
      const text = this.bench.memory;
      if (this.input.wasPressed("confirm")) {
        if (this.memoryShown < text.length) this.memoryShown = text.length;
        else {
          this.bench.closeMemory();
          this.memoryShown = 0;
          if (this.bench.stageComplete) this.done = true;
        }
      } else {
        this.memoryShown = Math.min(text.length, this.memoryShown + DISASSEMBLY_FEEL.memoryCharsPerSecond * heardDt);
      }
      // Đang đọc ký ức là đang tiến bộ, không tính là kẹt.
      this.idle = 0;
      this.nextStuckAt = HUD_FEEL.idleSeconds;
      return;
    }

    if (this.input.wasPressed("up")) this.bench.move("up");
    else if (this.input.wasPressed("down")) this.bench.move("down");
    else if (this.input.wasPressed("left")) this.bench.move("left");
    else if (this.input.wasPressed("right")) this.bench.move("right");

    if (this.input.wasPressed("confirm")) this.apply(this.bench.press(tempo, time));
    this.apply(this.bench.hold(tempo, time, this.input.isDown("confirm")));
    // Tháo xong bộ phận cuối của tầng mà không có câu ký ức thì tầng xong ngay.
    if (this.bench.stageComplete) this.done = true;
    this.trackProgress(heardDt);
  }

  private place(): { resident: RoundContext["resident"]; round: number; phase: "disassemble" } {
    return { resident: this.ctx.resident, round: this.stage, phase: "disassemble" };
  }

  /** Số nấc vặn của mọi bộ phận (để biết có vừa vặn thêm nấc nào không). */
  private notchTotal(): number {
    let total = 0;
    for (const part of this.mechanism.parts) total += this.bench.notchCount(part.id);
    return total;
  }

  /** Tiến độ của tầng (bộ phận đã tháo và phần lẻ của thao tác đang làm). */
  get progress(): number {
    if (this.done) return 1;
    const { total, done } = stageCounts(this.mechanism, this.bench.removed, this.stage);
    const part = this.mechanism.parts.find((item) => item.id === this.bench.selectedId);
    let partial = 0;
    if (part && !this.bench.removed.has(part.id) && stageOf(part) === this.stage) {
      if (part.operation === "unscrew") partial = this.bench.notchCount(part.id) / DISASSEMBLY_FEEL.unscrewSteps;
      else if (part.operation === "lift") partial = this.bench.liftProgress(this.clock.beat);
    }
    return disassembleProgress(total, done, partial);
  }

  /**
   * "Gần thắng" một lần, và "kẹt lâu": không có gì tiến bộ (tháo xong bộ phận, vặn thêm nấc, đang giữ nhấc, đang đọc ký ức)
   * trong `HUD_FEEL.idleSeconds` thì phát `stuck`, rồi cứ mỗi chừng đó giây nữa phát tiếp cho tới khi có tiến bộ.
   */
  private trackProgress(heardDt: number): void {
    const value = this.progress;
    if (!this.nearWinSent && !this.done && value >= HUD_FEEL.nearWinFraction) {
      this.nearWinSent = true;
      this.ctx.events.emit("nearWin", { ...this.place(), progress: value });
    }
    if (this.done) return;
    const holding = this.bench.liftProgress(this.clock.beat) > 0;
    const mark = `${this.bench.removed.size}/${this.notchTotal()}`;
    if (mark !== this.progressMark || holding) {
      this.progressMark = mark;
      this.idle = 0;
      this.nextStuckAt = HUD_FEEL.idleSeconds;
      return;
    }
    this.idle += heardDt;
    if (this.idle >= this.nextStuckAt) {
      this.nextStuckAt += HUD_FEEL.idleSeconds;
      this.ctx.events.emit("stuck", {
        ...this.place(),
        reason: "idle",
        amount: this.idle,
        partId: this.bench.selectedId,
      });
    }
  }

  /** Gợi ý khi kẹt: theo bộ phận đang chọn. Rỗng khi chưa kẹt. */
  private hints(): string[] {
    if (this.done || this.bench.memory || this.idle < HUD_FEEL.idleSeconds) return [];
    const part = this.mechanism.parts.find((item) => item.id === this.bench.selectedId);
    return [disassembleHint(part, this.bench.removed, this.mechanism.rhythmic)];
  }

  render(renderer: Renderer, _alpha: number): void {
    const bench = DISASSEMBLY_LAYOUT.bench;
    renderer.clear(COLOR.background);
    renderer.rect(bench.x, bench.y, bench.w, bench.h, COLOR.bench);
    renderer.rectOutline(bench.x - 4, bench.y - 4, bench.w + 8, bench.h + 8, COLOR.frame, 4);

    for (const part of this.mechanism.parts) {
      if (this.bench.removed.has(part.id)) continue;
      const later = stageOf(part) > this.stage;
      renderer.setAlpha(later ? 0.35 : 1);
      const size = renderer.sprites.size(part.sprite);
      const x = bench.x + part.x * bench.w - size.width / 2;
      const y = bench.y + part.y * bench.h - size.height / 2;
      if (this.bench.isFlashing(part.id, this.clock.beat)) {
        const box = part.hit;
        renderer.rect(bench.x + box.x * bench.w, bench.y + box.y * bench.h, box.w * bench.w, box.h * bench.h, COLOR.flash);
      }
      renderer.sprite(part.sprite, x, y);
      renderer.setAlpha(1);
      if (!later && part.id === this.bench.selectedId) {
        const box = part.hit;
        renderer.rectOutline(
          bench.x + box.x * bench.w,
          bench.y + box.y * bench.h,
          box.w * bench.w,
          box.h * bench.h,
          COLOR.frame,
          2,
        );
      }
    }

    this.drawProgress(renderer);
    this.renderHud(renderer);
    const memory = this.bench.memory;
    if (memory) {
      renderer.text(memory.slice(0, Math.floor(this.memoryShown)), 32, DISASSEMBLY_LAYOUT.memoryY, {
        color: COLOR.memory,
        size: 16,
      });
    } else if (this.mechanism.showHint && this.stage === 1) {
      renderer.text("Mũi tên chọn · Z thao tác", 32, DISASSEMBLY_LAYOUT.memoryY, { color: COLOR.hint, size: 16 });
    }

    if (DEBUG.on) {
      const beat = this.clock.beat;
      const near = Math.abs(beat - Math.round(beat)) <= DISASSEMBLY_FEEL.beatWindow;
      renderer.text(
        `beat ${beat.toFixed(2)}  bpm ${this.clock.bpm.toFixed(0)}  cửa sổ ${near ? "kịp" : "lệch"}  ${this.bench.selectedId}`,
        8,
        8,
        { color: COLOR.debug, size: 16 },
      );
    }
  }

  /** Bảng "xong lượt" vài giây đầu (sao vừa được ở pha né ngay trước), rồi gợi ý khi kẹt. */
  private renderHud(renderer: Renderer): void {
    const won = this.ctx.stars[this.stage - 1] ?? 0;
    const bannerLeft = HUD_FEEL.starsBannerSeconds - this.age;
    const showBanner = won > 0 && bannerLeft > 0 && !this.bench.memory;
    drawBattleHud(renderer, {
      round: this.stage,
      rounds: this.ctx.rounds,
      stars: this.ctx.stars,
      progress: this.progress,
      hints: this.hints(),
      hintAlpha: Math.min(1, Math.max(0, (this.idle - HUD_FEEL.idleSeconds) / HUD_FEEL.hintFadeSeconds)),
      banner: showBanner ? { round: this.stage, stars: won, alpha: Math.min(1, bannerLeft / 0.5) } : undefined,
    });
  }

  private drawProgress(renderer: Renderer): void {
    const part = this.mechanism.parts.find((item) => item.id === this.bench.selectedId);
    if (!part || this.bench.removed.has(part.id) || this.bench.memory || this.done) return;
    const bench = DISASSEMBLY_LAYOUT.bench;
    const left = bench.x + part.hit.x * bench.w;
    const top = bench.y + (part.hit.y + part.hit.h) * bench.h + 4;
    if (part.operation === "unscrew") {
      for (let i = 0; i < DISASSEMBLY_FEEL.unscrewSteps; i++) {
        renderer.rect(left + i * 8, top, 6, 6, i < this.bench.notchCount(part.id) ? COLOR.pip : COLOR.pipEmpty);
      }
    } else if (part.operation === "lift") {
      const width = part.hit.w * bench.w;
      renderer.rect(left, top, width, 4, COLOR.pipEmpty);
      renderer.rect(left, top, width * this.bench.liftProgress(this.clock.beat), 4, COLOR.pip);
    }
  }

  private apply(result: {
    cue: "unscrew" | "lift" | "unhook" | "clack" | null;
    removedId: string | null;
    flashed?: readonly string[];
  }): void {
    if (result.cue) this.audio.playCue(result.cue);
    if (result.removedId && this.bench.memory) this.memoryShown = 0;
    if (result.cue === "clack") this.ctx.events.emit("mistake", { ...this.place(), kind: "off-beat" });
    else if (result.flashed && result.flashed.length > 0) this.ctx.events.emit("mistake", { ...this.place(), kind: "blocked" });
    if (result.removedId) {
      const total = this.ctx.score.add(HUD_FEEL.points.part);
      this.ctx.events.emit("score", {
        ...this.place(),
        reason: "part",
        points: HUD_FEEL.points.part,
        total,
        detail: result.removedId,
      });
    }
  }

  private makeClock(): BeatClock {
    return new BeatClock(this.audio, this.mechanism.bpm, this.audio.contextTime() + RHYTHM_FEEL.leadInSeconds);
  }
}
