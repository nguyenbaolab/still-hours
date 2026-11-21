import "./style.css";
import { DodgePhase } from "./battle/dodge-phase";
import { Input } from "./core/input";
import { attachKeyboard } from "./core/keyboard";
import { startLoop } from "./core/loop";
import { Renderer } from "./core/renderer";
import { KEY_BINDINGS } from "./data/keybindings";
import { SPRITES } from "./data/sprites";

const canvas = document.querySelector<HTMLCanvasElement>("#game");
if (!canvas) throw new Error("Không tìm thấy #game trong index.html");

const renderer = new Renderer(canvas);
renderer.sprites.definePixels("gear", SPRITES.gear);

const input = new Input();
attachKeyboard(input, KEY_BINDINGS);

// Tạm thời chạy thẳng pha né đạn; máy trạng thái cảnh sẽ có ở bước 5.
const dodgePhase = new DodgePhase(input, renderer.sprites.size("gear").width);

startLoop({
  update() {
    input.poll();
    dodgePhase.update();
  },
  render(alpha) {
    dodgePhase.render(renderer, alpha);
  },
});
