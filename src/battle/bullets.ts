import { circleIntersectsRect, lerp, overlaps, type Rect, segmentIntersectsBox } from "../core/math";
import type { Renderer } from "../core/renderer";
import { WORD_FEEL, type BulletFeel } from "../data/rhythm-feel";
import { DISTRACTION_FEEL } from "../data/sketch-feel";
import { Pool } from "./pool";

const COLOR = {
  bullet: "#efe7d4",
  bulletBig: "#e0524a",
  hand: "#e0524a",
  handHub: "#ffd0c8",
  telegraph: "#ffb347",
  debugBullet: "#ff4de1",
} as const;

/** Đạn không sống quá số giây này (dọn rác an toàn nếu có đạn bay mãi). */
const MAX_LIFETIME_SECONDS = 40;
/** Phần hiển thị lớn hơn vùng va chạm bấy nhiêu px (cùng nguyên tắc: hình vẽ lớn hơn hitbox, người chơi thấy mình né sát). */
const DRAW_EXTRA_RADIUS = 1;

/**
 * Đạn chấm: vị trí là HÀM CỦA THỜI GIAN kể từ lúc xuất hiện (điểm xuất phát + vận tốc × thời gian), không cộng dồn
 * theo tick. Nhờ vậy đạn luôn đúng chỗ so với đồng hồ nhịp dù khung hình giật, và đạn xuất hiện trễ nửa tick vẫn
 * được đặt đúng chỗ như đã xuất hiện từ đúng beat.
 */
export class DotBullet {
  x = 0;
  y = 0;
  prevX = 0;
  prevY = 0;
  originX = 0;
  originY = 0;
  /** px/giây */
  vx = 0;
  vy = 0;
  /** Thời điểm (giây theo đồng hồ nhịp) đạn xuất hiện. */
  fireTime = 0;
  radius = 0;
  damage = 0;
  big = false;
}

/** Kim đồng hồ: đoạn thẳng từ tâm, góc là hàm của BEAT (nên quay nhanh/chậm theo tempo). */
export class HandBullet {
  cx = 0;
  cy = 0;
  angle = 0;
  prevAngle = 0;
  startAngle = 0;
  /** rad mỗi beat */
  angularVelocity = 0;
  fireBeat = 0;
  endBeat = 0;
  length = 0;
  thickness = 0;
  damage = 0;
}

/** Đạn xao nhãng: bay thẳng, hoặc treo trên sợi chỉ và đung đưa. Chạm thì không trừ máu. */
export class DistractionBullet {
  x = 0;
  y = 0;
  prevX = 0;
  prevY = 0;
  originX = 0;
  originY = 0;
  vx = 0;
  vy = 0;
  fireTime = 0;
  radius = 0;
  sprite = DISTRACTION_FEEL.sprite;
  /** Treo từ mép trên, đung đưa theo beat. */
  swing = false;
  anchorX = 0;
  anchorY = 0;
  length = 0;
  amplitude = 0;
  perBeat = 0;
  fireBeat = 0;
  endBeat = 0;
}

export type TelegraphShape = "box" | "line" | "ring";

/** Hình cảnh báo nhấp nháy. Dùng chung các trường tùy theo `shape`. */
export class Telegraph {
  shape: TelegraphShape = "box";
  x = 0;
  y = 0;
  /** box: chiều rộng, cao. line: điểm cuối. ring: bán kính ở `w`. */
  w = 0;
  h = 0;
  dashed = false;
  startTime = 0;
  endTime = 0;
  /** Hết ở beat bắn. Hết theo beat chứ không theo giây đã đóng băng, để nhịp chậm không cắt cảnh báo trước đạn. */
  endBeat = 0;
}

type WordState = "fly" | "absorbed" | "fading";

/** Một câu bay qua khung. Vị trí là hàm của thời gian, giống đạn chấm. */
export class WordBullet {
  phrase = "";
  x = 0;
  y = 0;
  prevX = 0;
  prevY = 0;
  originX = 0;
  originY = 0;
  vx = 0;
  vy = 0;
  fireTime = 0;
  boxW = 0;
  boxH = 0;
  hitW = 0;
  hitH = 0;
  state: WordState = "fly";
  /** Tâm đã qua mép kia của khung trong tick này, chưa chốt là "đi qua" cho tới khi không bị ôm. */
  pendingExit = false;
  /** Giây (đồng hồ nhịp) lúc bắt đầu tan hoặc nổ. */
  markTime = 0;
}

