import type { AudioPort } from "../audio/audio-engine";
import { TickScheduler } from "../audio/tick-scheduler";
import { BeatClock } from "../core/beat-clock";
import { GAME_HEIGHT, TICK_RATE } from "../core/config";
import { DEBUG } from "../core/debug";
import type { Input } from "../core/input";
import { lerp } from "../core/math";
import type { Renderer } from "../core/renderer";
import { BATTLE_LAYOUT } from "../data/battle-layout";
import { PLAYER_FEEL } from "../data/feel";
import { FLOW_FEEL, STILL_FEEL } from "../data/flow-feel";
import type { Pattern } from "../data/pattern-types";
import { TEST_PATTERN } from "../data/patterns/test-pattern";
import { BULLET_FEEL, LAG_CLOCK_FEEL, PACE_FEEL, RHYTHM_FEEL } from "../data/rhythm-feel";
import { DISTRACTION_FEEL, DRAW_FEEL, SKETCH_FEEL } from "../data/sketch-feel";
import { drawBackdrop } from "../scenes/backdrop";
import type { Scene } from "../scenes/scene";
import { BulletWorld } from "./bullets";
import { exitView, hasExited, type ExitView } from "./exit";
import { InkLayer } from "./ink-layer";
import { lagClockHands } from "./lag-clock";
import { Pace } from "./pace";
import { isStill, Stillness } from "./stillness";
import { addDrawnBeats, dropPoint, PageState, pencilHome, pencilPickup, type Point } from "./page";
import { PatternRunner } from "./pattern-runner";
import { Player } from "./player";
import { replayPieces } from "./sketch";
import type { SpawnContext } from "./spawners";

/** Dòng mẫu để chọn cỡ chữ còn đọc rõ dấu tiếng Việt. Chưa chọn font. */
const VIETNAMESE_SAMPLE = "ắ ằ ẳ ẵ ặ ế ề ể ễ ệ ố ồ ổ ỗ ộ ớ ờ ở ỡ ợ ứ ừ ử ữ ự ỳ ỷ ỹ ỵ đ";
const SAMPLE_SIZES = [8, 12, 16, 20] as const;

const COLOR = {
  background: "#0b0908",
  frame: "#ffffff",
  arena: "#000000",
  hpLost: "#9c1c1c",
  hp: "#f2d23c",
  text: "#ffffff",
  debugText: "#9fb3a8",
  debugBody: "#5b6b73",
  debugPlayerHitbox: "#3cff7a",
  absorb: "#fff8ee",
  glint: "#fff8ee",
  clockFace: "#e6e0d4",
  clockInside: "#1a1613",
  clockHand: "#f0b429",
  idleLine: "#8a7f68",
} as const;

/** Bao lâu bánh răng nháy sáng sau khi ôm một câu. Không kèm bất tử. */
const ABSORB_FLASH_SECONDS = 0.2;

export type DodgeOutcome = "playing" | "won" | "lost";

export interface DodgeOptions {
  /** Trang vẽ giữ qua các lần thua và các lượt (do `BattleScene` giữ). Không có thì tự tạo khi pattern có `pencil`. */
  page?: PageState;
  /** Số vòng đã qua từ các lần thua trước của lượt này (boss: khe cửa rộng dần theo số vòng; không đặt lại khi thua). */
  loopsSeen?: number;
}

type Stage = "play" | "reveal" | "clearing" | "done" | "lost";

/**
 * Pha né đạn: khung chiến đấu ở giữa màn hình, bánh răng di chuyển trong khung, thanh máu bên dưới.
 * Đạn sinh ra theo một pattern (dữ liệu) trên một đồng hồ nhịp chung với tiếng tích tắc.
 *
 * Thứ tự mỗi tick quan trọng:
 *  1. đồng hồ nhịp đọc thời gian một lần (cả tick dùng cùng một giá trị);
 *  2. người chơi di chuyển;
 *  3. đạn cũ được đưa tới thời điểm mới;
 *  4. pattern sinh cảnh báo/đạn mới (đặt đúng chỗ theo thời gian của beat, không theo tick);
 *  5. bút: nhặt, vẽ, hoặc rơi khi chạm đạn xao nhãng (chỉ pattern có `pencil`);
 *  6. câu chữ: ôm hoặc nhả, rồi áp hệ số nhịp;
 *  7. tiếng tích tắc được hẹn theo bản đồ vừa cập nhật;
 *  8. kiểm tra va chạm đạn (câu không trừ máu), rồi xem pha đã thua hay xong chưa.
 *
 * `outcome`: `lost` khi hết máu (pha đóng băng, `BattleScene` quyết định tiếp); `won` khi kết thúc theo `finish`.
 */
