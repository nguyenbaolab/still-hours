import "./style.css";
import { AudioEngine } from "./audio/audio-engine";
import { DEBUG } from "./core/debug";
import { parseJump } from "./core/debug-jump";
import { FONT_FAMILY } from "./core/config";
import { Input } from "./core/input";
import { attachKeyboard } from "./core/keyboard";
import { mountTouchControls } from "./core/touch-controls";
import { wantsTouchControls } from "./core/touch-input";
import { startLoop } from "./core/loop";
import { Renderer } from "./core/renderer";
import { greyscaleSprite, stillSprite } from "./core/sprites";
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
const stage = document.querySelector<HTMLElement>("#stage");
const touchRoot = document.querySelector<HTMLElement>("#touch");
if (!canvas || !stage || !touchRoot) throw new Error("Không tìm thấy #game, #stage hoặc #touch trong index.html");

const renderer = new Renderer(canvas, stage);
for (const [id, data] of Object.entries(SPRITES)) renderer.sprites.definePixels(id, data);
// Cư dân chưa giải thoát vẽ bằng bản xám, và đứng yên: không lấy khung hình của bản có màu.
for (const npc of TOWN_NPCS) {
  const colored = (SPRITES as Record<string, PixelSpriteData>)[npc.freedSprite];
  if (colored) renderer.sprites.definePixels(npc.sprite, greyscaleSprite(stillSprite(colored)));
}
const measure = (text: string, size: number): number => renderer.measureText(text, size);

const input = new Input();
attachKeyboard(input, KEY_BINDINGS);
mountTouchControls(touchRoot, input);

/** Nút ảo chỉ trên máy cảm ứng. Màn dọc thì hiện dòng nhắc xoay ngang và co canvas theo khung còn lại. */
function syncLayout(): void {
  const coarse = typeof matchMedia === "function" && matchMedia("(pointer: coarse)").matches;
  document.body.classList.toggle(
    "show-touch",
    wantsTouchControls({
      coarse,
      maxTouchPoints: navigator.maxTouchPoints || 0,
      ontouchstart: "ontouchstart" in window,
    }),
  );
  document.body.classList.toggle("portrait", window.innerHeight > window.innerWidth);
  renderer.fit();
}

syncLayout();
window.addEventListener("resize", syncLayout);
document.addEventListener("gesturestart", (event) => event.preventDefault());
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

/** Chờ VT323 nạp xong trước khi vẽ chữ đầu tiên (canvas không tự vẽ lại khi font về sau). Quá 3 giây thì chạy với font dự phòng. */
async function waitForFont(): Promise<void> {
  try {
    await Promise.race([document.fonts.load(`20px ${FONT_FAMILY}`), new Promise<void>((resolve) => setTimeout(resolve, 3000))]);
  } catch {
    // Không nạp được font: chạy với font dự phòng.
  }
}

void waitForFont().then(() => startLoop({
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
}));
