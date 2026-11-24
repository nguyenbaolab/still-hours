import "./style.css";
import { AudioEngine } from "./audio/audio-engine";
import { DEBUG } from "./core/debug";
import { parseJump } from "./core/debug-jump";
import { Input } from "./core/input";
import { attachKeyboard } from "./core/keyboard";
import { startLoop } from "./core/loop";
import { Renderer } from "./core/renderer";
import { greyscaleSprite } from "./core/sprites";
import { browserStorage, SaveStore } from "./core/save";
import { KEY_BINDINGS } from "./data/keybindings";
import { RESIDENTS } from "./data/residents";
import { TOWN_NPCS } from "./data/town";
import { AUDIO_FEEL, RHYTHM_FEEL } from "./data/rhythm-feel";
import { SPRITES } from "./data/sprites";
import type { PixelSpriteData } from "./core/sprites";
import { BattleScene, createBattleFactory } from "./scenes/battle-scene";
import { GameFlow } from "./scenes/game-flow";

const canvas = document.querySelector<HTMLCanvasElement>("#game");
if (!canvas) throw new Error("Không tìm thấy #game trong index.html");

const renderer = new Renderer(canvas);
for (const [id, data] of Object.entries(SPRITES)) renderer.sprites.definePixels(id, data);
// Cư dân chưa giải thoát vẽ bằng bản xám của sprite có màu.
for (const npc of TOWN_NPCS) {
  const colored = (SPRITES as Record<string, PixelSpriteData>)[npc.freedSprite];
  if (colored) renderer.sprites.definePixels(npc.sprite, greyscaleSprite(colored));
}
const measure = (text: string, size: number): number => renderer.measureText(text, size);

const input = new Input();
attachKeyboard(input, KEY_BINDINGS);
const audio = new AudioEngine(AUDIO_FEEL, RHYTHM_FEEL.visualDelaySeconds);

// Kho lưu: phiên debug (nhảy cóc, mốc 5.6) không bao giờ đọc ghi. Chế độ riêng tư: chơi không lưu, không báo lỗi.
const store = new SaveStore(browserStorage(), () => DEBUG.session);
audio.setMuted(store.loadSettings().muted);
let savedMuted = audio.muted;

const flow: GameFlow = new GameFlow({
  input,
  audio,
  measure,
  store,
  residents: RESIDENTS,
  makeBattle: (resident, startStep) =>
    new BattleScene(resident, input, audio, createBattleFactory(input, audio, renderer.sprites.size("gear").width, resident), measure, startStep),
});

// Nhảy cóc để chơi thử: `?jump=r3`, hoặc phím số khi lớp debug (F1) bật. Phiên nhảy cóc không đọc ghi bản lưu.
const initialJump = parseJump(location.search);
if (initialJump) flow.queueJump(initialJump);
window.addEventListener("keydown", (event) => {
  if (!event.repeat) flow.handleKey(event.code);
});

// Đóng tab hoặc tab bị ẩn: chỉ cập nhật thời gian chơi, và chỉ khi đã có bản lưu.
const touchSave = (): void => store.touchPlaySeconds(flow.director.playSeconds);
window.addEventListener("pagehide", touchSave);
document.addEventListener("visibilitychange", () => {
  if (document.hidden) touchSave();
});

startLoop({
  update() {
    input.poll();
    flow.update();
    if (audio.muted !== savedMuted) {
      savedMuted = audio.muted;
      store.saveSettings({ muted: savedMuted });
    }
  },
  render(alpha) {
    flow.render(renderer, alpha);
  },
});