export class DodgePhase implements Scene {
  private readonly arena = BATTLE_LAYOUT.arena;
  private readonly player: Player;
  private readonly clock: BeatClock;
  private readonly world: BulletWorld;
  private readonly pattern: Pattern;
  private readonly runner: PatternRunner;
  private readonly pace: Pace;
  /** Đứng yên thì chậm nhịp và hiện cảnh nền (chỉ pattern có `still`). */
  private readonly stillness: Stillness | null;
  /** Số vòng đã qua từ các lần thua trước (xem `DodgeOptions.loopsSeen`). */
  private readonly carriedLoops: number;
  /** Khe cửa ở tick này (chỉ pattern `finish: exit`). */
  private exit: ExitView | null = null;
  private readonly ticks: TickScheduler;
  private readonly spawnContext: SpawnContext;
  private readonly ink = new InkLayer();
  private tick = 0;
  private absorbFlash = 0;
  private stage: Stage = "play";
  private result: DodgeOutcome = "playing";

  // Bút (chỉ khi pattern có `pencil`).
  private readonly pageState: PageState | null;
  private pencil: Point = { x: 0, y: 0 };
  private holding = false;
  private everHeld = false;
  private secondsSinceDrop = Infinity;
  private lastBeat: number;
  /** Quãng bánh răng tự đi trong tick (px), không tính lực hút. */
  private inputStep = 0;
  private lastCycle = 0;
  private idleShown = 0;
  private idleLeft = 0;
  private idleText = "";

  /** Giây còn lại của màn lộ tranh, và tổng của nó. */
  private revealLeft = 0;
  private readonly revealTotal = SKETCH_FEEL.replaySeconds + SKETCH_FEEL.revealSeconds;
  /** Giây kể từ lúc pha `length` xong; đạn mờ đi trong `FLOW_FEEL.clearSeconds`. */
  private clearAge = 0;

  /** `bodySize`: cạnh sprite bánh răng (px). */
  constructor(
    private readonly input: Input,
    private readonly audio: AudioPort,
    bodySize: number,
    pattern: Pattern = TEST_PATTERN,
    options: DodgeOptions = {},
  ) {
    this.pattern = pattern;
    this.carriedLoops = options.loopsSeen ?? 0;
    this.player = new Player(PLAYER_FEEL, bodySize);
    this.player.place(this.arena.x + this.arena.w / 2, this.arena.y + this.arena.h / 2);

    // Beat 0 diễn ra sau một đoạn dạo đầu, tính từ bây giờ theo đồng hồ âm thanh.
    const startBpm = pattern.bpm ?? RHYTHM_FEEL.defaultBpm;
    this.clock = new BeatClock(audio, startBpm, audio.contextTime() + RHYTHM_FEEL.leadInSeconds);
    this.lastBeat = this.clock.beat;
    this.world = new BulletWorld(this.arena, BULLET_FEEL);
    this.spawnContext = { arena: this.arena, world: this.world, feel: BULLET_FEEL, playerX: 0, playerY: 0 };
    this.runner = new PatternRunner(pattern, this.clock.tempo, BULLET_FEEL, RHYTHM_FEEL.defaultBpm);
    this.pace = new Pace(this.clock.tempo, PACE_FEEL, RHYTHM_FEEL.beatsPerBar);
    this.stillness = pattern.still ? new Stillness(this.clock.tempo, STILL_FEEL) : null;
    this.ticks = new TickScheduler(this.clock, () => audio.contextTime(), audio.tickSink);

    if (pattern.pencil) {
      this.pageState = options.page ?? new PageState(SKETCH_FEEL);
      this.pencil = pencilHome(this.arena, pattern.pencil);
    } else {
      this.pageState = null;
    }
  }

  get outcome(): DodgeOutcome {
    return this.result;
  }

