import type { AudioPort } from "../audio/audio-engine";
import { TickScheduler } from "../audio/tick-scheduler";
import { BeatClock } from "../core/beat-clock";
import { GAME_HEIGHT, GAME_WIDTH, TICK_RATE } from "../core/config";
import type { Input } from "../core/input";
import { lerp } from "../core/math";
import type { Renderer } from "../core/renderer";
import { BATTLE_LAYOUT } from "../data/battle-layout";
import { PLAYER_FEEL } from "../data/feel";
import type { Pattern } from "../data/pattern-types";
import { TEST_PATTERN } from "../data/patterns/test-pattern";
import { BULLET_FEEL, PACE_FEEL, RHYTHM_FEEL } from "../data/rhythm-feel";
import { DISTRACTION_FEEL, SKETCH_FEEL } from "../data/sketch-feel";
import type { Scene } from "../scenes/scene";
import { BulletWorld } from "./bullets";
import { Pace } from "./pace";
import { PatternRunner } from "./pattern-runner";
import { Player } from "./player";
import { EraserPlay, Sketch } from "./sketch";
import type { SpawnContext } from "./spawners";
import { StrokeLayer } from "./stroke-layer";

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
  mutedHint: "#8a7f68",
  debugText: "#9fb3a8",
  debugBody: "#5b6b73",
  debugPlayerHitbox: "#3cff7a",
  absorb: "#fff8ee",
} as const;

/** Bao lâu bánh răng nháy sáng sau khi ôm một câu. Không kèm bất tử. */
const ABSORB_FLASH_SECONDS = 0.2;

/**
 * Pha né đạn: khung chiến đấu ở giữa màn hình, bánh răng di chuyển trong khung, thanh máu bên dưới.
 * Đạn sinh ra theo một pattern (dữ liệu) trên một đồng hồ nhịp chung với tiếng tích tắc.
 *
 * Thứ tự mỗi tick quan trọng:
 *  1. đồng hồ nhịp đọc thời gian một lần (cả tick dùng cùng một giá trị);
 *  2. người chơi di chuyển;
 *  3. đạn cũ được đưa tới thời điểm mới;
 *  4. pattern sinh cảnh báo/đạn mới (đặt đúng chỗ theo thời gian của beat, không theo tick);
 *  5. câu chữ: ôm hoặc nhả, rồi áp hệ số nhịp;
 *  6. tiếng tích tắc được hẹn theo bản đồ vừa cập nhật;
 *  7. kiểm tra va chạm đạn (câu không trừ máu).
 */
export class DodgePhase implements Scene {
  private readonly arena = BATTLE_LAYOUT.arena;
  private readonly player: Player;
  private readonly clock: BeatClock;
  private readonly world: BulletWorld;
  private readonly pattern: Pattern;
  private readonly runner: PatternRunner;
  private readonly pace: Pace;
  private readonly ticks: TickScheduler;
  private readonly sketch = new Sketch(SKETCH_FEEL);
  private readonly strokes = new StrokeLayer(SKETCH_FEEL);
  private readonly eraser = new EraserPlay();
  private readonly spawnContext: SpawnContext;
  private tick = 0;
  private debug = false;
  private absorbFlash = 0;
  private heardAt: number;
  private reveal = 0;
  private galleries = 0;

  /** `bodySize`: cạnh sprite bánh răng (px). */
  constructor(
    private readonly input: Input,
    private readonly audio: AudioPort,
    bodySize: number,
    pattern: Pattern = TEST_PATTERN,
  ) {
    this.pattern = pattern;
    this.player = new Player(PLAYER_FEEL, bodySize);
    this.player.place(this.arena.x + this.arena.w / 2, this.arena.y + this.arena.h / 2);

    // Beat 0 diễn ra sau một đoạn dạo đầu, tính từ bây giờ theo đồng hồ âm thanh.
    const startBpm = pattern.bpm ?? RHYTHM_FEEL.defaultBpm;
    this.clock = new BeatClock(audio, startBpm, audio.contextTime() + RHYTHM_FEEL.leadInSeconds);
    this.world = new BulletWorld(this.arena, BULLET_FEEL);
    this.spawnContext = { arena: this.arena, world: this.world, feel: BULLET_FEEL, playerX: 0, playerY: 0 };
    this.runner = new PatternRunner(pattern, this.clock.tempo, BULLET_FEEL, RHYTHM_FEEL.defaultBpm);
    this.pace = new Pace(this.clock.tempo, PACE_FEEL, RHYTHM_FEEL.beatsPerBar);
    this.ticks = new TickScheduler(this.clock, () => audio.contextTime(), audio.tickSink);
    this.heardAt = audio.heardTime();
  }

