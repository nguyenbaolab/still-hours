import type { AudioPort } from "../audio/audio-engine";
import { BackgroundTicker } from "../audio/background-ticker";
import { GAME_HEIGHT, GAME_WIDTH, TICK_RATE } from "../core/config";
import type { Input } from "../core/input";
import { fitStrokes, type Pt } from "../core/drawing";
import { clamp, lerp } from "../core/math";
import { decodeDrawing } from "../core/save";
import type { Renderer } from "../core/renderer";
import { BATTLE_LAYOUT } from "../data/battle-layout";
import { DIALOGUES, type DialogueId } from "../data/dialogues";
import { AMBIENCE_FEEL, TOWN_FEEL } from "../data/flow-feel";
import type { ResidentData, ResidentId } from "../data/residents/types";
import {
  TOWN_AMBIENCE,
  TOWN_GATE_ROWS,
  TOWN_NPCS,
  TOWN_SIGNS,
  TOWN_SPOTS,
  type Tile,
  type TownMap,
  type TownNpc,
} from "../data/town";
import { drawBackdrop } from "./backdrop";
import { DialogueBox, type MeasureText } from "./dialogue-box";
import type { Scene } from "./scene";
import {
  ambienceFor,
  birdDelay,
  blockedTiles,
  facingFor,
  moveBody,
  pickInteraction,
  type AmbienceLayers,
  type Facing,
} from "./town-logic";

/** Việc thị trấn nhờ bên ngoài làm: vào trận với một cư dân (sau khi hội thoại mở đã đọc xong). */
export interface TownRequest {
  kind: "battle";
  id: ResidentId;
}

export interface TownInit {
  /** Cư dân đã giải thoát, theo thứ tự. */
  freed: readonly ResidentId[];
  /** Ô đứng ban đầu. Bỏ trống = điểm xuất phát trong tiệm. */
  spawn?: Tile;
  /** Đứng yên (không nhận phím) chừng này giây đầu: nhịp thở sau khi một cư dân được giải thoát. */
  holdSeconds?: number;
  /** Tranh của r4 (`SaveData.drawing`) để treo trên tường nhà Linh. Chỉ vẽ khi r4 đã giải thoát; null/rỗng = giấy trắng. */
  drawing?: readonly number[] | null;
  /** Nguồn ngẫu nhiên cho tiếng chim (0..1). Mặc định `Math.random`; test truyền bản cố định. */
  random?: () => number;
}

type Mode = "walk" | "dialogue" | "spot";

type Interactable =
  | { kind: "npc"; x: number; y: number; npc: TownNpc }
  | { kind: "sign"; x: number; y: number; dialogue: DialogueId }
  | { kind: "spot"; x: number; y: number; backdrop: string }
  | { kind: "tower"; x: number; y: number };

const COLOR = {
  background: "#0b0908",
  gate: "#8c8c98",
  gateSpark: "#e8e8f4",
  door: "#3a2814",
  paper: "#f1ead8",
  leaf: "#244a2e",
};

/**
 * Thị trấn nhìn từ trên xuống, lưới ô 32 px. Camera chỉ trôi ngang theo người thợ. Z tương tác với đối tượng ở phía
 * trước trong tầm (cư dân, biển, tờ giấy, chỗ ngắm cảnh, cửa tháp). Cư dân chưa giải thoát xám và đứng yên; cổng
 * chặn phố phía đông của họ. Hội thoại mở xong thì `request` là vào trận.
 */
export class TownScene implements Scene {
  private readonly tile = TOWN_FEEL.tile;
  private readonly freed: ResidentId[];
  private readonly blocked: ReadonlySet<string>;
  private readonly objects: Interactable[];
  private mode: Mode = "walk";
  private x: number;
  private y: number;
  private prevX: number;
  private prevY: number;
  private facing: Facing = "down";
  private dialogue: DialogueBox | null = null;
  private afterDialogue: (() => void) | null = null;
  private spotId = "";
  private spotView = 0;
  private pending: TownRequest | null = null;
  private tick = 0;
  private readonly holdTicks: number;
  private readonly layers: AmbienceLayers;
  private readonly wallStrokes: Pt[][];
  private readonly random: () => number;
  /** Tiếng tích xa. Dựng ở tick đầu tiên (không dựng khi cảnh chỉ để vẽ, như trong màn kết). */
  private ticker: BackgroundTicker | null = null;
  /** Số tick còn lại tới tiếng chim kế tiếp. */
  private birdTicks = 0;

