import "./style.css";
import { AudioEngine } from "./audio/audio-engine";
import { DisassemblePhase } from "./battle/disassemble-phase";
import { DodgePhase } from "./battle/dodge-phase";
import { Workbench } from "./battle/mechanism";
import { strokesFromSegments, type Pt } from "./core/drawing";
import { Input } from "./core/input";
import { attachKeyboard } from "./core/keyboard";
import { startLoop } from "./core/loop";
import { Renderer } from "./core/renderer";
import { DIALOGUES } from "./data/dialogues";
import { DISASSEMBLY_FEEL } from "./data/disassembly-feel";
import { KEY_BINDINGS } from "./data/keybindings";
import { R4_ROUNDS } from "./data/patterns/resident-4";
import { RESIDENT_R4 } from "./data/residents/r4";
import { AUDIO_FEEL, RHYTHM_FEEL } from "./data/rhythm-feel";
import { SPRITES } from "./data/sprites";
import { BattleScene, createBattleFactory } from "./scenes/battle-scene";
import { DialogueScene } from "./scenes/dialogue-scene";
import { PressStartScene } from "./scenes/press-start";
import type { Scene } from "./scenes/scene";
import { VignetteScene } from "./scenes/vignette";

// Cảnh đang chơi thử, cho tới khi có Director và thị trấn (bước 5). "flow" = hội thoại mở → trận cư dân 4 →
// cảnh kết → lặp lại; "dodge" = chỉ lượt né 1; "disassemble" = chỉ tháo tầng 1 của máy cư dân 4.
const PLAYTEST_PHASE: "flow" | "dodge" | "disassemble" = "flow";

const canvas = document.querySelector<HTMLCanvasElement>("#game");
if (!canvas) throw new Error("Không tìm thấy #game trong index.html");

const renderer = new Renderer(canvas);
for (const [id, data] of Object.entries(SPRITES)) renderer.sprites.definePixels(id, data);
const measure = (text: string, size: number): number => renderer.measureText(text, size);

const input = new Input();
attachKeyboard(input, KEY_BINDINGS);
const audio = new AudioEngine(AUDIO_FEEL, RHYTHM_FEEL.visualDelaySeconds);

const resident = RESIDENT_R4;
const pressStart = new PressStartScene(audio);
let scene: Scene = pressStart;
let opening: DialogueScene | null = null;
let battle: BattleScene | null = null;
let vignette: VignetteScene | null = null;

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
  return startOpening();
}

startLoop({
  update() {
    input.poll();
    scene.update();
    if (scene === pressStart && pressStart.ready) {
      scene = start();
    } else if (opening && scene === opening && opening.finished) {
      scene = startBattle();
    } else if (battle && scene === battle && battle.finished) {
      vignette = new VignetteScene(resident.vignette, input, { drawing: drawingOf(battle) });
      scene = vignette;
    } else if (vignette && scene === vignette && vignette.finished) {
      scene = startOpening();
    }
  },
  render(alpha) {
    scene.render(renderer, alpha);
  },
});
