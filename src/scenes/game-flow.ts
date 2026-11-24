import type { AudioPort } from "../audio/audio-engine";
import type { PageState } from "../battle/page";
import { strokesFromSegments, type Pt } from "../core/drawing";
import type { Input } from "../core/input";
import type { Renderer } from "../core/renderer";
import { encodeDrawing, newSave, type SaveStore } from "../core/save";
import { BATTLE_LAYOUT } from "../data/battle-layout";
import { DIALOGUES } from "../data/dialogues";
import { FLOW_FEEL } from "../data/flow-feel";
import type { ResidentData, ResidentId } from "../data/residents/types";
import { TOWN, TOWN_NPCS, type Tile } from "../data/town";
import { Director } from "./director";
import type { MeasureText } from "./dialogue-box";
import { EndingScene } from "./ending";
import { IntroScene } from "./intro";
import type { Scene } from "./scene";
import { TitleScene, type AudioGate, type TitleResult } from "./title";
import { TownScene } from "./town";
import { VignetteScene } from "./vignette";

/** Phần của trận mà luồng game cần: đã xong chưa, và trang vẽ (cư dân 4). `BattleScene` hiện thực; test dùng bản giả. */
export interface BattleLike extends Scene {
  readonly finished: boolean;
  readonly page: PageState | null;
}

export interface FlowDeps {
  input: Input;
  audio: AudioPort & AudioGate;
  measure: MeasureText;
  store: SaveStore;
  residents: readonly ResidentData[];
  /** Dựng trận của một cư dân. */
  makeBattle(resident: ResidentData): BattleLike;
  /**
   * Chơi thử một cảnh riêng thay cho luồng thật (`PLAYTEST_PHASE` trong main.ts, bỏ ở mốc 5.6). Có thì sau màn bắt đầu
   * vào cảnh này; `finished` trả về true thì về màn bắt đầu.
   */
  override?: { make(): Scene; finished?(scene: Scene): boolean };
}

type Stage =
  | { kind: "title"; scene: TitleScene }
  | { kind: "intro"; scene: IntroScene }
  | { kind: "town"; scene: TownScene }
  | { kind: "battle"; scene: BattleLike; resident: ResidentData }
  | { kind: "vignette"; scene: VignetteScene; resident: ResidentData }
  | { kind: "ending"; scene: EndingScene }
  | { kind: "custom"; scene: Scene };

/** Ô người thợ đứng khi vào thị trấn sau khi `freed`: ngay phía đông của cư dân vừa giải thoát. Chưa ai thì undefined (tiệm). */
export function townSpawnFor(freed: readonly ResidentId[]): Tile | undefined {
  for (let i = freed.length - 1; i >= 0; i--) {
    const npc = TOWN_NPCS.find((n) => n.id === freed[i]);
    if (npc) return { x: npc.tile.x + 1, y: npc.tile.y };
  }
  return undefined;
}

/**
 * Luồng của cả game (CLAUDE.md, "Trình tự đầy đủ"): Title → Intro → Town → (hội thoại mở → trận → cảnh kết → lưu →
 * Town) × 5 → Ending → Title. Giữ `Director` và tiến trình (`freed`, tranh của r4); mỗi chuyển cảnh là một `fadeTo`.
 * Lưu sau mỗi cư dân (kể cả boss, kèm `finished`). Cảnh kết ở thị trấn của r1–r3 và boss tạm là đứng yên
 * `FLOW_FEEL.freedHoldSeconds` giây (cảnh thật ở mốc 6.5); r4 có `VignetteScene` "pencil".
 */
export class GameFlow {
  readonly director: Director;
  private stage: Stage;
  private freedIds: ResidentId[] = [];
  private drawing: number[] | null = null;
  private seenIntro = false;
  private strokes: Pt[][] = [];

  constructor(private readonly deps: FlowDeps) {
    const title = this.newTitle();
    this.stage = { kind: "title", scene: title };
    this.director = new Director(deps.input, deps.audio, title);
  }

  get freed(): readonly ResidentId[] {
    return this.freedIds;
  }

  get stageKind(): Stage["kind"] {
    return this.stage.kind;
  }

  get scene(): Scene {
    return this.stage.scene;
  }