  /** Số vòng đã qua của lượt này, kể cả phần mang từ các lần thua trước. Boss giữ số này qua lần thua. */
  get loopsSeen(): number {
    return this.carriedLoops + this.runner.cycle;
  }

  /** Trang vẽ (null nếu pattern không có bút). */
  get page(): PageState | null {
    return this.pageState;
  }

  /** Tâm bánh răng (màn thua vẽ bánh răng nứt đúng chỗ này). */
  get gearPosition(): Point {
    return { x: this.player.x, y: this.player.y };
  }

  get holdingPencil(): boolean {
    return this.holding;
  }

  get pencilPosition(): Point {
    return this.pencil;
  }

  update(): void {
    this.tick++;

    if (this.stage === "lost" || this.stage === "done") return;
    if (this.stage === "reveal") {
      this.revealLeft -= 1 / TICK_RATE;
      if (this.revealLeft <= 0) {
        this.stage = "done";
        this.result = "won";
      }
      return;
    }

    this.clock.update();
    if (this.stage === "clearing") {
      // Đạn còn lại trôi nốt và mờ đi, không còn gì trừ máu, không còn tiếng tích tắc.
      this.world.step(this.clock.time, this.clock.beat);
      this.clearAge += 1 / TICK_RATE;
      return;
    }

    this.updateExit();
    this.player.update(this.input, this.arena);
    // Quãng bánh răng tự đi trong tick này (chưa tính lực hút): lực hút kéo bánh răng không làm kim cô bé chạy.
    this.inputStep = Math.hypot(this.player.x - this.player.prevX, this.player.y - this.player.prevY);
    this.world.step(this.clock.time, this.clock.beat);

    this.spawnContext.playerX = this.player.x;
    this.spawnContext.playerY = this.player.y;
    this.runner.update(this.clock.beat, this.spawnContext);
    this.pullPlayer();
    this.updatePencil();

    // Câu không trừ máu. Ôm thì nhịp chậm từ beat sau; đi qua thì hồi ở đầu nhịp kế.
    // Đổi hệ số trước khi hẹn tiếng, để tick này đã dùng bản đồ mới.
    const absorbed = this.world.absorbWords(this.player.hitbox);
    this.world.commitWords();
    for (let i = 0; i < absorbed; i++) {
      this.pace.absorb(this.clock.beat);
      this.audio.playCue("wordAbsorb");
    }
    for (const signal of this.world.signals) {
      if (signal !== "release") continue;
      this.pace.release(this.clock.beat);
      this.audio.playCue("wordRelease");
    }
    this.pace.update(this.clock.beat);
    if (this.stillness) {
      // Quãng cả tick, kể cả lực hút: bị kéo đi thì không tính là đứng yên.
      const step = Math.hypot(this.player.x - this.player.prevX, this.player.y - this.player.prevY);
      const moving = this.input.move.x !== 0 || this.input.move.y !== 0;
      this.stillness.update(this.clock.time, this.clock.beat, isStill(moving, step, STILL_FEEL), 1 / TICK_RATE);
    }
    this.ticks.update();

    if (absorbed > 0) this.absorbFlash = ABSORB_FLASH_SECONDS;
    else this.absorbFlash = Math.max(0, this.absorbFlash - 1 / TICK_RATE);

    // Player.hit tự bỏ qua nếu đang bất tử. Chỉ tính một lần trúng mỗi tick. Đạn chữ không đi qua đây.
    const damage = this.world.hit(this.player.hitbox);
    if (damage > 0) this.player.hit(damage);

    if (this.player.hp <= 0) {
      this.stage = "lost";
      this.result = "lost";
      this.ticks.dropPending();
      this.pageState?.sketch.lift();
      return;
    }
    this.checkFinish();
  }

