import "./style.css";
import { AudioEngine } from "./audio/audio-engine";
import { DodgePhase } from "./battle/dodge-phase";
import { Input } from "./core/input";
import { attachKeyboard } from "./core/keyboard";
import { startLoop } from "./core/loop";
import { Renderer } from "./core/renderer";
import { KEY_BINDINGS } from "./data/keybindings";
import { AUDIO_FEEL, RHYTHM_FEEL } from "./data/rhythm-feel";
import { RESIDENT4_PATTERN } from "./data/patterns/resident-4";
import { SPRITES } from "./data/sprites";
import { PressStartScene } from "./scenes/press-start";
import type { Scene } from "./scenes/scene";

// Pattern đang chơi thử. Đổi thành RESIDENT3_PATTERN hoặc TEST_PATTERN
// (import từ data/patterns/resident-3 hoặc data/patterns/test-pattern).
const PLAYTEST_PATTERN = RESIDENT4_PATTERN;

const canvas = document.querySelector<HTMLCanvasElement>("#game");
if (!canvas) throw new Error("Không tìm thấy #game trong index.html");

const renderer = new Renderer(canvas);
renderer.sprites.definePixels("gear", SPRITES.gear);
renderer.sprites.definePixels("distraction", SPRITES.distraction);

const input = new Input();
attachKeyboard(input, KEY_BINDINGS);
const audio = new AudioEngine(AUDIO_FEEL, RHYTHM_FEEL.visualDelaySeconds);

// Tạm thời main tự đổi cảnh: chờ người dùng tương tác (mở khóa âm thanh) rồi vào thẳng pha né đạn.
// Máy trạng thái cảnh thật sẽ có ở bước 5.
const pressStart = new PressStartScene(audio);
let scene: Scene = pressStart;

startLoop({
  update() {
    input.poll();
    scene.update();
    if (scene === pressStart && pressStart.ready) {
      scene = new DodgePhase(input, audio, renderer.sprites.size("gear").width, PLAYTEST_PATTERN);
    }
  },
  render(alpha) {
    scene.render(renderer, alpha);
  },
});
