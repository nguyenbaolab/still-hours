import type { AudioPort } from "../audio/audio-engine";
import { TickScheduler } from "../audio/tick-scheduler";
import { BeatClock } from "../core/beat-clock";
import { GAME_HEIGHT, TICK_RATE } from "../core/config";
import type { Input } from "../core/input";
import type { Renderer } from "../core/renderer";
import type { DialogueLine } from "../data/dialogues";
import { INTRO_FEEL, type IntroFeel } from "../data/flow-feel";
import { DialogueBox, type MeasureText } from "./dialogue-box";
import type { Scene } from "./scene";

const COLOR = {
  background: "#050403",
  wall: "#14100d",
  roof: "#201a15",
  rim: "#d8c9a3",
  face: "#0c0a08",
  mark: "#8a7f68",
  hand: "#d8c9a3",
  second: "#b55a4a",
} as const;

/** Vài mái nhà phía dưới (hình khối placeholder): x trái, bề rộng, cao tường, cao mái. */
const ROOFS: readonly { x: number; w: number; wall: number; roof: number }[] = [
  { x: 24, w: 104, wall: 30, roof: 34 },
  { x: 150, w: 76, wall: 44, roof: 28 },
  { x: 250, w: 120, wall: 24, roof: 40 },
  { x: 396, w: 84, wall: 40, roof: 30 },
  { x: 500, w: 112, wall: 28, roof: 36 },
];
const ROOF_BASE_Y = GAME_HEIGHT - 28;

/**
 * Cảnh mở (CLAUDE.md, "Màn mở đầu", phần 1): nền đen, mặt đồng hồ dừng ở bốn giờ mười bảy, mái nhà, lời dẫn.
 * Tiếng tích tắc chạy trước và trong dòng 1, dừng HẲN khi sang dòng 2 (hủy cả tiếng đã hẹn), rồi im lặng một lúc
 * mới hiện chữ. Kim giây đứng ở chỗ nó dừng. Tích tắc dùng đồng hồ nhịp lấy từ đồng hồ âm thanh như mọi nơi khác.
 */
export class IntroScene implements Scene {
  private readonly box: DialogueBox;
  private readonly clock: BeatClock;
  private readonly ticks: TickScheduler;
  private waitTicks: number;
  private running = true;
  private frozenBeat = 0;

  constructor(
    lines: readonly DialogueLine[],
    private readonly input: Input,
    private readonly audio: AudioPort,
    measure: MeasureText,
    private readonly feel: IntroFeel = INTRO_FEEL,
  ) {
    this.box = new DialogueBox(lines, measure, "narration");
    this.clock = new BeatClock(audio, feel.tickBpm, audio.contextTime() + feel.firstTickSeconds);
    this.ticks = new TickScheduler(this.clock, () => audio.contextTime(), audio.tickSink);
    this.waitTicks = Math.round(feel.leadSeconds * TICK_RATE);
  }

  /** Đọc hết lời dẫn. */
  get finished(): boolean {
    return this.box.done;
  }

  /** Tiếng tích tắc còn chạy. */
  get ticking(): boolean {
    return this.running;
  }

  /** Đang chờ (dạo đầu hoặc im lặng sau khi tích tắc dừng): chưa hiện chữ, chưa nhận phím. */
  get waiting(): boolean {
    return this.waitTicks > 0;
  }

  get lineIndex(): number {
    return this.box.lineIndex;
  }

  update(): void {
    if (this.running) {
      this.clock.update();
      this.ticks.update();
    }
    if (this.waitTicks > 0) {
      this.waitTicks--;
      return;
    }

    const before = this.box.lineIndex;
    this.box.update(this.input, this.audio);
    const line = this.box.lineIndex;
    if (this.running && (line >= this.feel.stopAtLine || this.box.done)) {
      this.frozenBeat = Math.max(0, Math.floor(this.clock.beat));
      this.ticks.dropPending();
      this.running = false;
      if (line !== before && !this.box.done) this.waitTicks = Math.round(this.feel.silenceSeconds * TICK_RATE);
    }
  }

  render(renderer: Renderer): void {
    renderer.clear(COLOR.background);
    for (const roof of ROOFS) this.drawHouse(renderer, roof);
    this.drawClock(renderer);
    if (this.waitTicks <= 0) this.box.render(renderer);
  }

  private drawHouse(renderer: Renderer, house: { x: number; w: number; wall: number; roof: number }): void {
    renderer.rect(house.x, ROOF_BASE_Y - house.wall, house.w, house.wall + 28, COLOR.wall);
    for (let r = 0; r < house.roof; r += 2) {
      const width = house.w * (1 - r / house.roof);
      renderer.rect(house.x + (house.w - width) / 2, ROOF_BASE_Y - house.wall - r - 2, width, 2, COLOR.roof);
    }
  }

  private drawClock(renderer: Renderer): void {
    const { x, y, radius } = this.feel.clock;
    renderer.disc(x, y, radius, COLOR.rim);
    renderer.disc(x, y, radius - 3, COLOR.face);
    for (let i = 0; i < 12; i++) {
      const a = (i * 30 * Math.PI) / 180;
      const inner = radius - (i % 3 === 0 ? 11 : 7);
      const outer = radius - 5;
      renderer.line(x + Math.sin(a) * inner, y - Math.cos(a) * inner, x + Math.sin(a) * outer, y - Math.cos(a) * outer, 2, COLOR.mark);
    }
    const { hour, minute } = this.feel.stoppedAt;
    const minuteAngle = minute * 6;
    const hourAngle = (hour % 12) * 30 + minute * 0.5;
    const beat = this.running ? Math.max(0, Math.floor(this.clock.beat)) : this.frozenBeat;
    const secondAngle = beat * 6;
    this.hand(renderer, hourAngle, radius * 0.5, 3, COLOR.hand);
    this.hand(renderer, minuteAngle, radius * 0.78, 2, COLOR.hand);
    this.hand(renderer, secondAngle, radius * 0.82, 1, COLOR.second);
    renderer.disc(x, y, 2, COLOR.rim);
  }

  /** Kim chỉ theo độ, 0° là hướng 12 giờ, quay theo chiều kim đồng hồ. */
  private hand(renderer: Renderer, degrees: number, length: number, thickness: number, color: string): void {
    const { x, y } = this.feel.clock;
    const a = (degrees * Math.PI) / 180;
    renderer.line(x, y, x + Math.sin(a) * length, y - Math.cos(a) * length, thickness, color);
  }
}