  /**
   * Bút chì của cô bé. Chưa cầm: chờ bánh răng tới đủ gần. Đang cầm: mọi bước đi để lại nét, kim đồng hồ của
   * cô chạy khi bánh răng thật sự dịch, và chạm đạn xao nhãng thì bút rơi (không trừ máu, không tẩy nét).
   */
  private updatePencil(): void {
    const page = this.pageState;
    const beat = this.clock.beat;
    const beatDelta = Math.max(0, beat) - Math.max(0, this.lastBeat);
    this.lastBeat = beat;
    this.updateIdleLine();
    if (!page) return;

    if (this.holding) {
      const grabbed = this.world.consumeDistractions(this.player.hitbox, true);
      if (grabbed > 0) {
        this.holding = false;
        this.secondsSinceDrop = 0;
        page.sketch.lift();
        this.pencil = dropPoint(
          { x: this.player.x, y: this.player.y },
          { x: this.world.grabX, y: this.world.grabY },
          this.arena,
          DRAW_FEEL,
        );
        this.audio.playCue("pencilDrop");
        return;
      }
      if (page.sketch.count < DRAW_FEEL.maxSegments) {
        page.sketch.sample(this.player.x, this.player.y, this.input.isDown("slow"));
      }
      const moved = this.inputStep >= DRAW_FEEL.minMovePerTick;
      const before = page.drawnBeats;
      page.drawnBeats = addDrawnBeats(before, true, moved, beatDelta);
      if (Math.floor(page.drawnBeats) > Math.floor(before)) this.audio.playCue("drawTick");
      return;
    }

    this.secondsSinceDrop += 1 / TICK_RATE;
    if (pencilPickup({ x: this.player.x, y: this.player.y }, this.pencil, DRAW_FEEL, this.secondsSinceDrop)) {
      this.holding = true;
      this.everHeld = true;
      page.sketch.lift();
      this.audio.playCue("pencilUp");
    }
  }

  /** Hết một vòng pattern mà chưa từng cầm bút trong lượt này: cô tự nhủ một câu (giọng trì hoãn, không phải lời khuyên). */
  private updateIdleLine(): void {
    if (this.idleLeft > 0) this.idleLeft -= 1 / TICK_RATE;
    if (this.runner.cycle <= this.lastCycle) return;
    this.lastCycle = this.runner.cycle;
    const lines = this.pattern.idleLines;
    if (this.everHeld || !lines || lines.length === 0 || this.idleShown >= DRAW_FEEL.idleLineMax) return;
    this.idleText = lines[this.idleShown % lines.length] as string;
    this.idleLeft = DRAW_FEEL.idleLineSeconds;
    this.idleShown++;
  }

  /** Khe cửa của boss theo beat nghe được: mở hay đóng, và có đang cảnh báo không. Bánh răng chỉ lách qua khi khe mở. */
  private updateExit(): void {
    const finish = this.pattern.finish;
    if (finish?.kind !== "exit") return;
    this.exit = exitView(finish, this.pattern.lengthBeats, this.clock.beat, this.carriedLoops, this.arena);
    this.player.door = this.exit.door;
  }

  /** Xem pha đã xong chưa theo `finish`. Gọi cuối tick, sau khi đã loại trường hợp thua. */
  private checkFinish(): void {
    const finish = this.pattern.finish;
    const beat = this.clock.beat;
    if (finish?.kind === "exit") {
      if (hasExited(this.player.x, this.player.y, this.arena, finish.side)) {
        this.stage = "clearing";
        this.result = "won";
        this.ticks.dropPending();
      }
      return;
    }
    if (finish?.kind === "page") {
      const drawn = this.pageState?.drawnBeats ?? 0;
      // Trang luôn khép được: đủ beat vẽ, hoặc hết `maxLoops` vòng dù chưa đủ (đứng chờ không có lợi).
      if (drawn >= finish.drawBeats || beat >= DRAW_FEEL.maxLoops * this.pattern.lengthBeats) this.beginReveal();
      return;
    }
    const lengthRule = finish?.kind === "length" || (finish === undefined && !this.pattern.loop);
    if (lengthRule && beat >= this.pattern.lengthBeats) {
      this.stage = "clearing";
      this.result = "won";
      this.ticks.dropPending();
    }
  }

  /** Trang xong: thôi sinh đạn, hủy tiếng đã hẹn, khung mờ đi, nét của lượt này được tua lại rồi giữ. */
  private beginReveal(): void {
    this.stage = "reveal";
    this.revealLeft = this.revealTotal;
    this.ticks.dropPending();
    this.pageState?.sketch.lift();
  }

