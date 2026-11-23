import type { AudioPort } from "../audio/audio-engine";
import { TickScheduler } from "../audio/tick-scheduler";
import { Workbench } from "./mechanism";
import { BeatClock } from "../core/beat-clock";
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

/**
 * Pha tháo lắp: con trỏ chọn bộ phận, confirm thao tác theo nhịp nghe được.
 * Không biết pha né đạn. Chơi lại khi đã tháo core thì dựng lại chính cỗ máy này.
 */
export class DisassemblePhase implements Scene {
  private bench: Workbench;
  private clock: BeatClock;
  private ticks: TickScheduler;
  private memoryShown = 0;
  private debug = false;
  private heardAt: number;

  constructor(
    private readonly input: Input,
    private readonly audio: AudioPort,
    private readonly mechanism: Mechanism,
  ) {
    this.bench = new Workbench(mechanism, DISASSEMBLY_FEEL);
    this.clock = this.makeClock();
    this.ticks = new TickScheduler(this.clock, () => audio.contextTime(), audio.tickSink);
    this.heardAt = audio.heardTime();
  }

  update(): void {
    if (this.input.wasPressed("debug")) this.debug = !this.debug;
    if (this.input.wasPressed("mute")) this.audio.toggleMute();

    const heard = this.audio.heardTime();
    const heardDt = Math.max(0, heard - this.heardAt);
    this.heardAt = heard;
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
        }
      } else {
        this.memoryShown = Math.min(text.length, this.memoryShown + DISASSEMBLY_FEEL.memoryCharsPerSecond * heardDt);
      }
      return;
    }

    if (this.bench.finished) {
      if (this.input.wasPressed("confirm")) this.restart();
      return;
    }

    if (this.input.wasPressed("up")) this.bench.move("up");
    else if (this.input.wasPressed("down")) this.bench.move("down");
    else if (this.input.wasPressed("left")) this.bench.move("left");
    else if (this.input.wasPressed("right")) this.bench.move("right");

    if (this.input.wasPressed("confirm")) this.apply(this.bench.press(tempo, time));
    this.apply(this.bench.hold(tempo, time, this.input.isDown("confirm")));
  }

  render(renderer: Renderer, _alpha: number): void {
    const bench = DISASSEMBLY_LAYOUT.bench;
    renderer.clear(COLOR.background);
    renderer.rect(bench.x, bench.y, bench.w, bench.h, COLOR.bench);
    renderer.rectOutline(bench.x - 4, bench.y - 4, bench.w + 8, bench.h + 8, COLOR.frame, 4);

    for (const part of this.mechanism.parts) {
      if (this.bench.removed.has(part.id)) continue;
      const size = renderer.sprites.size(part.sprite);
      const x = bench.x + part.x * bench.w - size.width / 2;
      const y = bench.y + part.y * bench.h - size.height / 2;
      if (this.bench.isFlashing(part.id, this.clock.beat)) {
        const box = part.hit;
        renderer.rect(bench.x + box.x * bench.w, bench.y + box.y * bench.h, box.w * bench.w, box.h * bench.h, COLOR.flash);
      }
      renderer.sprite(part.sprite, x, y);
      if (part.id === this.bench.selectedId) {
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
    const memory = this.bench.memory;
    if (memory) {
      renderer.text(memory.slice(0, Math.floor(this.memoryShown)), 32, DISASSEMBLY_LAYOUT.memoryY, {
        color: COLOR.memory,
        size: 16,
      });
    } else if (this.bench.finished) {
      renderer.text("xong", 320, 150, { color: COLOR.text, size: 20, align: "center" });
    } else {
      renderer.text("Mũi tên chọn · Z thao tác", 32, DISASSEMBLY_LAYOUT.memoryY, { color: COLOR.hint, size: 12 });
    }

    if (this.debug) {
      const beat = this.clock.beat;
      const near = Math.abs(beat - Math.round(beat)) <= DISASSEMBLY_FEEL.beatWindow;
      renderer.text(
        `beat ${beat.toFixed(2)}  bpm ${this.clock.bpm.toFixed(0)}  cửa sổ ${near ? "kịp" : "lệch"}  ${this.bench.selectedId}`,
        8,
        8,
        { color: COLOR.debug, size: 12 },
      );
    }
  }

  private drawProgress(renderer: Renderer): void {
    const part = this.mechanism.parts.find((item) => item.id === this.bench.selectedId);
    if (!part || this.bench.removed.has(part.id) || this.bench.memory || this.bench.finished) return;
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

  private apply(result: { cue: "unscrew" | "lift" | "unhook" | "clack" | null; removedId: string | null }): void {
    if (result.cue) this.audio.playCue(result.cue);
    if (result.removedId && this.bench.memory) this.memoryShown = 0;
  }

  private restart(): void {
    this.ticks.dropPending();
    this.bench.reset();
    this.memoryShown = 0;
    this.clock = this.makeClock();
    this.ticks = new TickScheduler(this.clock, () => this.audio.contextTime(), this.audio.tickSink);
  }

  private makeClock(): BeatClock {
    return new BeatClock(this.audio, this.mechanism.bpm, this.audio.contextTime() + RHYTHM_FEEL.leadInSeconds);
  }
}
