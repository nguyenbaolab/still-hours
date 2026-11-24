import type { AudioPort } from "../audio/audio-engine";
import type { Input } from "../core/input";
import type { Renderer } from "../core/renderer";
import type { DialogueLine } from "../data/dialogues";
import { DialogueBox, type DialogueStyle, type MeasureText } from "./dialogue-box";
import type { Scene } from "./scene";

/** Một đoạn hội thoại trên nền tối, không có gì khác. Dùng cho hội thoại mở trận (tạm, tới khi có thị trấn) và lời dẫn. */
export class DialogueScene implements Scene {
  private readonly box: DialogueBox;

  constructor(
    lines: readonly DialogueLine[],
    private readonly input: Input,
    private readonly audio: AudioPort,
    measure: MeasureText,
    style: DialogueStyle = "box",
    private readonly background = "#0b0908",
  ) {
    this.box = new DialogueBox(lines, measure, style);
  }

  get finished(): boolean {
    return this.box.done;
  }

  update(): void {
    if (this.input.wasPressed("mute")) this.audio.toggleMute();
    this.box.update(this.input, this.audio);
  }

  render(renderer: Renderer): void {
    renderer.clear(this.background);
    this.box.render(renderer);
  }
}