  /** Kéo bánh răng về phía từng đạn xao nhãng. `pull` = 0 thì không làm gì. */
  private pullPlayer(): void {
    const pull = DISTRACTION_FEEL.pull / TICK_RATE;
    if (!(pull > 0)) return;
    let dx = 0;
    let dy = 0;
    for (let i = 0; i < this.world.distractions.size; i++) {
      const item = this.world.distractions.at(i);
      const ox = item.x - this.player.x;
      const oy = item.y - this.player.y;
      const dist = Math.hypot(ox, oy);
      if (dist < 1e-4) continue;
      dx += (ox / dist) * pull;
      dy += (oy / dist) * pull;
    }
    if (dx !== 0 || dy !== 0) this.player.shift(dx, dy, this.arena);
  }

  /** 1 = trận bình thường, 0 = chỉ còn tranh. Khung mờ đi ở đầu màn lộ tranh. */
  private veil(): number {
    if (this.stage !== "reveal" && this.stage !== "done") return 1;
    const fade = Math.min(0.45, this.revealTotal / 3);
    const elapsed = this.revealTotal - this.revealLeft;
    return this.stage === "done" ? 0 : Math.max(0, 1 - elapsed / fade);
  }

  render(renderer: Renderer, alpha: number): void {
    const { arena } = this;
    const { borderThickness: border } = BATTLE_LAYOUT;
    const player = this.player;
    const revealing = this.stage === "reveal" || this.stage === "done";

    renderer.clear(COLOR.background);

    const veil = this.veil();
    renderer.setAlpha(veil);
    // Khung chiến đấu: viền trắng bao quanh vùng đen.
    renderer.rect(arena.x - border, arena.y - border, arena.w + 2 * border, arena.h + 2 * border, COLOR.frame);
    renderer.rect(arena.x, arena.y, arena.w, arena.h, COLOR.arena);
    this.renderExit(renderer);

    const clearAlpha =
      this.stage === "clearing" && FLOW_FEEL.clearSeconds > 0 ? Math.max(0, 1 - this.clearAge / FLOW_FEEL.clearSeconds) : 1;
    // Cảnh nền của "đứng yên": nằm dưới nét và đạn.
    if (this.stillness && this.pattern.still && this.stillness.backdrop > 0) {
      drawBackdrop(renderer, this.pattern.still.backdrop, arena, veil * clearAlpha * STILL_FEEL.backdropAlpha * this.stillness.backdrop, this.clock.time);
      renderer.setAlpha(veil);
    }

    if (!revealing) this.renderLiveInk(renderer);
    renderer.setAlpha(veil * clearAlpha);
    this.world.render(renderer, alpha, DEBUG.on);
    renderer.setAlpha(veil);

    const px = lerp(player.prevX, player.x, alpha);
    const py = lerp(player.prevY, player.y, alpha);
    const half = player.bodySize / 2;
    this.renderPencil(renderer, px, py);
    if (player.visible) renderer.sprite("gear", px - half, py - half);
    if (this.absorbFlash > 0) renderer.rectOutline(px - half - 2, py - half - 2, player.bodySize + 4, player.bodySize + 4, COLOR.absorb);

    this.renderHpBar(renderer);
    this.renderGirlClock(renderer);
    this.renderLagClock(renderer);
    renderer.setAlpha(1);

    if (this.idleLeft > 0 && !revealing) {
      renderer.text(this.idleText, arena.x, arena.y - border - 26, {
        size: 16,
        color: COLOR.idleLine,
        alpha: Math.min(1, this.idleLeft / 0.6),
      });
    }

    if (revealing) {
      renderer.clip(arena.x, arena.y, arena.w, arena.h);
      this.renderReveal(renderer);
      renderer.unclip();
    }
    if (DEBUG.on) this.renderDebug(renderer, px, py);
  }

  /** Cây bút: nằm yên và lóe sáng mỗi vài beat, hoặc nằm trong tay bánh răng. */
  private renderPencil(renderer: Renderer, gearX: number, gearY: number): void {
    if (!this.pageState) return;
    const size = renderer.sprites.size("pencil");
    if (this.holding) {
      renderer.sprite("pencil", gearX + 4, gearY - size.height - 2);
      return;
    }
    renderer.sprite("pencil", this.pencil.x - size.width / 2, this.pencil.y - size.height / 2);
    const every = DRAW_FEEL.glintEveryBeats;
    const into = ((this.clock.beat % every) + every) % every;
    if (every > 0 && into < 0.5) renderer.ring(this.pencil.x, this.pencil.y, DRAW_FEEL.pickupRadius, COLOR.glint, 1);
  }

