import type { AudioPort } from "../audio/audio-engine";
import { GAME_HEIGHT, GAME_WIDTH, TICK_RATE } from "../core/config";
import type { Input } from "../core/input";
import { doubleFrame, type Renderer } from "../core/renderer";
import { SPEAKERS, type DialogueLine } from "../data/dialogues";
import { DIALOGUE_FEEL, type DialogueFeel } from "../data/flow-feel";

/** Đo bề ngang một chuỗi (pixel logic) ở cỡ chữ cho trước. Trong game là `Renderer.measureText`. */
export type MeasureText = (text: string, size: number) => number;

const COLOR = {
  frame: "#e0c48a",
  gap: "#2a241c",
  fill: "#14110e",
  plate: "#1a1612",
  text: "#f4efe4",
  name: "#e0c48a",
  narration: "#e0c48a",
} as const;

const STOPS = new Set([".", "?", "!", "…"]);

/**
 * Ngắt dòng theo từ, không dòng nào vượt `maxWidth`. Một từ dài hơn cả dòng thì tự nó chiếm một dòng
 * (không cắt giữa từ). Từ cách nhau bằng khoảng trắng.
 */
export function wrapText(text: string, maxWidth: number, size: number, measure: MeasureText): string[] {
  const words = text.split(/\s+/).filter((word) => word.length > 0);
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const candidate = line === "" ? word : `${line} ${word}`;
    if (line !== "" && measure(candidate, size) > maxWidth) {
      lines.push(line);
      line = word;
    } else {
      line = candidate;
    }
  }
  if (line !== "") lines.push(line);
  return lines;
}

/**
 * Thời gian dừng thêm (giây) sau khi ký tự thứ `index` của `text` hiện ra: dấu phẩy `commaPause`; `. ? ! …` `stopPause`,
 * nhưng chỉ ở cuối một chuỗi dấu ("..." chỉ dừng một lần, sau dấu chấm cuối) và không dừng ở cuối câu (hết chữ rồi,
 * chẳng còn gì để chờ).
 */
export function pauseAfter(text: string, index: number, feel: DialogueFeel): number {
  const c = text[index];
  if (c === undefined) return 0;
  if (c === ",") return feel.commaPause;
  if (!STOPS.has(c)) return 0;
  const next = text[index + 1];
  if (next === undefined) return 0;
  if (STOPS.has(next)) return 0;
  return feel.stopPause;
}

export type DialogueStyle = "box" | "narration";

/**
 * Hộp hội thoại dùng chung cho thị trấn, trận và màn mở đầu. Chữ chạy từng ký tự; Z hiện hết dòng rồi sang dòng
 * sau; giữ X tua nhanh (chữ chạy ×`fastMultiplier`, tự sang dòng sau sau `fastHoldSeconds`, trừ dòng cuối: dòng cuối
 * luôn cần Z để đóng). Một tick của `update` ứng với 1/TICK_RATE giây.
 */
export class DialogueBox {
  private index = 0;
  private wrapped: string[] = [];
  private shown = 0;
  private pause = 0;
  private fullFor = 0;
  private blipCount = 0;
  private finished = false;
  private tick = 0;

  constructor(
    private readonly lines: readonly DialogueLine[],
    private readonly measure: MeasureText,
    private readonly style: DialogueStyle = "box",
    private readonly feel: DialogueFeel = DIALOGUE_FEEL,
  ) {
    if (lines.length === 0) this.finished = true;
    else this.begin(0);
  }

  /** Đã đóng dòng cuối. */
  get done(): boolean {
    return this.finished;
  }

  /** Chỉ số dòng đang hiện. */
  get lineIndex(): number {
    return this.index;
  }

  /** Số ký tự đã hiện của dòng hiện tại. */
  get shownChars(): number {
    return Math.floor(this.shown);
  }

  /** Dòng hiện tại đã hiện hết chữ. */
  get lineComplete(): boolean {
    return this.shown >= this.text.length;
  }

  /** Các dòng sau khi ngắt (toàn bộ, không chỉ phần đã hiện). */
  get wrappedLines(): readonly string[] {
    return this.wrapped;
  }

  private get text(): string {
    return this.lines[this.index]?.text ?? "";
  }