/** Toàn bộ đạn và cảnh báo đang hoạt động trong khung né. */
export class BulletWorld {
  readonly dots: Pool<DotBullet>;
  readonly hands: Pool<HandBullet>;
  readonly words: Pool<WordBullet>;
  readonly distractions: Pool<DistractionBullet>;
  readonly telegraphs: Pool<Telegraph>;
  /** Câu vừa đi hết khung mà không chạm, trong tick này. */
  readonly signals: "release"[] = [];
  /** Số lần phải bỏ qua đạn/cảnh báo vì pool đầy (nên là 0; tăng `maxBullets` nếu khác 0). */
  dropped = 0;

  /** Thời gian và beat của tick hiện tại (từ `step`). */
  private time = 0;
  private beat = 0;

  constructor(
    private readonly arena: Rect,
    private readonly feel: BulletFeel,
  ) {
    this.dots = new Pool(feel.maxBullets, () => new DotBullet());
    this.hands = new Pool(32, () => new HandBullet());
    this.words = new Pool(WORD_FEEL.maxWords, () => new WordBullet());
    this.distractions = new Pool(DISTRACTION_FEEL.max, () => new DistractionBullet());
    this.telegraphs = new Pool(64, () => new Telegraph());
  }

  get activeBullets(): number {
    return this.dots.size + this.hands.size + this.words.size + this.distractions.size;
  }

  /** Đưa mọi thứ đang có tới thời điểm mới, và dọn những gì đã hết hạn. Gọi mỗi tick, TRƯỚC khi sinh đạn mới. */
  step(time: number, beat: number): void {
    this.time = time;
    this.beat = beat;
    const { arena } = this;
    const centerX = arena.x + arena.w / 2;
    const centerY = arena.y + arena.h / 2;

    for (let i = 0; i < this.dots.size; ) {
      const dot = this.dots.at(i);
      dot.prevX = dot.x;
      dot.prevY = dot.y;
      const age = Math.max(0, time - dot.fireTime);
      dot.x = dot.originX + dot.vx * age;
      dot.y = dot.originY + dot.vy * age;

      // Bị loại khi đã ra ngoài khung VÀ đang bay xa khỏi khung (đạn mới xuất hiện ở ngoài mép nhưng bay vào thì giữ lại).
      const margin = dot.radius + 4;
      const outside =
        dot.x < arena.x - margin ||
        dot.x > arena.x + arena.w + margin ||
        dot.y < arena.y - margin ||
        dot.y > arena.y + arena.h + margin;
      const leaving = (dot.x - centerX) * dot.vx + (dot.y - centerY) * dot.vy > 0;
      if ((outside && leaving) || age > MAX_LIFETIME_SECONDS) this.dots.release(i);
      else i++;
    }

    for (let i = 0; i < this.hands.size; ) {
      const hand = this.hands.at(i);
      if (beat >= hand.endBeat) {
        this.hands.release(i);
        continue;
      }
      hand.prevAngle = hand.angle;
      hand.angle = hand.startAngle + hand.angularVelocity * (beat - hand.fireBeat);
      i++;
    }

    for (let i = 0; i < this.distractions.size; ) {
      const item = this.distractions.at(i);
      item.prevX = item.x;
      item.prevY = item.y;
      if (item.swing) {
        const phase = (beat - item.fireBeat) * item.perBeat;
        item.x = item.anchorX + Math.sin(phase) * item.amplitude;
        item.y = item.anchorY + item.length;
        if (beat >= item.endBeat) this.distractions.release(i);
        else i++;
        continue;
      }
      const age = Math.max(0, time - item.fireTime);
      item.x = item.originX + item.vx * age;
      item.y = item.originY + item.vy * age;
      const margin = item.radius + 4;
      const outside =
        item.x < arena.x - margin ||
        item.x > arena.x + arena.w + margin ||
        item.y < arena.y - margin ||
        item.y > arena.y + arena.h + margin;
      const leaving = (item.x - centerX) * item.vx + (item.y - centerY) * item.vy > 0;
      if ((outside && leaving) || age > MAX_LIFETIME_SECONDS) this.distractions.release(i);
      else i++;
    }

    for (let i = 0; i < this.words.size; ) {
      const word = this.words.at(i);
      word.prevX = word.x;
      word.prevY = word.y;
      if (word.state === "fly") {
        const age = Math.max(0, time - word.fireTime);
        word.x = word.originX + word.vx * age;
        word.y = word.originY + word.vy * age;
        if (this.hasLeft(word)) word.pendingExit = true;
      }
      const elapsed = time - word.markTime;
      const done =
        (word.state === "fading" && elapsed >= WORD_FEEL.fadeSeconds) ||
        (word.state === "absorbed" && elapsed >= WORD_FEEL.absorbSeconds);
      if (done) this.words.release(i);
      else i++;
    }

    for (let i = 0; i < this.telegraphs.size; ) {
      if (beat >= this.telegraphs.at(i).endBeat) this.telegraphs.release(i);
      else i++;
    }
  }

