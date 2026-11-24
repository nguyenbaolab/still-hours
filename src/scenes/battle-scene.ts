import type { AudioPort } from "../audio/audio-engine";
import { DisassemblePhase } from "../battle/disassemble-phase";
import { DodgePhase, type DodgeOutcome } from "../battle/dodge-phase";
import { Workbench } from "../battle/mechanism";
import { PageState, type Point } from "../battle/page";
import { GAME_HEIGHT, GAME_WIDTH, TICK_RATE } from "../core/config";
import type { Input } from "../core/input";
import type { Renderer } from "../core/renderer";
import { DISASSEMBLY_FEEL } from "../data/disassembly-feel";
import { FLOW_FEEL } from "../data/flow-feel";
import type { Pattern } from "../data/pattern-types";
import type { ResidentData } from "../data/residents/types";
import { SKETCH_FEEL } from "../data/sketch-feel";
import type { Scene } from "./scene";

/** Phần của pha né mà `BattleScene` cần biết. `DodgePhase` thật hiện thực nó; test dùng bản giả. */
export interface DodgeLike extends Scene {
  readonly outcome: DodgeOutcome;
  readonly gearPosition: Point;
}

/** Phần của pha tháo mà `BattleScene` cần biết. */
export interface DisassembleLike extends Scene {
  readonly outcome: "playing" | "done";
}

/** Nơi dựng pha thật. Tách ra để test thay bằng pha giả có `outcome` điều khiển được. */
export interface BattleFactory {
  dodge(round: number, pattern: Pattern, page: PageState | null): DodgeLike;
  disassemble(stage: number, bench: Workbench): DisassembleLike;
}

export function createBattleFactory(
  input: Input,
  audio: AudioPort,
  gearSize: number,
  resident: ResidentData,
): BattleFactory {
  return {
    dodge: (_round, pattern, page) => new DodgePhase(input, audio, gearSize, pattern, page ? { page } : {}),
    disassemble: (stage, bench) => new DisassemblePhase(input, audio, resident.mechanism, bench, stage),
  };
}

/** Mỗi lượt là một pha né rồi một pha tháo; một trận có 3 lượt. */
const ROUNDS = 3;
const FADE_COLOR = "#000000";

type Mode = "run" | "fadeOut" | "fadeIn" | "loseFade" | "loseHold" | "mend" | "ended";

/** Pha đang chạy: né hoặc tháo. `step` 0..5 = né 1, tháo 1, né 2, tháo 2, né 3, tháo 3. */
interface Running {
  step: number;
  scene: DodgeLike | DisassembleLike;
}

/**
 * Một trận với một cư dân: né 1 → tháo tầng 1 → né 2 → tháo tầng 2 → né 3 → tháo tầng 3.
 * Giữ `Workbench` (suốt trận) và `PageState` (nếu lượt có bút), đọc `outcome` của từng pha và quyết định tiếp.
 *
 * Giữa các pha mờ đen `FLOW_FEEL.fadeSeconds`; pha mới chỉ được dựng sau khi đã mờ hết, nên đồng hồ nhịp của nó
 * bắt đầu từ lúc đó. Thua (chỉ ở pha né): không chữ. Mọi thứ mờ về đen, bánh răng nứt nằm yên giữa màn tối
 * `loseHoldSeconds` (confirm bỏ qua), rồi vết nứt khép lại (cue `mend`) và chính pha né đó mờ vào lại từ beat 0.
 *
 * Tạm thời (mốc 4.1): tháo xong tầng 3 thì hiện "hết" và `finished`; hội thoại khép trận sẽ thay ở mốc 4.3.
 */
export class BattleScene implements Scene {
  /** Pha né cuối cùng vừa thắng, hoặc pha tháo cuối. Đọc để test. */
  private running: Running;
  private mode: Mode = "run";
  private clock = 0;
  private done = false;
  private cracked = false;
  private gearAt: Point = { x: GAME_WIDTH / 2, y: GAME_HEIGHT / 2 };
  private readonly bench: Workbench;
  private pageState: PageState | null = null;

  constructor(
    readonly resident: ResidentData,
    private readonly input: Input,
    private readonly audio: AudioPort,
    private readonly factory: BattleFactory,
  ) {
    this.bench = new Workbench(resident.mechanism, DISASSEMBLY_FEEL);
    this.running = this.build(0);
  }

  /** Trận đã xong (tháo hết tầng 3). */
  get finished(): boolean {
    return this.done;
  }

  /** Trang vẽ của trận, nếu có lượt nào dùng bút. */
  get page(): PageState | null {
    return this.pageState;
  }

  /** Pha đang chạy (null khi trận đã xong). */
  get current(): Scene | null {
    return this.mode === "ended" ? null : this.running.scene;
  }