  /** Mặt đồng hồ của cô bé, ngay ngoài góc phải trên của khung. Kim chỉ tiến độ trang. */
  private renderGirlClock(renderer: Renderer): void {
    const finish = this.pattern.finish;
    if (finish?.kind !== "page" || !this.pageState) return;
    const { arena } = this;
    const r = DRAW_FEEL.clockRadius;
    const cx = arena.x + arena.w - r;
    const cy = arena.y - BATTLE_LAYOUT.borderThickness - r - 6;
    renderer.disc(cx, cy, r + 2, COLOR.clockFace);
    renderer.disc(cx, cy, r, COLOR.clockInside);
    const angle = -Math.PI / 2 + Math.PI * 2 * Math.min(1, this.pageState.drawnBeats / finish.drawBeats);
    renderer.line(cx, cy, cx + Math.cos(angle) * (r - 3), cy + Math.sin(angle) * (r - 3), 2, COLOR.clockHand);
    renderer.disc(cx, cy, 2, COLOR.clockFace);
  }

  /** Khe cửa trên viền khung: mở thì viền bị cắt, 1 beat trước khi mở thì đoạn viền ở khe nhấp nháy. */
  private renderExit(renderer: Renderer): void {
    const view = this.exit;
    if (!view || !(view.open || view.warn)) return;
    const { arena } = this;
    const border = BATTLE_LAYOUT.borderThickness;
    const { side, from, to } = view.nextDoor;
    const bar = (x: number, y: number, w: number, h: number): void => {
      if (view.open) renderer.rect(x, y, w, h, COLOR.background);
      else if (Math.floor(this.clock.time / BULLET_FEEL.telegraphFlashSeconds) % 2 === 0) renderer.rect(x, y, w, h, COLOR.glint);
    };
    if (side === "right") bar(arena.x + arena.w, from, border, to - from);
    else if (side === "left") bar(arena.x - border, from, border, to - from);
    else if (side === "top") bar(from, arena.y - border, to - from, border);
    else bar(from, arena.y + arena.h, to - from, border);
  }

  /** Mặt đồng hồ trễ, ngay ngoài góc phải trên của khung: kim mờ giờ thật, kim sáng giờ kịch bản của beat đang nghe. */
  private renderLagClock(renderer: Renderer): void {
    if (!this.pattern.lagClock) return;
    const { arena } = this;
    const { radius: r, secondsPerTurn } = LAG_CLOCK_FEEL;
    const cx = arena.x + arena.w - r;
    const cy = arena.y - BATTLE_LAYOUT.borderThickness - r - 6;
    const tempo = this.clock.tempo;
    const hands = lagClockHands(this.clock.time, tempo.scriptTimeAtBeat(Math.max(0, this.clock.beat)), secondsPerTurn);
    renderer.disc(cx, cy, r + 2, COLOR.clockFace);
    renderer.disc(cx, cy, r, COLOR.clockInside);
    const hand = (deg: number, length: number, width: number, color: string): void => {
      const angle = -Math.PI / 2 + (deg * Math.PI) / 180;
      renderer.line(cx, cy, cx + Math.cos(angle) * length, cy + Math.sin(angle) * length, width, color);
    };
    hand(hands.real, r - 3, 2, LAG_CLOCK_FEEL.realColor);
    hand(hands.script, r - 5, 2, LAG_CLOCK_FEEL.scriptColor);
    renderer.disc(cx, cy, 2, COLOR.clockFace);
  }

  /** Lúc chơi: mọi nét đã vẽ, mờ, nằm dưới đạn. */
  private renderLiveInk(renderer: Renderer): void {
    const page = this.pageState;
    if (!page || page.sketch.count === 0) return;
    const layer = this.ink.sync(page.sketch.segments, SKETCH_FEEL.color);
    if (!layer) return;
    const { arena } = this;
    renderer.clip(arena.x, arena.y, arena.w, arena.h);
    renderer.setAlpha(this.veil() * DRAW_FEEL.liveInkAlpha);
    renderer.image(layer, 0, 0);
    renderer.setAlpha(this.veil());
    renderer.unclip();
  }