  /** Sinh một viên đạn chấm tại điểm (x, y), bay theo hướng `angle` (rad) với `speed` px/giây. */
  spawnDot(x: number, y: number, angle: number, speed: number, radius: number, damage: number, fireTime: number): void {
    const dot = this.dots.acquire();
    if (!dot) {
      this.dropped++;
      return;
    }
    dot.originX = x;
    dot.originY = y;
    dot.vx = Math.cos(angle) * speed;
    dot.vy = Math.sin(angle) * speed;
    dot.fireTime = fireTime;
    dot.radius = radius;
    dot.damage = damage;
    dot.big = radius >= this.feel.bigRadius;
    const age = Math.max(0, this.time - fireTime);
    dot.x = dot.prevX = x + dot.vx * age;
    dot.y = dot.prevY = y + dot.vy * age;
  }

  /** Sinh một kim đồng hồ quay quanh (cx, cy). `angularVelocity` tính bằng rad mỗi beat. */
  spawnHand(
    cx: number,
    cy: number,
    startAngle: number,
    angularVelocity: number,
    length: number,
    damage: number,
    fireBeat: number,
    durationBeats: number,
  ): void {
    const hand = this.hands.acquire();
    if (!hand) {
      this.dropped++;
      return;
    }
    hand.cx = cx;
    hand.cy = cy;
    hand.startAngle = startAngle;
    hand.angularVelocity = angularVelocity;
    hand.length = length;
    hand.thickness = this.feel.handThickness;
    hand.damage = damage;
    hand.fireBeat = fireBeat;
    hand.endBeat = fireBeat + durationBeats;
    hand.angle = hand.prevAngle = startAngle + angularVelocity * (this.beat - fireBeat);
  }

  addTelegraph(
    shape: TelegraphShape,
    x: number,
    y: number,
    w: number,
    h: number,
    dashed: boolean,
    startTime: number,
    endTime: number,
    endBeat: number,
  ): void {
    const telegraph = this.telegraphs.acquire();
    if (!telegraph) {
      this.dropped++;
      return;
    }
    telegraph.shape = shape;
    telegraph.x = x;
    telegraph.y = y;
    telegraph.w = w;
    telegraph.h = h;
    telegraph.dashed = dashed;
    telegraph.startTime = startTime;
    telegraph.endTime = endTime;
    telegraph.endBeat = endBeat;
  }

  /** Sinh một câu. (x, y) là tâm lúc `fireTime`. Hitbox nhỏ hơn khung chữ. */
  spawnWord(
    x: number,
    y: number,
    angle: number,
    speed: number,
    phrase: string,
    box: { w: number; h: number; hitW: number; hitH: number },
    fireTime: number,
  ): void {
    const word = this.words.acquire();
    if (!word) {
      this.dropped++;
      return;
    }
    word.phrase = phrase;
    word.originX = x;
    word.originY = y;
    word.vx = Math.cos(angle) * speed;
    word.vy = Math.sin(angle) * speed;
    word.fireTime = fireTime;
    word.boxW = box.w;
    word.boxH = box.h;
    word.hitW = box.hitW;
    word.hitH = box.hitH;
    word.state = "fly";
    word.pendingExit = false;
    word.markTime = 0;
    const age = Math.max(0, this.time - fireTime);
    word.x = word.prevX = x + word.vx * age;
    word.y = word.prevY = y + word.vy * age;
  }