  update(input: Input, audio: AudioPort): void {
    if (this.finished) return;
    this.tick++;
    const dt = 1 / TICK_RATE;
    const fast = input.isDown("cancel");
    const text = this.text;

    if (input.wasPressed("confirm")) {
      if (!this.lineComplete) {
        this.shown = text.length;
        this.pause = 0;
      } else {
        this.next();
        return;
      }
    }

    if (!this.lineComplete) {
      let budget = dt * (fast ? this.feel.fastMultiplier : 1);
      while (budget > 0 && !this.lineComplete) {
        if (this.pause > 0) {
          const spent = Math.min(this.pause, budget);
          this.pause -= spent;
          budget -= spent;
          continue;
        }
        // Thời gian cần để hiện ký tự kế tiếp.
        const perChar = 1 / this.feel.charsPerSecond;
        const progress = this.shown - Math.floor(this.shown);
        const needed = (1 - progress) * perChar;
        if (budget < needed) {
          this.shown += budget / perChar;
          budget = 0;
          break;
        }
        budget -= needed;
        const revealed = Math.floor(this.shown) + 1;
        this.shown = revealed;
        this.onRevealed(revealed - 1, audio);
      }
      this.fullFor = 0;
      return;
    }

    this.fullFor += dt;
    if (fast && this.fullFor >= this.feel.fastHoldSeconds && this.index < this.lines.length - 1) this.next();
  }

  /** Tiếng `blip` mỗi `blipEvery` ký tự (không tính khoảng trắng), và dừng sau dấu câu. */
  private onRevealed(charIndex: number, audio: AudioPort): void {
    const text = this.text;
    const c = text[charIndex] ?? "";
    if (c.trim() !== "") {
      this.blipCount++;
      if (this.blipCount % this.feel.blipEvery === 0) {
        const speaker = this.lines[this.index]?.speaker ?? "narrator";
        audio.playCue("blip", SPEAKERS[speaker].blipHz);
      }
    }
    this.pause += pauseAfter(text, charIndex, this.feel);
  }

  private next(): void {
    if (this.index >= this.lines.length - 1) {
      this.finished = true;
      return;
    }
    this.begin(this.index + 1);
  }

  private begin(index: number): void {
    this.index = index;
    this.shown = 0;
    this.pause = 0;
    this.fullFor = 0;
    this.blipCount = 0;
    const width = this.innerWidth();
    this.wrapped = wrapText(this.text, width, this.feel.fontSize, this.measure);
  }

  private innerWidth(): number {
    if (this.style === "narration") return GAME_WIDTH - 96;
    const { box } = this.feel;
    return box.w - 2 * box.border - 2 * box.padding;
  }

  render(renderer: Renderer): void {
    if (this.finished) return;
    const line = this.lines[this.index];
    if (!line) return;
    const { feel } = this;
    const visible = this.shownChars;

    if (this.style === "narration") {
      const total = this.wrapped.length * feel.lineHeight;
      const top = Math.round((GAME_HEIGHT - total) / 2);
      renderer.rect(GAME_WIDTH / 2 - 36, top - 18, 72, 2, COLOR.narration);
      this.drawLines(renderer, GAME_WIDTH / 2, top, visible, "center", COLOR.narration);
      renderer.rect(GAME_WIDTH / 2 - 36, top + total + 12, 72, 2, COLOR.narration);
      return;
    }

    const { box } = feel;
    doubleFrame(renderer, box.x, box.y, box.w, box.h, COLOR.frame, COLOR.gap, COLOR.fill);
    const name = SPEAKERS[line.speaker].name;
    if (name !== "") {
      const nameX = box.x + box.border + 4;
      const nameY = box.y - feel.lineHeight;
      const nameW = Math.ceil(this.measure(name, feel.fontSize)) + 16;
      const plateH = feel.lineHeight + 2;
      renderer.rect(nameX - 8, nameY - 2, nameW, plateH, COLOR.plate);
      renderer.rect(nameX - 8, nameY - 2, nameW, 2, COLOR.frame);
      renderer.rect(nameX - 8, nameY - 2, 2, plateH, COLOR.frame);
      renderer.text(name, nameX, nameY, { size: feel.fontSize, color: COLOR.name });
    }
    this.drawLines(renderer, box.x + box.border + box.padding, box.y + box.border + box.padding - 2, visible, "left", COLOR.text);
    if (this.lineComplete && Math.floor(this.tick / 20) % 2 === 0) {
      const x = box.x + box.w - box.border - 20;
      const y = box.y + box.h - box.border - 18;
      renderer.rect(x, y, 10, 2, COLOR.frame);
      renderer.rect(x + 2, y + 2, 6, 2, COLOR.frame);
      renderer.rect(x + 4, y + 4, 2, 2, COLOR.frame);
    }
  }

  /** Vẽ phần đã hiện (`visible` ký tự tính qua mọi dòng đã ngắt, bỏ qua khoảng trắng bị nuốt khi ngắt). */
  private drawLines(renderer: Renderer, x: number, top: number, visible: number, align: CanvasTextAlign, color: string): void {
    let left = visible;
    this.wrapped.forEach((text, i) => {
      if (left <= 0) return;
      renderer.text(text.slice(0, left), x, top + i * this.feel.lineHeight, { size: this.feel.fontSize, color, align });
      // +1: khoảng trắng bị nuốt ở chỗ ngắt dòng vẫn chiếm một ký tự trong chuỗi gốc.
      left -= text.length + 1;
    });
  }
}