  constructor(
    private readonly map: TownMap,
    private readonly residents: readonly ResidentData[],
    init: TownInit,
    private readonly input: Input,
    private readonly audio: AudioPort,
    private readonly measure: MeasureText,
  ) {
    this.freed = [...init.freed];
    this.holdTicks = Math.round((init.holdSeconds ?? 0) * TICK_RATE);
    this.blocked = blockedTiles(TOWN_NPCS, this.freed);
    const spawn = init.spawn ?? map.spawn;
    this.x = this.prevX = (spawn.x + 0.5) * this.tile;
    this.y = this.prevY = (spawn.y + 0.5) * this.tile;
    this.objects = this.buildObjects();
    this.layers = ambienceFor(this.freed);
    this.random = init.random ?? Math.random;
    this.birdTicks = this.nextBirdTicks();
    const { frame } = TOWN_AMBIENCE.wall;
    const inner = { x: frame.x + 3, y: frame.y + 3, w: frame.w - 6, h: frame.h - 6 };
    const arena = BATTLE_LAYOUT.arena;
    this.wallStrokes = fitStrokes(decodeDrawing(init.drawing ?? []), { x: 0, y: 0, w: arena.w, h: arena.h }, inner);
  }

  private nextBirdTicks(): number {
    const { minSeconds, maxSeconds } = TOWN_AMBIENCE.birds;
    return Math.round(birdDelay(this.random(), minSeconds, maxSeconds) * TICK_RATE);
  }

  /** Lớp thị trấn đang bật (đèn cửa sổ, dải trời, chim, tranh trên tường). */
  get ambience(): AmbienceLayers {
    return this.layers;
  }

  private buildObjects(): Interactable[] {
    const t = this.tile;
    const center = (tile: Tile): { x: number; y: number } => ({ x: (tile.x + 0.5) * t, y: (tile.y + 0.5) * t });
    const objects: Interactable[] = [];
    for (const npc of TOWN_NPCS) objects.push({ kind: "npc", npc, ...center(npc.tile) });
    for (const sign of TOWN_SIGNS) objects.push({ kind: "sign", dialogue: sign.dialogue, ...center(sign.tile) });
    for (const spot of TOWN_SPOTS) objects.push({ kind: "spot", backdrop: spot.backdrop, ...center(spot.tile) });
    // Cửa tháp chỉ dẫn vào trận boss khi đã tới được (cổng cuối mở, tức r4 đã giải thoát).
    objects.push({ kind: "tower", ...center(this.map.tower) });
    return objects;
  }

  /** Việc đang chờ bên ngoài xử lý (vào trận). Null nếu không có. */
  get request(): TownRequest | null {
    return this.pending;
  }

  clearRequest(): void {
    this.pending = null;
  }

  /** Tâm chân người thợ (px, toạ độ bản đồ). */
  get position(): Tile {
    return { x: this.x, y: this.y };
  }

  get facingDirection(): Facing {
    return this.facing;
  }

  get state(): Mode {
    return this.mode;
  }

  /** Cổng đang đóng. */
  get closedGates(): readonly number[] {
    return TOWN_NPCS.filter((npc) => !this.freed.includes(npc.id)).map((npc) => npc.gateX);
  }

  get cameraX(): number {
    return clamp(this.x - GAME_WIDTH / 2, 0, Math.max(0, this.worldWidth - GAME_WIDTH));
  }

  /** Gió và tiếng tích xa: bật ở tick đầu, tắt khi rời cảnh. */
  private updateBed(): void {
    if (!this.ticker) {
      this.ticker = new BackgroundTicker(this.audio, AMBIENCE_FEEL.townTickBpm, this.audio.distantSink, AMBIENCE_FEEL.tickDelaySeconds);
      this.audio.setWind(AMBIENCE_FEEL.windLevel);
    }
    this.ticker.update();
  }

  leave(): void {
    this.ticker?.stop();
    this.ticker = null;
    this.audio.setWind(0);
  }

  update(): void {
    this.updateBed();
    this.tick++;
    if (this.layers.birds && --this.birdTicks <= 0) {
      this.audio.playCue("bird");
      this.birdTicks = this.nextBirdTicks();
    }
    switch (this.mode) {
      case "walk":
        if (this.tick <= this.holdTicks) {
          this.prevX = this.x;
          this.prevY = this.y;
          return;
        }
        this.walk();
        return;
      case "dialogue": {
        const box = this.dialogue;
        box?.update(this.input, this.audio);
        if (box?.done) {
          this.dialogue = null;
          this.mode = "walk";
          const after = this.afterDialogue;
          this.afterDialogue = null;
          after?.();
        }
        return;
      }
      case "spot": {
        this.spotView = Math.min(1, this.spotView + 1 / (TICK_RATE * Math.max(0.001, TOWN_FEEL.spotFadeSeconds)));
        // Bấm một phím di chuyển bất kỳ thì đứng dậy.
        if (this.input.move.x !== 0 || this.input.move.y !== 0) {
          this.mode = "walk";
          this.spotView = 0;
        }
        return;
      }
    }
  }