  /** Sinh một đạn xao nhãng. Không có sát thương. */
  spawnDistraction(x: number, y: number, angle: number, speed: number, radius: number, sprite: string, fireTime: number): void {
    const item = this.distractions.acquire();
    if (!item) {
      this.dropped++;
      return;
    }
    item.originX = x;
    item.originY = y;
    item.vx = Math.cos(angle) * speed;
    item.vy = Math.sin(angle) * speed;
    item.fireTime = fireTime;
    item.radius = radius;
    item.sprite = sprite;
    item.swing = false;
    const age = Math.max(0, this.time - fireTime);
    item.x = item.prevX = x + item.vx * age;
    item.y = item.prevY = y + item.vy * age;
  }

  /** Đạn xao nhãng treo trên sợi chỉ, đung đưa theo beat. */
  spawnSwinger(
    anchorX: number,
    anchorY: number,
    length: number,
    amplitude: number,
    perBeat: number,
    fireBeat: number,
    endBeat: number,
    radius: number,
    sprite: string,
  ): void {
    const item = this.distractions.acquire();
    if (!item) {
      this.dropped++;
      return;
    }
    item.swing = true;
    item.anchorX = anchorX;
    item.anchorY = anchorY;
    item.length = length;
    item.amplitude = amplitude;
    item.perBeat = perBeat;
    item.fireBeat = fireBeat;
    item.endBeat = endBeat;
    item.radius = radius;
    item.sprite = sprite;
    item.vx = 0;
    item.vy = 0;
    const phase = (this.beat - fireBeat) * perBeat;
    item.x = item.prevX = anchorX + Math.sin(phase) * amplitude;
    item.y = item.prevY = anchorY + length;
  }

  /** Chạm đạn xao nhãng thì lấy nó ra khỏi khung. Không trừ máu. Trả về số viên vừa chạm. */
  consumeDistractions(hitbox: Rect): number {
    let count = 0;
    for (let i = 0; i < this.distractions.size; ) {
      const item = this.distractions.at(i);
      if (!circleIntersectsRect(item.x, item.y, item.radius, hitbox)) {
        i++;
        continue;
      }
      this.distractions.release(i);
      count++;
    }
    return count;
  }

  /**
   * Ôm những câu đang bay mà hitbox chồng lên `hitbox`. Không trừ máu.
   * Câu đã chạm thì không còn tính là "đi qua".
   */
  absorbWords(hitbox: Rect): number {
    let count = 0;
    for (let i = 0; i < this.words.size; i++) {
      const word = this.words.at(i);
      if (word.state !== "fly") continue;
      if (!overlaps(this.wordHitbox(word), hitbox)) continue;
      word.state = "absorbed";
      word.pendingExit = false;
      word.markTime = this.time;
      count++;
    }
    return count;
  }

  /**
   * Chốt các câu đã ra khỏi khung mà không bị ôm trong tick này: tan dần và báo một lần "nhả".
   * Gọi sau `absorbWords`, để câu vừa chạm vừa chạm mép vẫn tính là ôm.
   */
  commitWords(): void {
    this.signals.length = 0;
    for (let i = 0; i < this.words.size; i++) {
      const word = this.words.at(i);
      if (word.state !== "fly" || !word.pendingExit) continue;
      word.state = "fading";
      word.pendingExit = false;
      word.markTime = this.time;
      this.signals.push("release");
    }
  }

  private wordHitbox(word: WordBullet): Rect {
    return { x: word.x - word.hitW / 2, y: word.y - word.hitH / 2, w: word.hitW, h: word.hitH };
  }

  /** Tâm đã qua mép đối diện, theo hướng bay. Phần chữ còn trong khung nên tan vẫn nhìn thấy. */
  private hasLeft(word: WordBullet): boolean {
    const { arena } = this;
    if (word.vx > 0 && word.x > arena.x + arena.w) return true;
    if (word.vx < 0 && word.x < arena.x) return true;
    if (word.vy > 0 && word.y > arena.y + arena.h) return true;
    if (word.vy < 0 && word.y < arena.y) return true;
    return false;
  }

