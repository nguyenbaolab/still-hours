import type { AudioPort } from "../audio/audio-engine";
import { TickScheduler } from "../audio/tick-scheduler";
import { BeatClock } from "../core/beat-clock";
import { GAME_HEIGHT, GAME_WIDTH, TICK_RATE } from "../core/config";
import { formatPlayTime } from "../core/format";
import type { Input } from "../core/input";
import type { Renderer } from "../core/renderer";
import { CREDITS, ENDING_LINE } from "../data/credits";
import { ENDING_FEEL, TOWN_FEEL, type EndingFeel } from "../data/flow-feel";
import { TOWN, TOWN_NPCS } from "../data/town";
import type { Scene } from "./scene";

export type EndingPhase = "drift" | "fade" | "time" | "credits" | "done";

/** Phần của thị trấn mà màn kết cần: chiều rộng và hàm vẽ với camera cho trước (`TownScene` thoả cả hai). */
export interface EndingWorld {
  readonly worldWidth: number;
  drawWorld(renderer: Renderer, camX: number, keeper: null): void;
}

/** Nơi màn kết xóa bản lưu khi xong. */
export interface EndingSave {
  clear(): void;
}

/** Camera tại giây `seconds` của lúc trôi: từ `fromX` tới `toX` đều, kẹp ở hai đầu. */
export function endingCameraX(seconds: number, driftSeconds: number, fromX: number, toX: number): number {
  const t = driftSeconds <= 0 ? 1 : Math.min(1, Math.max(0, seconds / driftSeconds));
  return fromX + (toX - fromX) * t;
}

/** Toạ độ x (thế giới) mà camera đi ngang thì một lớp tích tắc mới bắt đầu: cửa tháp, rồi r4, r3, r2, r1 (từ đông sang tây). */
export function endingAnchors(tile: number): number[] {
  const tower = (TOWN.tower.x + 0.5) * tile;
  const residents = [...TOWN_NPCS].sort((a, b) => b.tile.x - a.tile.x).map((npc) => (npc.tile.x + 0.5) * tile);
  return [tower, ...residents];
}

interface Layer {
  clock: BeatClock;
  ticks: TickScheduler;
}

const COLOR = {
  time: "#d8c9a3",
  line: "#ffffff",
  credits: "#d8c9a3",
  creditsDim: "#8a7f68",
} as const;

/**
 * Màn kết (CLAUDE.md, "Màn kết"): camera thị trấn tự trôi từ tháp về phía tây, tiếng tích tắc chồng lớp khi đi ngang
 * từng cư dân, mỗi người làm việc nhỏ của cảnh kết riêng (không chữ). Rồi mờ đen; thẻ thời gian chơi, 2 giây sau
 * "Vẫn chưa muộn." (giữ tới khi bấm confirm, sớm nhất sau `confirmAfterSeconds`); công trạng tự cuộn; xóa bản lưu.
 * Cảnh không điều khiển được ở pha trôi. Không tính vào thời gian chơi: thời gian đã chốt khi cảnh được dựng.
 */
export class EndingScene implements Scene {
  readonly countsPlayTime = false;
  private current: EndingPhase = "drift";
  private phaseTicks = 0;
  private tick = 0;
  private readonly layers: Layer[] = [];
  private readonly anchors: number[];
  private readonly fromX: number;
  private readonly toX = 0;

  constructor(
    private readonly world: EndingWorld,
    private readonly input: Input,
    private readonly audio: AudioPort,
    private readonly save: EndingSave,
    private readonly playSeconds: number,
    private readonly feel: EndingFeel = ENDING_FEEL,
  ) {
    this.fromX = Math.max(0, world.worldWidth - GAME_WIDTH);
    this.anchors = endingAnchors(TOWN_FEEL.tile);
  }

  get phase(): EndingPhase {
    return this.current;
  }

  get finished(): boolean {
    return this.current === "done";
  }

  /** Số lớp tích tắc đã bắt đầu. */
  get layerCount(): number {
    return this.layers.length;
  }

  /** Dòng "Vẫn chưa muộn." đang hiện. */
  get showsClosingLine(): boolean {
    return this.current === "time" && this.phaseSeconds >= this.feel.closingLineAfterSeconds;
  }

  get cameraX(): number {
    if (this.current !== "drift") return this.toX;
    return endingCameraX(this.phaseSeconds, this.feel.driftSeconds, this.fromX, this.toX);
  }

  private get phaseSeconds(): number {
    return this.phaseTicks / TICK_RATE;
  }

  update(): void {
    if (this.current === "done") return;
    this.tick++;
    this.phaseTicks++;
    for (const layer of this.layers) {
      layer.clock.update();
      layer.ticks.update();
    }
    const seconds = this.phaseSeconds;
    switch (this.current) {
      case "drift":
        this.startLayers();
        if (seconds >= this.feel.driftSeconds) this.enter("fade");
        return;
      case "fade":
        if (seconds >= this.feel.fadeSeconds) this.enter("time");
        return;
      case "time":
        if (seconds >= this.feel.confirmAfterSeconds && this.input.wasPressed("confirm")) this.enter("credits");
        return;
      case "credits":
        if (seconds >= this.feel.creditsSeconds || (seconds >= this.feel.creditsGuardSeconds && this.input.wasPressed("confirm"))) {
          this.finish();
        }
        return;
    }
  }

