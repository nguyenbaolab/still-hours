import "./style.css";
import { AudioEngine } from "./audio/audio-engine";
import { DisassemblePhase } from "./battle/disassemble-phase";
import { DodgePhase } from "./battle/dodge-phase";
import type { PageState } from "./battle/page";
import { Input } from "./core/input";
import { attachKeyboard } from "./core/keyboard";
import { startLoop } from "./core/loop";
import { Renderer } from "./core/renderer";
import type { Pattern } from "./data/pattern-types";
import { KEY_BINDINGS } from "./data/keybindings";
import { AUDIO_FEEL, RHYTHM_FEEL } from "./data/rhythm-feel";
import { CLOCKWORK } from "./data/mechanisms/clockwork";
import { R4_ROUNDS } from "./data/patterns/resident-4";
import { SPRITES } from "./data/sprites";
import { PressStartScene } from "./scenes/press-start";
import type { Scene } from "./scenes/scene";

// Pattern đang chơi thử. Đổi thành RESIDENT3_PATTERN hoặc TEST_PATTERN
// (import từ data/patterns/resident-3 hoặc data/patterns/test-pattern).
const PLAYTEST_PATTERN: Pattern = R4_ROUNDS[0];

// Pha đang chơi thử. "disassemble" = tháo lắp, "dodge" = né đạn.
const PLAYTEST_PHASE: "dodge" | "disassemble" = "disassemble";

const canvas = document.querySelector<HTMLCanvasElement>("#game");
if (!canvas) throw new Error("Không tìm thấy #game trong index.html");

const renderer = new Renderer(canvas);
for (const [id, data] of Object.entries(SPRITES)) renderer.sprites.definePixels(id, data);

const input = new Input();
attachKeyboard(input, KEY_BINDINGS);
const audio = new AudioEngine(AUDIO_FEEL, RHYTHM_FEEL.visualDelaySeconds);

// Tạm thời main tự đổi cảnh: chờ người dùng tương tác (mở khóa âm thanh) rồi vào pha đang chơi thử.
// Máy trạng thái cảnh thật sẽ có ở bước 4–5. Pha né chơi thử: thắng thì sang lượt kế (cùng một trang), thua thì chơi lại.
const pressStart = new PressStartScene(audio);
let scene: Scene = pressStart;
let dodge: DodgePhase | null = null;
let page: PageState | undefined;
let round = 0;

function startDodge(pattern: Pattern): DodgePhase {
  const phase = new DodgePhase(input, audio, renderer.sprites.size("gear").width, pattern, page ? { page } : {});
  page = phase.page ?? undefined;
  dodge = phase;
  return phase;
}

startLoop({
  update() {
    input.poll();
    scene.update();
    if (scene === pressStart && pressStart.ready) {
      scene = PLAYTEST_PHASE === "disassemble" ? new DisassemblePhase(input, audio, CLOCKWORK) : startDodge(PLAYTEST_PATTERN);
    } else if (dodge && scene === dodge && dodge.outcome !== "playing") {
      if (dodge.outcome === "won") {
        page?.closeRound();
        round = (round + 1) % R4_ROUNDS.length;
      }
      scene = startDodge(PLAYTEST_PATTERN === R4_ROUNDS[0] ? R4_ROUNDS[round] ?? PLAYTEST_PATTERN : PLAYTEST_PATTERN);
    }
  },
  render(alpha) {
    scene.render(renderer, alpha);
  },
});