  /** Bước hiện tại: 0 = né 1, 1 = tháo 1, ..., 5 = tháo 3. */
  get step(): number {
    return this.running.step;
  }

  /** Sprite của bánh răng ở màn thua. */
  get gearSprite(): "gear" | "gear-cracked" {
    return this.cracked ? "gear-cracked" : "gear";
  }

  update(): void {
    const dt = 1 / TICK_RATE;
    switch (this.mode) {
      case "run": {
        this.running.scene.update();
        this.watchOutcome();
        return;
      }
      case "fadeOut": {
        this.running.scene.update();
        this.clock += dt;
        if (this.clock >= FLOW_FEEL.fadeSeconds) this.advance();
        return;
      }
      case "fadeIn": {
        this.running.scene.update();
        this.clock += dt;
        if (this.clock >= FLOW_FEEL.fadeSeconds) this.setMode("run");
        return;
      }
      case "loseFade": {
        this.clock += dt;
        if (this.clock >= FLOW_FEEL.fadeSeconds) this.setMode("loseHold");
        return;
      }
      case "loseHold": {
        this.clock += dt;
        if (this.clock >= FLOW_FEEL.loseHoldSeconds || this.input.wasPressed("confirm")) {
          this.cracked = false;
          this.audio.playCue("mend");
          this.setMode("mend");
        }
        return;
      }
      case "mend": {
        this.clock += dt;
        if (this.clock >= FLOW_FEEL.mendSeconds) {
          // Dựng lại đúng pha né vừa thua, từ beat 0, cùng trang vẽ.
          this.running = this.build(this.running.step);
          this.setMode("fadeIn");
        }
        return;
      }
      case "ended":
        return;
    }
  }

  render(renderer: Renderer, alpha: number): void {
    const { mode } = this;
    if (mode === "ended") {
      renderer.clear(FADE_COLOR);
      renderer.text("hết", GAME_WIDTH / 2, GAME_HEIGHT / 2 - 10, { size: 20, align: "center", color: "#ffffff" });
      return;
    }
    if (mode === "loseHold" || mode === "mend") {
      renderer.clear(FADE_COLOR);
      this.renderGear(renderer);
      return;
    }
    this.running.scene.render(renderer, alpha);
    const cover =
      mode === "fadeOut" || mode === "loseFade"
        ? this.clock / FLOW_FEEL.fadeSeconds
        : mode === "fadeIn"
          ? 1 - this.clock / FLOW_FEEL.fadeSeconds
          : 0;
    if (cover > 0) {
      renderer.setAlpha(Math.min(1, cover));
      renderer.rect(0, 0, GAME_WIDTH, GAME_HEIGHT, FADE_COLOR);
      renderer.setAlpha(1);
    }
    if (mode === "loseFade") this.renderGear(renderer);
  }

  private renderGear(renderer: Renderer): void {
    const sprite = renderer.sprites.size(this.gearSprite);
    renderer.sprite(this.gearSprite, this.gearAt.x - sprite.width / 2, this.gearAt.y - sprite.height / 2);
  }

  private setMode(mode: Mode): void {
    this.mode = mode;
    this.clock = 0;
  }

  /** Dựng pha của bước `step`. */
  private build(step: number): Running {
    const round = Math.floor(step / 2);
    if (step % 2 === 0) {
      const pattern = this.resident.rounds[round];
      if (!pattern) throw new Error(`${this.resident.id}: không có lượt ${round + 1}`);
      if (pattern.pencil && !this.pageState) this.pageState = new PageState(SKETCH_FEEL);
      return { step, scene: this.factory.dodge(round, pattern, pattern.pencil ? this.pageState : null) };
    }
    return { step, scene: this.factory.disassemble(round + 1, this.bench) };
  }

  /** Đọc `outcome` của pha đang chạy; thắng / xong thì mờ ra, thua thì vào màn thua. */
  private watchOutcome(): void {
    const { scene, step } = this.running;
    if (step % 2 === 0) {
      const dodge = scene as DodgeLike;
      if (dodge.outcome === "lost") {
        this.gearAt = dodge.gearPosition;
        this.cracked = true;
        this.setMode("loseFade");
      } else if (dodge.outcome === "won") {
        this.pageState?.closeRound();
        this.setMode("fadeOut");
      }
      return;
    }
    if ((scene as DisassembleLike).outcome === "done") this.setMode("fadeOut");
  }

  /** Mờ xong: sang bước kế, hoặc kết thúc trận. */
  private advance(): void {
    const next = this.running.step + 1;
    if (next >= ROUNDS * 2) {
      this.done = true;
      this.setMode("ended");
      return;
    }
    this.running = this.build(next);
    this.setMode("fadeIn");
  }
}