  private walk(): void {
    this.prevX = this.x;
    this.prevY = this.y;
    let dx = this.input.move.x;
    let dy = this.input.move.y;
    const length = Math.hypot(dx, dy);
    if (length > 1) {
      dx /= length;
      dy /= length;
    }
    const speed = (this.input.isDown("slow") ? TOWN_FEEL.slowSpeed : TOWN_FEEL.walkSpeed) / TICK_RATE;
    const next = moveBody(this.map, this.blocked, { x: this.x, y: this.y }, dx * speed, dy * speed, TOWN_FEEL.hitbox, this.tile);
    this.x = next.x;
    this.y = next.y;
    this.facing = facingFor(dx, dy, this.facing);

    if (this.input.wasPressed("confirm")) this.interact();
  }

  private interact(): void {
    const target = pickInteraction(this.objects, this.x, this.y, this.facing, TOWN_FEEL.interactRange);
    if (!target) return;
    switch (target.kind) {
      case "sign":
        this.say(target.dialogue);
        return;
      case "spot":
        this.spotId = target.backdrop;
        this.spotView = 0;
        this.mode = "spot";
        return;
      case "npc": {
        const resident = this.residents.find((r) => r.id === target.npc.id);
        if (!resident) return;
        if (this.freed.includes(target.npc.id)) this.say(resident.dialogue.idle);
        else this.say(resident.dialogue.open, () => (this.pending = { kind: "battle", id: target.npc.id }));
        return;
      }
      case "tower": {
        if (!this.freed.includes("r4")) return;
        const boss = this.residents.find((r) => r.id === "boss");
        if (!boss) return;
        this.say(boss.dialogue.open, () => (this.pending = { kind: "battle", id: "boss" }));
        return;
      }
    }
  }

  private say(id: DialogueId, after?: () => void): void {
    this.dialogue = new DialogueBox(DIALOGUES[id], this.measure);
    this.afterDialogue = after ?? null;
    this.mode = "dialogue";
  }

  render(renderer: Renderer, alpha: number): void {
    const px = lerp(this.prevX, this.x, alpha);
    const py = lerp(this.prevY, this.y, alpha);
    this.drawWorld(renderer, this.cameraX, { x: px, y: py });

    if (this.mode === "spot" && this.spotView > 0) {
      drawBackdrop(renderer, this.spotId, { x: 0, y: 0, w: GAME_WIDTH, h: GAME_HEIGHT }, this.spotView, this.tick / TICK_RATE);
    }
    if (this.mode === "dialogue") this.dialogue?.render(renderer);
  }

  /** Chiều rộng bản đồ (px). */
  get worldWidth(): number {
    return (this.map.rows[0]?.length ?? 0) * this.tile;
  }

  /**
   * Vẽ bản đồ, cổng và cư dân với camera ở `camX`; có `keeper` thì vẽ cả người thợ ở toạ độ thế giới đó.
   * Không đổi trạng thái. Màn kết dùng để vẽ thị trấn với camera tự trôi và không có người thợ.
   */
  drawWorld(renderer: Renderer, camX: number, keeper: { x: number; y: number } | null): void {
    const t = this.tile;
    const camY = TOWN_FEEL.cameraOffsetY;
    renderer.clear(COLOR.background);

    const first = Math.max(0, Math.floor(camX / t));
    const last = Math.min((this.map.rows[0]?.length ?? 0) - 1, Math.floor((camX + GAME_WIDTH) / t));
    for (let ty = 0; ty < this.map.rows.length; ty++) {
      for (let tx = first; tx <= last; tx++) {
        const char = this.map.rows[ty]?.[tx] ?? "#";
        const def = this.map.legend[char];
        const sx = tx * t - camX;
        const sy = ty * t + camY;
        renderer.rect(sx, sy, t, t, def?.color ?? "#000000");
        this.decorate(renderer, char, sx, sy);
      }
    }

    this.renderAmbience(renderer, camX, camY);
    this.renderGates(renderer, camX, camY);

    // Cư dân và người thợ, xếp theo hàng để cái thấp hơn che cái cao hơn.
    const sprites: { y: number; draw: () => void }[] = [];
    for (const npc of TOWN_NPCS) {
      const id = this.freed.includes(npc.id) ? npc.freedSprite : npc.sprite;
      const size = renderer.sprites.size(id);
      const bottom = (npc.tile.y + 1) * t + camY;
      sprites.push({
        y: bottom,
        draw: () => renderer.sprite(id, (npc.tile.x + 0.5) * t - camX - size.width / 2, bottom - size.height - 2),
      });
    }
    if (keeper) {
      const keeperId = `keeper-${this.facing}`;
      const keeperSize = renderer.sprites.size(keeperId);
      const keeperBottom = keeper.y + TOWN_FEEL.hitbox.h / 2 + camY;
      sprites.push({
        y: keeperBottom,
        draw: () => renderer.sprite(keeperId, keeper.x - camX - keeperSize.width / 2, keeperBottom - keeperSize.height),
      });
    }
    sprites.sort((a, b) => a.y - b.y).forEach((s) => s.draw());
  }