  update(): void {
    this.director.update();
    if (this.director.transitioning) return;
    const stage = this.stage;
    if (this.director.scene !== stage.scene) return;
    switch (stage.kind) {
      case "title": {
        const result = stage.scene.result;
        if (result) this.director.fadeTo(() => this.afterTitle(result));
        return;
      }
      case "intro":
        if (stage.scene.finished) {
          this.seenIntro = true;
          this.persist(false);
          this.director.fadeTo(() => this.newTown(undefined, 0));
        }
        return;
      case "town": {
        const request = stage.scene.request;
        if (!request) return;
        stage.scene.clearRequest();
        const resident = this.deps.residents.find((r) => r.id === request.id);
        if (resident) this.director.fadeTo(() => this.newBattle(resident));
        return;
      }
      case "battle": {
        if (!stage.scene.finished) return;
        const { resident } = stage;
        if (resident.id === "r4") {
          this.strokes = stage.scene.page ? strokesFromSegments(stage.scene.page.sketch.segments) : [];
          this.drawing = encodeDrawing(this.strokes, BATTLE_LAYOUT.arena);
          this.director.fadeTo(() => this.newVignette(resident));
        } else {
          this.director.fadeTo(() => this.complete(resident.id));
        }
        return;
      }
      case "vignette":
        if (stage.scene.finished) this.director.fadeTo(() => this.complete(stage.resident.id));
        return;
      case "ending":
        if (stage.scene.finished) this.director.fadeTo(() => this.backToTitle());
        return;
      case "custom": {
        const done = this.deps.override?.finished;
        if (done?.(stage.scene)) this.director.fadeTo(() => this.backToTitle());
        return;
      }
    }
  }

  render(renderer: Renderer, alpha: number): void {
    this.director.render(renderer, alpha);
  }

  private newTitle(): TitleScene {
    const { store, audio, input } = this.deps;
    return new TitleScene(audio, input, { exists: () => store.exists(), clear: () => store.clear() });
  }

  private backToTitle(): Scene {
    this.freedIds = [];
    this.drawing = null;
    this.seenIntro = false;
    const scene = this.newTitle();
    this.stage = { kind: "title", scene };
    return scene;
  }

  private afterTitle(result: TitleResult): Scene {
    const { override, store } = this.deps;
    if (override) {
      const scene = override.make();
      this.stage = { kind: "custom", scene };
      return scene;
    }
    const save = result === "continue" ? store.load() : null;
    if (!save) {
      this.freedIds = [];
      this.drawing = null;
      this.seenIntro = false;
      this.director.playSeconds = 0;
      return this.newIntro();
    }
    this.freedIds = [...save.freed];
    this.drawing = save.drawing;
    this.seenIntro = save.seenIntro;
    this.director.playSeconds = save.playSeconds;
    if (save.finished) return this.newEnding();
    if (!save.seenIntro) return this.newIntro();
    return this.newTown(townSpawnFor(this.freedIds), 0);
  }

  private newIntro(): Scene {
    const scene = new IntroScene(DIALOGUES.introOpening, this.deps.input, this.deps.audio, this.deps.measure);
    this.stage = { kind: "intro", scene };
    return scene;
  }

  private newTown(spawn: Tile | undefined, holdSeconds: number): Scene {
    const { input, audio, measure, residents } = this.deps;
    const scene = new TownScene(TOWN, residents, { freed: this.freedIds, spawn, holdSeconds }, input, audio, measure);
    this.stage = { kind: "town", scene };
    return scene;
  }

  private newBattle(resident: ResidentData): Scene {
    const scene = this.deps.makeBattle(resident);
    this.stage = { kind: "battle", scene, resident };
    return scene;
  }

  private newVignette(resident: ResidentData): Scene {
    const scene = new VignetteScene(resident.vignette, this.deps.input, { drawing: this.strokes });
    this.stage = { kind: "vignette", scene, resident };
    return scene;
  }

  private newEnding(): Scene {
    const { input, audio, measure, residents, store } = this.deps;
    const everyone = residents.map((r) => r.id);
    const world = new TownScene(TOWN, residents, { freed: everyone }, input, audio, measure);
    const scene = new EndingScene(world, input, audio, { clear: () => store.clear() }, this.director.playSeconds);
    this.stage = { kind: "ending", scene };
    return scene;
  }

  /** Một cư dân được giải thoát: ghi nhận, lưu, rồi về thị trấn (hoặc sang màn kết nếu là boss). */
  private complete(id: ResidentId): Scene {
    if (!this.freedIds.includes(id)) this.freedIds.push(id);
    const finished = id === "boss";
    this.persist(finished);
    if (finished) return this.newEnding();
    return this.newTown(townSpawnFor(this.freedIds), FLOW_FEEL.freedHoldSeconds);
  }

  private persist(finished: boolean): void {
    this.deps.store.write({
      ...newSave(),
      seenIntro: this.seenIntro,
      freed: [...this.freedIds],
      playSeconds: this.director.playSeconds,
      drawing: this.drawing,
      finished,
    });
  }
}