  private enter(phase: EndingPhase): void {
    this.current = phase;
    this.phaseTicks = 0;
  }

  private finish(): void {
    for (const layer of this.layers) layer.ticks.dropPending();
    this.save.clear();
    this.enter("done");
  }

  /** Mỗi lần tâm camera đi ngang một mốc (tháp, rồi từng cư dân) thì thêm một lớp tích tắc, nhịp riêng. */
  private startLayers(): void {
    const center = this.cameraX + GAME_WIDTH / 2;
    while (this.layers.length < this.anchors.length && center <= (this.anchors[this.layers.length] as number)) {
      const index = this.layers.length;
      const bpm = this.feel.tickBpms[index] ?? this.feel.tickBpms[this.feel.tickBpms.length - 1] ?? 60;
      const clock = new BeatClock(this.audio, bpm, this.audio.contextTime() + this.feel.layerDelaySeconds);
      this.layers.push({ clock, ticks: new TickScheduler(clock, () => this.audio.contextTime(), this.audio.tickSink) });
    }
  }

  render(renderer: Renderer): void {
    renderer.clear("#000000");
    switch (this.current) {
      case "drift":
        this.drawTown(renderer, 0);
        return;
      case "fade":
        this.drawTown(renderer, Math.min(1, this.phaseSeconds / this.feel.fadeSeconds));
        return;
      case "time":
        this.drawTimeCard(renderer);
        return;
      case "credits":
        this.drawCredits(renderer);
        return;
      case "done":
        return;
    }
  }

  private drawTown(renderer: Renderer, blackAlpha: number): void {
    const camX = this.cameraX;
    this.world.drawWorld(renderer, camX, null);
    this.drawTouches(renderer, camX);
    if (blackAlpha > 0) {
      renderer.setAlpha(blackAlpha);
      renderer.rect(0, 0, GAME_WIDTH, GAME_HEIGHT, "#000000");
      renderer.setAlpha(1);
    }
  }

  /** Việc nhỏ của từng cư dân (placeholder bằng hình khối, không chữ). Mốc 7 sẽ thay bằng sprite thật. */
  private drawTouches(renderer: Renderer, camX: number): void {
    const t = TOWN_FEEL.tile;
    const camY = TOWN_FEEL.cameraOffsetY;
    const seconds = this.tick / TICK_RATE;
    for (const npc of TOWN_NPCS) {
      const sx = (npc.tile.x + 0.5) * t - camX;
      const sy = npc.tile.y * t + camY;
      if (sx < -80 || sx > GAME_WIDTH + 80) continue;
      switch (npc.id) {
        case "r1": {
          // Điện thoại áp tai, sóng chuông lan ra.
          renderer.rect(sx + 10, sy + 2, 6, 12, "#bfe3ff");
          const wave = (seconds % 1.2) / 1.2;
          renderer.setAlpha(1 - wave);
          renderer.ring(sx + 13, sy + 8, 6 + wave * 16, "#bfe3ff", 2);
          renderer.setAlpha(1);
          break;
        }
        case "r2": {
          // Ô trời phía trên chỗ chú có màu.
          renderer.setAlpha(0.6);
          renderer.rect(sx - 64, camY, 160, 3 * t, "#6fa8d8");
          renderer.setAlpha(1);
          break;
        }
        case "r3": {
          // Nốt nhạc bay lên từ miệng chị.
          for (let i = 0; i < 3; i++) {
            const phase = ((seconds + i * 0.8) % 2.4) / 2.4;
            const nx = sx + 8 + Math.sin(phase * 6 + i) * 6;
            const ny = sy - 4 - phase * 36;
            renderer.setAlpha(1 - phase);
            renderer.disc(nx, ny, 3, "#f4e9c4");
            renderer.rect(nx + 2, ny - 10, 2, 10, "#f4e9c4");
          }
          renderer.setAlpha(1);
          break;
        }
        case "r4": {
          // Cây bút chì đã được nhấc lên.
          renderer.sprite("pencil", sx + 6, sy + 4);
          break;
        }
      }
    }
  }

  private drawTimeCard(renderer: Renderer): void {
    const cx = GAME_WIDTH / 2;
    const mid = GAME_HEIGHT / 2;
    const seconds = this.phaseSeconds;
    renderer.text(formatPlayTime(this.playSeconds), cx, mid - 32, {
      size: 24,
      align: "center",
      color: COLOR.time,
      alpha: Math.min(1, seconds / 0.8),
    });
    if (this.showsClosingLine) {
      renderer.text(ENDING_LINE, cx, mid + 8, {
        size: 20,
        align: "center",
        color: COLOR.line,
        alpha: Math.min(1, (seconds - this.feel.closingLineAfterSeconds) / 0.8),
      });
    }
  }

  private drawCredits(renderer: Renderer): void {
    const gap = 14;
    let total = 0;
    for (const line of CREDITS) total += line.size + gap;
    const progress = Math.min(1, this.phaseSeconds / this.feel.creditsSeconds);
    let y = GAME_HEIGHT - progress * (GAME_HEIGHT + total);
    for (const line of CREDITS) {
      if (line.text !== "" && y > -line.size && y < GAME_HEIGHT) {
        renderer.text(line.text, GAME_WIDTH / 2, y, {
          size: line.size,
          align: "center",
          color: line.size >= 20 ? COLOR.credits : COLOR.creditsDim,
        });
      }
      y += line.size + gap;
    }
  }
}
