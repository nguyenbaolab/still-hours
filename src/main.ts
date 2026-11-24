import "./style.css";
import { AudioEngine } from "./audio/audio-engine";
import { DisassemblePhase } from "./battle/disassemble-phase";
import { DodgePhase } from "./battle/dodge-phase";
import { Workbench } from "./battle/mechanism";
import { DEBUG } from "./core/debug";
import { strokesFromSegments, type Pt } from "./core/drawing";
import { Input } from "./core/input";
import { attachKeyboard } from "./core/keyboard";
import { startLoop } from "./core/loop";
import { Renderer } from "./core/renderer";
import { greyscaleSprite } from "./core/sprites";
import { browserStorage, newSave, SaveStore } from "./core/save";
import { DIALOGUES } from "./data/dialogues";
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
import { DialogueScene } from "./scenes/dialogue-scene";
import { Director } from "./scenes/director";
import { EndingScene } from "./scenes/ending";
import { IntroScene } from "./scenes/intro";
import type { Scene } from "./scenes/scene";
import { TitleScene } from "./scenes/title";
import { TownScene } from "./scenes/town";
import { VignetteScene } from "./scenes/vignette";

// Cảnh đang chơi thử, cho tới khi có Director và thị trấn (bước 5). "flow" = hội thoại mở → trận cư dân 4 →
// cảnh kết → lặp lại; "dodge" = chỉ lượt né 1; "disassemble" = chỉ tháo tầng 1 của máy cư dân 4; "ending" = màn kết
// (không xóa bản lưu thật). "town" = Bắt đầu mới thì cảnh mở đầu rồi thị trấn, Tiếp tục thì thẳng thị trấn.
const PLAYTEST_PHASE: "town" | "flow" | "dodge" | "disassemble" | "ending" = "town";

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

const resident = RESIDENTS[0] as (typeof RESIDENTS)[number];
const freedSoFar: ResidentId[] = [];
let town: TownScene | null = null;

function startTown(): TownScene {
  town = new TownScene(TOWN, RESIDENTS, { freed: freedSoFar }, input, audio, measure);
  return town;
}
// Kho lưu: phiên debug (nhảy cóc, mốc 5.6) không bao giờ đọc ghi. Chế độ riêng tư: chơi không lưu, không báo lỗi.
const store = new SaveStore(browserStorage(), () => DEBUG.session);
audio.setMuted(store.loadSettings().muted);
let savedMuted = audio.muted;
function makeTitle(): TitleScene {
  return new TitleScene(audio, input, { exists: () => store.exists(), clear: () => store.clear() });
}
let title = makeTitle();
const director = new Director(input, audio, title);

// Đóng tab hoặc tab bị ẩn: chỉ cập nhật thời gian chơi, và chỉ khi đã có bản lưu.
const touchSave = (): void => store.touchPlaySeconds(director.playSeconds);
window.addEventListener("pagehide", touchSave);
document.addEventListener("visibilitychange", () => {
  if (document.hidden) touchSave();
});
let opening: DialogueScene | null = null;
let battle: BattleScene | null = null;
let vignette: VignetteScene | null = null;
let intro: IntroScene | null = null;
let ending: EndingScene | null = null;

function startIntro(): IntroScene {
  intro = new IntroScene(DIALOGUES.introOpening, input, audio, measure);
  return intro;
}

/** Màn kết: thị trấn với mọi người đã được giải thoát. Phiên chơi thử "ending" không xóa bản lưu thật. */
function startEnding(): EndingScene {
  const everyone: ResidentId[] = ["r1", "r2", "r3", "r4", "boss"];
  const world = new TownScene(TOWN, RESIDENTS, { freed: everyone }, input, audio, measure);
  const save = { clear: () => (PLAYTEST_PHASE === "ending" ? undefined : store.clear()) };
  ending = new EndingScene(world, input, audio, save, director.playSeconds);
  return ending;
}

/** Xong cảnh mở đầu: ghi `seenIntro` để lần "Tiếp tục" sau không chiếu lại. */
function markIntroSeen(): void {
  store.write({ ...(store.load() ?? newSave()), seenIntro: true, playSeconds: director.playSeconds });
}

function startOpening(): DialogueScene {
  opening = new DialogueScene(DIALOGUES[resident.dialogue.open], input, audio, measure);
  return opening;
}

function startBattle(): BattleScene {
  const factory = createBattleFactory(input, audio, renderer.sprites.size("gear").width, resident);
  battle = new BattleScene(resident, input, audio, factory, measure);
  return battle;
}

/** Tranh người chơi vừa vẽ, theo toạ độ khung né. */
function drawingOf(scene: BattleScene): Pt[][] {
  return scene.page ? strokesFromSegments(scene.page.sketch.segments) : [];
}

function start(): Scene {
  if (PLAYTEST_PHASE === "dodge") return new DodgePhase(input, audio, renderer.sprites.size("gear").width, R4_ROUNDS[0]);
  if (PLAYTEST_PHASE === "disassemble") {
    return new DisassemblePhase(input, audio, resident.mechanism, new Workbench(resident.mechanism, DISASSEMBLY_FEEL), 1);
  }
  if (PLAYTEST_PHASE === "ending") return startEnding();
  if (PLAYTEST_PHASE === "town") return title.result === "new" ? startIntro() : startTown();
  return startOpening();
}

startLoop({
  update() {
    input.poll();
    director.update();
    if (audio.muted !== savedMuted) {
      savedMuted = audio.muted;
      store.saveSettings({ muted: savedMuted });
    }
    if (director.transitioning) return;
    const scene = director.scene;
    if (scene === title && title.result) {
      director.fadeTo(start);
    } else if (intro && scene === intro && intro.finished) {
      markIntroSeen();
      director.fadeTo(startTown);
    } else if (ending && scene === ending && ending.finished) {
      director.fadeTo(() => {
        title = makeTitle();
        return title;
      });
    } else if (town && scene === town && town.request) {
      town.clearRequest();
      director.fadeTo(startBattle);
    } else if (opening && scene === opening && opening.finished) {
      director.fadeTo(startBattle);
    } else if (battle && scene === battle && battle.finished) {
      const drawing = drawingOf(battle);
      director.fadeTo(() => {
        vignette = new VignetteScene(resident.vignette, input, { drawing });
        return vignette;
      });
    } else if (vignette && scene === vignette && vignette.finished) {
      if (PLAYTEST_PHASE === "town") {
        if (!freedSoFar.includes(resident.id)) freedSoFar.push(resident.id);
        director.fadeTo(startTown);
      } else director.fadeTo(startOpening);
    }
  },
  render(alpha) {
    director.render(renderer, alpha);
  },
});
