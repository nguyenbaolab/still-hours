import type { AudioPort } from "../audio/audio-engine";
import { TickScheduler } from "../audio/tick-scheduler";
import { BeatClock } from "../core/beat-clock";
import { GAME_WIDTH } from "../core/config";
import type { Input } from "../core/input";
import { lerp } from "../core/math";
import type { Renderer } from "../core/renderer";
import { BATTLE_LAYOUT } from "../data/battle-layout";
import { PLAYER_FEEL } from "../data/feel";
import type { Pattern } from "../data/pattern-types";
import { TEST_PATTERN } from "../data/patterns/test-pattern";
import { BULLET_FEEL, RHYTHM_FEEL } from "../data/rhythm-feel";
import type { Scene } from "../scenes/scene";
import { BulletWorld } from "./bullets";
import { PatternRunner } from "./pattern-runner";
import { Player } from "./player";
import type { SpawnContext } from "./spawners";

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
} as const;

/**
 * Pha né đạn: khung chiến đấu ở giữa màn hình, bánh răng di chuyển trong khung, thanh máu bên dưới.
 * Đạn sinh ra theo một pattern (dữ liệu) trên một đồng hồ nhịp chung với tiếng tích tắc.
 *
 * Thứ tự mỗi tick quan trọng:
 *  1. đồng hồ nhịp đọc thời gian một lần (cả tick dùng cùng một giá trị);
 *  2. người chơi di chuyển;
 *  3. đạn cũ được đưa tới thời điểm mới;
 *  4. pattern sinh cảnh báo/đạn mới (đặt đúng chỗ theo thời gian của beat, không theo tick);
 *  5. tiếng tích tắc được hẹn trước;
 *  6. kiểm tra va chạm.
 */
export class DodgePhase implements Scene {
  private readonly arena = BATTLE_LAYOUT.arena;
  private readonly player: Player;
  private readonly clock: BeatClock;
  private readonly world: BulletWorld;
  private readonly runner: PatternRunner;
  private readonly ticks: TickScheduler;
  private readonly spawnContext: SpawnContext;
  private tick = 0;
  private debug = false;

  /** `bodySize`: cạnh sprite bánh răng (px). */
  constructor(
    private readonly input: Input,
    private readonly audio: AudioPort,
    bodySize: number,
    pattern: Pattern = TEST_PATTERN,
  ) {
    this.player = new Player(PLAYER_FEEL, bodySize);
    this.player.place(this.arena.x + this.arena.w / 2, this.arena.y + this.arena.h / 2);

    // Beat 0 diễn ra sau một đoạn dạo đầu, tính từ bây giờ theo đồng hồ âm thanh.
    const startBpm = pattern.bpm ?? RHYTHM_FEEL.defaultBpm;
    this.clock = new BeatClock(audio, startBpm, audio.contextTime() + RHYTHM_FEEL.leadInSeconds);
    this.world = new BulletWorld(this.arena, BULLET_FEEL);
    this.spawnContext = { arena: this.arena, world: this.world, feel: BULLET_FEEL, playerX: 0, playerY: 0 };
    this.runner = new PatternRunner(pattern, this.clock.tempo, BULLET_FEEL, RHYTHM_FEEL.defaultBpm);
    this.ticks = new TickScheduler(this.clock, () => audio.contextTime(), audio.tickSink);
  }

  update(): void {
    this.tick++;
    if (this.input.wasPressed("debug")) this.debug = !this.debug;
    if (this.input.wasPressed("mute")) this.audio.toggleMute();

    this.clock.update();
    this.player.update(this.input, this.arena);
    this.world.step(this.clock.time, this.clock.beat);

    this.spawnContext.playerX = this.player.x;
    this.spawnContext.playerY = this.player.y;
    this.runner.update(this.clock.beat, this.spawnContext);
    this.ticks.update();

    // Player.hit tự bỏ qua nếu đang bất tử. Chỉ tính một lần trúng mỗi tick.
    const damage = this.world.hit(this.player.hitbox);
    if (damage > 0) this.player.hit(damage);

    // Chưa có màn thua: hết máu thì hồi đầy máu và chơi tiếp.
    if (this.player.hp <= 0) this.player.resetHealth();
  }

  render(renderer: Renderer, alpha: number): void {
    const { arena } = this;
    const { borderThickness: border } = BATTLE_LAYOUT;
    const player = this.player;

    renderer.clear(COLOR.background);

    // Khung chiến đấu: viền trắng bao quanh vùng đen.
    renderer.rect(arena.x - border, arena.y - border, arena.w + 2 * border, arena.h + 2 * border, COLOR.frame);
    renderer.rect(arena.x, arena.y, arena.w, arena.h, COLOR.arena);

    this.world.render(renderer, alpha, this.debug);

    const px = lerp(player.prevX, player.x, alpha);
    const py = lerp(player.prevY, player.y, alpha);
    const half = player.bodySize / 2;
    if (player.visible) renderer.sprite("gear", px - half, py - half);

    this.renderHpBar(renderer);
    if (this.audio.muted) {
      renderer.text("tắt tiếng (M)", GAME_WIDTH - 4, 4, { size: 8, align: "right", color: COLOR.mutedHint });
    }
    if (this.debug) this.renderDebug(renderer, px, py);
  }

  private renderHpBar(renderer: Renderer): void {
    const { arena } = this;
    const { borderThickness, hpBar } = BATTLE_LAYOUT;
    const { hp, maxHp } = this.player;

    const y = arena.y + arena.h + borderThickness + hpBar.gapBelowFrame;
    const barX = arena.x + 20;
    const barWidth = maxHp * hpBar.pxPerHp;

    renderer.text("HP", arena.x, y, { size: 10, color: COLOR.text });
    renderer.rect(barX, y, barWidth, hpBar.height, COLOR.hpLost);
    renderer.rect(barX, y, hp * hpBar.pxPerHp, hpBar.height, COLOR.hp);
    renderer.text(`${hp} / ${maxHp}`, barX + barWidth + 6, y, { size: 10, color: COLOR.text });
  }

  /** Lớp debug (F1): hitbox thật của bánh răng và đạn, cùng số liệu nhịp. */
  private renderDebug(renderer: Renderer, px: number, py: number): void {
    const { player, clock, world } = this;
    const half = player.bodySize / 2;

    renderer.rectOutline(px - half, py - half, player.bodySize, player.bodySize, COLOR.debugBody);
    const hitbox = player.hitboxAt(px, py);
    renderer.rectOutline(hitbox.x, hitbox.y, hitbox.w, hitbox.h, COLOR.debugPlayerHitbox);

    const lines = [
      `DEBUG (F1)  tick ${this.tick}`,
      `x ${player.x.toFixed(1)}  y ${player.y.toFixed(1)}  ${player.invincible ? "bất tử" : ""}`,
      `beat ${clock.beat.toFixed(2)}  BPM ${clock.bpm.toFixed(1)}  vòng ${this.runner.cycle + 1}`,
      `đạn ${world.activeBullets}  cảnh báo ${world.telegraphs.size}  bỏ ${world.dropped}`,
    ];
    lines.forEach((line, i) => renderer.text(line, 4, 4 + i * 10, { size: 8, color: COLOR.debugText }));
  }
}
