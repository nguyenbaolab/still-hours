import type { Input } from "../core/input";
import { lerp, overlaps } from "../core/math";
import type { Renderer } from "../core/renderer";
import { BATTLE_LAYOUT } from "../data/battle-layout";
import { PLAYER_FEEL } from "../data/feel";
import { TEMP_OBSTACLES } from "../data/temp-obstacles";
import { Player } from "./player";
import { TempObstacle } from "./temp-obstacles";

const COLOR = {
  background: "#0b0908",
  frame: "#ffffff",
  arena: "#000000",
  obstacle: "#d9534f",
  hpLost: "#9c1c1c",
  hp: "#f2d23c",
  text: "#ffffff",
  debugText: "#9fb3a8",
  debugBody: "#5b6b73",
  debugPlayerHitbox: "#3cff7a",
  debugObstacleHitbox: "#ff4de1",
} as const;

/**
 * Pha né đạn: khung chiến đấu ở giữa màn hình, bánh răng di chuyển trong khung, thanh máu bên dưới.
 * Bước 1 mới có di chuyển + va chạm + máu; vật cản là code tạm (TempObstacle), sẽ thay bằng đạn theo beat.
 */
export class DodgePhase {
  private readonly arena = BATTLE_LAYOUT.arena;
  private readonly player: Player;
  private readonly obstacles = TEMP_OBSTACLES.map((data) => new TempObstacle(data, this.arena));
  private tick = 0;
  private debug = false;

  /** `bodySize`: cạnh sprite bánh răng (px). */
  constructor(
    private readonly input: Input,
    bodySize: number,
  ) {
    this.player = new Player(PLAYER_FEEL, bodySize);
    this.player.place(this.arena.x + this.arena.w / 2, this.arena.y + this.arena.h / 2);
  }

  /** Một bước logic (gọi đúng TICK_RATE lần/giây, sau input.poll()). Không vẽ. */
  update(): void {
    this.tick++;
    if (this.input.wasPressed("debug")) this.debug = !this.debug;

    this.player.update(this.input, this.arena);
    for (const obstacle of this.obstacles) obstacle.update(this.arena);

    // Mỗi tick tối đa một lần trúng; Player.hit tự bỏ qua nếu đang bất tử.
    const hitbox = this.player.hitbox;
    for (const obstacle of this.obstacles) {
      if (overlaps(hitbox, obstacle.rect)) {
        this.player.hit(obstacle.damage);
        break;
      }
    }

    // Chưa có màn thua: hết máu thì hồi đầy máu và chơi tiếp.
    if (this.player.hp <= 0) this.player.resetHealth();
  }

  /** Vẽ một khung hình. `alpha` ∈ [0, 1) dùng để nội suy giữa tick trước và tick hiện tại. Không đổi trạng thái game. */
  render(renderer: Renderer, alpha: number): void {
    const { arena } = this;
    const { borderThickness: border } = BATTLE_LAYOUT;
    const player = this.player;

    renderer.clear(COLOR.background);

    // Khung chiến đấu: viền trắng bao quanh vùng đen.
    renderer.rect(arena.x - border, arena.y - border, arena.w + 2 * border, arena.h + 2 * border, COLOR.frame);
    renderer.rect(arena.x, arena.y, arena.w, arena.h, COLOR.arena);

    for (const obstacle of this.obstacles) {
      renderer.rect(
        lerp(obstacle.prevX, obstacle.x, alpha),
        lerp(obstacle.prevY, obstacle.y, alpha),
        obstacle.w,
        obstacle.h,
        COLOR.obstacle,
      );
    }

    const px = lerp(player.prevX, player.x, alpha);
    const py = lerp(player.prevY, player.y, alpha);
    const half = player.bodySize / 2;
    if (player.visible) renderer.sprite("gear", px - half, py - half);

    this.renderHpBar(renderer);

    if (this.debug) {
      this.renderDebug(renderer, px, py, alpha);
    }
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

  /** Lớp debug (F1): hitbox thật, khung hình vẽ của bánh răng, và vài số liệu. */
  private renderDebug(renderer: Renderer, px: number, py: number, alpha: number): void {
    const player = this.player;
    const half = player.bodySize / 2;

    for (const obstacle of this.obstacles) {
      const rect = obstacle.rectAt(lerp(obstacle.prevX, obstacle.x, alpha), lerp(obstacle.prevY, obstacle.y, alpha));
      renderer.rectOutline(rect.x, rect.y, rect.w, rect.h, COLOR.debugObstacleHitbox);
    }

    renderer.rectOutline(px - half, py - half, player.bodySize, player.bodySize, COLOR.debugBody);
    const hitbox = player.hitboxAt(px, py);
    renderer.rectOutline(hitbox.x, hitbox.y, hitbox.w, hitbox.h, COLOR.debugPlayerHitbox);

    const info = `DEBUG (F1)  tick ${this.tick}`;
    renderer.text(info, 4, 4, { size: 8, color: COLOR.debugText });
    renderer.text(
      `x ${player.x.toFixed(1)}  y ${player.y.toFixed(1)}  ${player.invincible ? "bất tử" : ""}`,
      4,
      14,
      { size: 8, color: COLOR.debugText },
    );
  }
}