  /** Lộ tranh: nét các lượt trước hiện sẵn bằng sáp, nét của lượt này được tua lại đúng thứ tự đã vẽ. */
  private renderReveal(renderer: Renderer): void {
    const page = this.pageState;
    if (!page) return;
    const { segments } = page.sketch;
    const past = Math.min(page.pastSegments, segments.length);
    for (let i = 0; i < past; i++) {
      const seg = segments[i];
      if (seg) renderer.line(seg.x0, seg.y0, seg.x1, seg.y1, SKETCH_FEEL.crayonWidth, SKETCH_FEEL.crayonColor);
    }
    const current = segments.slice(past);
    let ink = 0;
    for (const seg of current) ink += seg.length;
    const elapsed = this.revealTotal - this.revealLeft;
    const span = SKETCH_FEEL.replaySeconds;
    const drawn = span <= 0 ? ink : ink * Math.min(1, Math.max(0, elapsed) / span);
    for (const piece of replayPieces(current, drawn)) {
      renderer.line(piece.x0, piece.y0, piece.x1, piece.y1, SKETCH_FEEL.crayonWidth, SKETCH_FEEL.crayonColor);
    }
  }

  private renderHpBar(renderer: Renderer): void {
    const { arena } = this;
    const { borderThickness, hpBar } = BATTLE_LAYOUT;
    const { hp, maxHp } = this.player;

    const y = arena.y + arena.h + borderThickness + hpBar.gapBelowFrame;
    const barX = arena.x + 40;
    const barWidth = maxHp * hpBar.pxPerHp;

    renderer.text("HP", arena.x, y, { size: 20, color: COLOR.text });
    renderer.rect(barX, y, barWidth, hpBar.height, COLOR.hpLost);
    renderer.rect(barX, y, hp * hpBar.pxPerHp, hpBar.height, COLOR.hp);
    renderer.text(`${hp} / ${maxHp}`, barX + barWidth + 12, y, { size: 20, color: COLOR.text });
  }

  /** Lớp debug (F1): hitbox thật của bánh răng và đạn, cùng số liệu nhịp. */
  private renderDebug(renderer: Renderer, px: number, py: number): void {
    const { player, clock, world } = this;
    const half = player.bodySize / 2;

    renderer.rectOutline(px - half, py - half, player.bodySize, player.bodySize, COLOR.debugBody);
    const hitbox = player.hitboxAt(px, py);
    renderer.rectOutline(hitbox.x, hitbox.y, hitbox.w, hitbox.h, COLOR.debugPlayerHitbox);

    const scale = renderer.pixelScale;
    const scaleText = Number.isInteger(scale) ? String(scale) : scale.toFixed(2);
    const page = this.pageState;
    const finish = this.pattern.finish;
    const drawText =
      page && finish?.kind === "page"
        ? `  bút ${this.holding ? "cầm" : "nằm"}  vẽ ${page.drawnBeats.toFixed(1)}/${finish.drawBeats}  nét ${page.sketch.count}`
        : "";
    const exitText = this.exit ? `  khe ${this.exit.open ? "mở" : this.exit.warn ? "báo" : "đóng"}  vòng đã qua ${this.loopsSeen}` : "";
    const stillText = this.stillness ? `  đứng yên ${this.stillness.active ? "có" : "không"}` : "";
    const lines = [
      `DEBUG (F1)  tick ${this.tick}  phóng ${scaleText}`,
      `x ${player.x.toFixed(1)}  y ${player.y.toFixed(1)}  ${player.invincible ? "bất tử" : ""}`,
      `beat ${clock.beat.toFixed(2)}  BPM ${clock.bpm.toFixed(1)}  hệ số ${clock.tempo.paceAtBeat(clock.beat).toFixed(2)}  vòng ${this.runner.cycle + 1}`,
      `đạn ${world.activeBullets}  cảnh báo ${world.telegraphs.size}  bỏ ${world.dropped}${drawText}${stillText}${exitText}`,
    ];
    lines.forEach((line, i) => renderer.text(line, 8, 8 + i * 20, { size: 16, color: COLOR.debugText }));

    let sampleY = GAME_HEIGHT - 8;
    for (let i = SAMPLE_SIZES.length - 1; i >= 0; i--) {
      const size = SAMPLE_SIZES[i] as number;
      sampleY -= size + 4;
      renderer.text(`${size}  ${VIETNAMESE_SAMPLE}`, 8, sampleY, { size, color: COLOR.debugText });
    }
  }
}