  /** Các lớp đổi dần theo cư dân đã giải thoát: đèn cửa sổ, tranh trên tường, dải trời. */
  private renderAmbience(renderer: Renderer, camX: number, camY: number): void {
    const t = this.tile;
    const feel = TOWN_AMBIENCE;
    if (this.layers.windows) {
      for (const tile of feel.windows.tiles) {
        const sx = tile.x * t - camX;
        if (sx < -t || sx > GAME_WIDTH) continue;
        const sy = tile.y * t + camY;
        renderer.rect(sx + 8, sy + 6, 16, 18, feel.windows.glow);
        renderer.rect(sx + 10, sy + 8, 12, 14, feel.windows.color);
      }
    }
    if (this.layers.wall) {
      const { frame } = feel.wall;
      const sx = frame.x - camX;
      if (sx > -frame.w && sx < GAME_WIDTH) {
        const sy = frame.y + camY;
        renderer.rect(sx, sy, frame.w, frame.h, feel.wall.edge);
        renderer.rect(sx + 2, sy + 2, frame.w - 4, frame.h - 4, feel.wall.paper);
        renderer.clip(sx + 2, sy + 2, frame.w - 4, frame.h - 4);
        for (const stroke of this.wallStrokes) {
          for (let i = 1; i < stroke.length; i++) {
            const a = stroke[i - 1] as Pt;
            const b = stroke[i] as Pt;
            renderer.line(a.x - camX, a.y + camY, b.x - camX, b.y + camY, 1, feel.wall.ink);
          }
        }
        renderer.unclip();
      }
    }
    if (this.layers.sky) {
      renderer.rect(0, 0, GAME_WIDTH, feel.sky.height, feel.sky.color);
      renderer.rect(0, feel.sky.height - 4, GAME_WIDTH, 4, feel.sky.edge);
    }
  }

  /** Vài nét trang trí lên ô: cửa, cây, biển, bàn, lan can. */
  private decorate(renderer: Renderer, char: string, sx: number, sy: number): void {
    const t = this.tile;
    switch (char) {
      case "D":
        renderer.rect(sx + 6, sy + 4, t - 12, t - 4, COLOR.door);
        break;
      case "T":
        renderer.disc(sx + t / 2, sy + t / 2, t / 2 - 3, COLOR.leaf);
        break;
      case "n":
      case "d":
        renderer.rect(sx + 8, sy + 8, t - 16, t - 16, COLOR.paper);
        break;
      case "r":
        renderer.rect(sx, sy + t / 2 - 2, t, 4, "#c9b88a");
        break;
    }
  }

  /** Cổng đóng: dải xám lấp lánh chậm theo nhịp `gateBpm`. */
  private renderGates(renderer: Renderer, camX: number, camY: number): void {
    const t = this.tile;
    const seconds = this.tick / TICK_RATE;
    const beat = Math.floor((seconds * TOWN_FEEL.gateBpm) / 60);
    for (const gateX of this.closedGates) {
      const sx = gateX * t - camX;
      if (sx < -t || sx > GAME_WIDTH) continue;
      const top = TOWN_GATE_ROWS.from * t + camY;
      const height = (TOWN_GATE_ROWS.to - TOWN_GATE_ROWS.from + 1) * t;
      renderer.setAlpha(0.8);
      renderer.rect(sx, top, t, height, COLOR.gate);
      renderer.setAlpha(1);
      for (let i = 0; i < 7; i++) {
        // Vị trí lấp lánh đổi theo mỗi nhịp, xác định theo (nhịp, cổng, i).
        const h = Math.imul(beat * 31 + gateX * 17 + i * 101, 2654435761) >>> 0;
        const px = sx + 3 + (h % (t - 6));
        const py = top + 3 + ((h >>> 8) % (height - 6));
        renderer.rect(px, py, 3, 3, COLOR.gateSpark);
      }
    }
  }
}
