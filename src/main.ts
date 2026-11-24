import "./style.css";
import { AudioEngine } from "./audio/audio-engine";
import { DisassemblePhase } from "./battle/disassemble-phase";
import { DodgePhase } from "./battle/dodge-phase";
import { Workbench } from "./battle/mechanism";
import { DEBUG } from "./core/debug";
import { Input } from "./core/input";
import { attachKeyboard } from "./core/keyboard";
import { startLoop } from "./core/loop";
import { Renderer } from "./core/renderer";
import { greyscaleSprite } from "./core/sprites";
import { browserStorage, SaveStore } from "./core/save";
import { DISASSEMBLY_FEEL } from "./data/disassembly-feel";
import { KEY_BINDINGS } from "./data/keybindings";
import { R4_ROUNDS } from "./data/patterns/resident-4";
import { RESIDENTS } from "./data/residents";
import type { ResidentId } from "./data/residents/types";
import { TOWN, TOWN_NPCS } from "./data/town";
import { AUDIO_FEEL, RHYTHM_FEEL } from "./data/rhythm-feel";
import { SPRITES } from "./data/sprites";
import type { PixelSpriteData } from "./core/sprites";
import { BattleScene, createBattleFactory } from "./scenes/battle-scene";
import { EndingScene } from "./scenes/ending";
import { GameFlow, type FlowDeps } from "./scenes/game-flow";
import { TownScene } from "./scenes/town";

// Chơi thử một cảnh riêng thay cho luồng thật, cho tới khi có `?jump=` (mốc 5.6). "game" = luồng đầy đủ:
// Title → Intro → Town → (hội thoại → trận → cảnh kết) × 5 → Ending → Title. "dodge" = chỉ lượt né 1 của cư dân 4;
// "disassemble" = chỉ tháo tầng 1 máy cư dân 4; "ending" = màn kết (không xóa bản lưu thật).
const PLAYTEST_PHASE: "game" | "dodge" | "disassemble" | "ending" = "game";

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

const r4 = RESIDENTS.find((r) => r.id === "r4") as (typeof RESIDENTS)[number];

function override(): FlowDeps["override"] {
  if (PLAYTEST_PHASE === "dodge") {
    return { make: () => new DodgePhase(input, audio, renderer.sprites.size("gear").width, R4_ROUNDS[0]) };
  }
  if (PLAYTEST_PHASE === "disassemble") {
    return { make: () => new DisassemblePhase(input, audio, r4.mechanism, new Workbench(r4.mechanism, DISASSEMBLY_FEEL), 1) };
  }
  if (PLAYTEST_PHASE === "ending") {
    return {
      make: () => {
        const everyone: ResidentId[] = RESIDENTS.map((r) => r.id);
        const world = new TownScene(TOWN, RESIDENTS, { freed: everyone }, input, audio, measure);
        return new EndingScene(world, input, audio, { clear: () => undefined }, flow.director.playSeconds);
      },
      finished: (scene) => scene instanceof EndingScene && scene.finished,
    };
  }
  return undefined;
}

const flow: GameFlow = new GameFlow({
  input,
  audio,
  measure,
  store,
  residents: RESIDENTS,
  makeBattle: (resident) =>
    new BattleScene(resident, input, audio, createBattleFactory(input, audio, renderer.sprites.size("gear").width, resident), measure),
  override: override(),
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