  /** Máu mất nếu hitbox đang chạm đạn nào đó (0 = không trúng). Cảnh báo không gây sát thương. */
  hit(hitbox: Rect): number {
    for (let i = 0; i < this.dots.size; i++) {
      const dot = this.dots.at(i);
      if (circleIntersectsRect(dot.x, dot.y, dot.radius, hitbox)) return dot.damage;
    }
    for (let i = 0; i < this.hands.size; i++) {
      const hand = this.hands.at(i);
      const half = hand.thickness / 2;
      const hit = segmentIntersectsBox(
        hand.cx,
        hand.cy,
        hand.cx + Math.cos(hand.angle) * hand.length,
        hand.cy + Math.sin(hand.angle) * hand.length,
        hitbox.x - half,
        hitbox.y - half,
        hitbox.x + hitbox.w + half,
        hitbox.y + hitbox.h + half,
      );
      if (hit) return hand.damage;
    }
    return 0;
  }

  /** Vẽ cảnh báo và đạn, cắt trong khung (đạn "chui" ra từ mép khung). `debug` thêm vùng va chạm thật. */
  render(renderer: Renderer, alpha: number, debug: boolean): void {
    const { arena } = this;
    renderer.clip(arena.x, arena.y, arena.w, arena.h);

    const flash = this.feel.telegraphFlashSeconds;
    for (let i = 0; i < this.telegraphs.size; i++) {
      const t = this.telegraphs.at(i);
      if (Math.floor((this.time - t.startTime) / flash) % 2 === 1) continue; // pha tắt của nhấp nháy
      if (t.shape === "box") renderer.rect(t.x, t.y, t.w, t.h, COLOR.telegraph);
      else if (t.shape === "ring") renderer.ring(t.x, t.y, t.w, COLOR.telegraph);
      else renderer.line(t.x, t.y, t.w, t.h, 2, COLOR.telegraph, t.dashed ? 6 : 0);
    }

    for (let i = 0; i < this.dots.size; i++) {
      const dot = this.dots.at(i);
      const x = lerp(dot.prevX, dot.x, alpha);
      const y = lerp(dot.prevY, dot.y, alpha);
      renderer.disc(x, y, dot.radius + DRAW_EXTRA_RADIUS, dot.big ? COLOR.bulletBig : COLOR.bullet);
      if (debug) renderer.ring(x, y, dot.radius, COLOR.debugBullet);
    }

    for (let i = 0; i < this.hands.size; i++) {
      const hand = this.hands.at(i);
      const angle = lerp(hand.prevAngle, hand.angle, alpha);
      const tipX = hand.cx + Math.cos(angle) * hand.length;
      const tipY = hand.cy + Math.sin(angle) * hand.length;
      renderer.line(hand.cx, hand.cy, tipX, tipY, hand.thickness, COLOR.hand);
      renderer.disc(hand.cx, hand.cy, hand.thickness + 1, COLOR.handHub);
      if (debug) renderer.line(hand.cx, hand.cy, tipX, tipY, 2, COLOR.debugBullet);
    }

    for (let i = 0; i < this.words.size; i++) {
      const word = this.words.at(i);
      const x = lerp(word.prevX, word.x, alpha);
      const y = lerp(word.prevY, word.y, alpha);
      const life =
        word.state === "fly" ? 0 : Math.min(1, Math.max(0, (this.time - word.markTime) / (word.state === "fading" ? WORD_FEEL.fadeSeconds : WORD_FEEL.absorbSeconds)));
      const fade = word.state === "fly" ? 1 : 1 - life;
      if (word.state === "absorbed") {
        renderer.disc(x, y, lerp(4, word.boxW * 0.45, life), "#fff8ee");
      }
      renderer.text(word.phrase, x - word.boxW / 2, y - word.boxH / 2, {
        size: WORD_FEEL.fontSize,
        color: word.state === "absorbed" ? "#fff8ee" : WORD_FEEL.color,
        alpha: fade,
      });
      if (debug && word.state === "fly") {
        renderer.rectOutline(x - word.hitW / 2, y - word.hitH / 2, word.hitW, word.hitH, COLOR.debugBullet);
      }
    }

    for (let i = 0; i < this.distractions.size; i++) {
      const item = this.distractions.at(i);
      const x = lerp(item.prevX, item.x, alpha);
      const y = lerp(item.prevY, item.y, alpha);
      if (item.swing) renderer.line(item.anchorX, item.anchorY, x, y, 2, COLOR.handHub);
      const sprite = renderer.sprites.size(item.sprite);
      renderer.sprite(item.sprite, x - sprite.width / 2, y - sprite.height / 2);
      if (debug) renderer.ring(x, y, item.radius, COLOR.debugBullet);
    }

    renderer.unclip();
  }
}