  update(): void {
    this.tick++;
    if (this.input.wasPressed("debug")) this.debug = !this.debug;
    if (this.input.wasPressed("mute")) this.audio.toggleMute();

    const heard = this.audio.heardTime();
    const heardDt = Math.max(0, heard - this.heardAt);
    this.heardAt = heard;

    if (this.reveal > 0) {
      this.clock.hold(heardDt);
      this.clock.update();
      this.reveal -= 1 / TICK_RATE;
      this.eraser.update(SKETCH_FEEL.eraserSpeed / TICK_RATE);
      return;
    }

    this.clock.update();
    if (this.beginGallery()) return;

    this.player.update(this.input, this.arena);
    this.world.step(this.clock.time, this.clock.beat);

    this.spawnContext.playerX = this.player.x;
    this.spawnContext.playerY = this.player.y;
    this.runner.update(this.clock.beat, this.spawnContext);
    this.pullPlayer();
    this.sketch.sample(this.player.x, this.player.y, this.input.isDown("slow"));

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
    this.ticks.update();

    const grabbed = this.world.consumeDistractions(this.player.hitbox);
    for (let i = 0; i < grabbed; i++) this.eraser.push(this.sketch.erase(SKETCH_FEEL.eraseLength));
    this.eraser.update(SKETCH_FEEL.eraserSpeed / TICK_RATE);

    if (absorbed > 0) this.absorbFlash = ABSORB_FLASH_SECONDS;
    else this.absorbFlash = Math.max(0, this.absorbFlash - 1 / TICK_RATE);

    // Player.hit tự bỏ qua nếu đang bất tử. Chỉ tính một lần trúng mỗi tick. Đạn chữ không đi qua đây.
    const damage = this.world.hit(this.player.hitbox);
    if (damage > 0) this.player.hit(damage);

    // Chưa có màn thua: hết máu thì hồi đầy máu và chơi tiếp.
    if (this.player.hp <= 0) this.player.resetHealth();
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

  /**
   * Cuối vòng của pattern có `gallery`: giữ nhịp đúng ở mốc vừa khép, hủy tiếng đã hẹn,
   * rồi để tranh hiện. Pattern khác không đi vào đây, nên đồng hồ thử nhịp không bị giữ.
   */
  private beginGallery(): boolean {
    if (!this.pattern.gallery) return false;
    const length = this.pattern.lengthBeats;
    const finished = Math.floor(Math.max(0, this.clock.beat) / length);
    const next = this.pattern.loop ? finished : Math.min(finished, 1);
    if (next <= this.galleries) return false;
    this.galleries = next;
    const boundary = this.clock.tempo.timeAtBeat(next * length);
    const overshoot = this.clock.time - boundary;
    if (overshoot > 0) this.clock.hold(overshoot);
    this.clock.update();
    this.ticks.dropPending();
    this.reveal = SKETCH_FEEL.revealSeconds;
    return true;
  }

  /** 1 = trận bình thường, 0 = chỉ còn tranh. Mờ dần rồi hiện lại khung trước khi vòng sau chạy. */
  private veil(): number {
    if (this.reveal <= 0) return 1;
    const fade = Math.min(0.45, SKETCH_FEEL.revealSeconds / 3);
    const elapsed = SKETCH_FEEL.revealSeconds - this.reveal;
    if (elapsed < fade) return 1 - elapsed / fade;
    if (this.reveal < fade) return 1 - this.reveal / fade;
    return 0;
  }

  render(renderer: Renderer, alpha: number): void {
    const { arena } = this;
    const { borderThickness: border } = BATTLE_LAYOUT;
    const player = this.player;

    renderer.clear(COLOR.background);

    const veil = this.veil();
    renderer.setAlpha(veil);
    // Khung chiến đấu: viền trắng bao quanh vùng đen. Khi xem tranh thì mờ đi cùng đạn.
    renderer.rect(arena.x - border, arena.y - border, arena.w + 2 * border, arena.h + 2 * border, COLOR.frame);
    renderer.rect(arena.x, arena.y, arena.w, arena.h, COLOR.arena);

    this.world.render(renderer, alpha, this.debug);

    const px = lerp(player.prevX, player.x, alpha);
    const py = lerp(player.prevY, player.y, alpha);
    const half = player.bodySize / 2;
    if (player.visible) renderer.sprite("gear", px - half, py - half);
    if (this.absorbFlash > 0) renderer.rectOutline(px - half - 2, py - half - 2, player.bodySize + 4, player.bodySize + 4, COLOR.absorb);

    this.renderHpBar(renderer);
    renderer.setAlpha(1);

    renderer.clip(arena.x, arena.y, arena.w, arena.h);
    this.strokes.render(renderer, this.sketch, this.eraser, px, py);
    renderer.unclip();
    if (this.audio.muted) {
      renderer.text("tắt tiếng (M)", GAME_WIDTH - 8, 8, { size: 16, align: "right", color: COLOR.mutedHint });
    }
    if (this.debug) this.renderDebug(renderer, px, py);
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
    const lines = [
      `DEBUG (F1)  tick ${this.tick}  phóng ${scaleText}`,
      `x ${player.x.toFixed(1)}  y ${player.y.toFixed(1)}  ${player.invincible ? "bất tử" : ""}`,
      `beat ${clock.beat.toFixed(2)}  BPM ${clock.bpm.toFixed(1)}  hệ số ${clock.tempo.paceAtBeat(clock.beat).toFixed(2)}  vòng ${this.runner.cycle + 1}`,
      `đạn ${world.activeBullets}  cảnh báo ${world.telegraphs.size}  bỏ ${world.dropped}  nét ${this.sketch.count}`,
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
