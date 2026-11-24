/**
 * Bot cho test mô phỏng (không vào bản build). Mỗi bot là một hàm nhận trạng thái và cài phím vào `Input`
 * qua nguồn "bot", như bàn phím thật; `input.poll()` vẫn do vòng mô phỏng gọi.
 */
import type { Action, Input } from "../core/input";
import type { Rect } from "../core/math";

const BOT_SOURCE = "bot";
const DIRECTIONS: readonly Action[] = ["up", "down", "left", "right"];

/** Nhấn các phím di chuyển để đi về phía (dx, dy). Dưới `deadzone` px thì thả phím trục đó. */
export function steer(input: Input, dx: number, dy: number, deadzone = 1.5): void {
  input.setActionState(BOT_SOURCE, "left", dx < -deadzone);
  input.setActionState(BOT_SOURCE, "right", dx > deadzone);
  input.setActionState(BOT_SOURCE, "up", dy < -deadzone);
  input.setActionState(BOT_SOURCE, "down", dy > deadzone);
}

/** Thả mọi phím của bot. */
export function release(input: Input): void {
  for (const action of DIRECTIONS) input.setActionState(BOT_SOURCE, action, false);
  input.setActionState(BOT_SOURCE, "slow", false);
}

export interface Vec {
  x: number;
  y: number;
}

/**
 * Bot "đi tới bút rồi đi vòng chữ nhật": chưa cầm thì đi tới bút; cầm rồi thì đi qua bốn góc của một hình chữ nhật
 * trong khung, lần lượt, mãi mãi. `state` giữ góc đang tới.
 */
export class DrawerBot {
  private corner = 0;

  constructor(
    private readonly input: Input,
    private readonly arena: Rect,
    private readonly margin = 36,
  ) {}

  act(gear: Vec, pencil: Vec, holding: boolean): void {
    if (!holding) {
      steer(this.input, pencil.x - gear.x, pencil.y - gear.y);
      return;
    }
    const { arena, margin } = this;
    const corners: Vec[] = [
      { x: arena.x + margin, y: arena.y + margin },
      { x: arena.x + arena.w - margin, y: arena.y + margin },
      { x: arena.x + arena.w - margin, y: arena.y + arena.h - margin },
      { x: arena.x + margin, y: arena.y + arena.h - margin },
    ];
    let target = corners[this.corner % 4] as Vec;
    if (Math.hypot(target.x - gear.x, target.y - gear.y) < 8) {
      this.corner++;
      target = corners[this.corner % 4] as Vec;
    }
    steer(this.input, target.x - gear.x, target.y - gear.y);
  }
}

/** Bot đi tới bút, cầm, rồi đứng yên mãi (kể cả khi bút rơi: không nhặt lại). */
export class StillHolderBot {
  private done = false;

  constructor(private readonly input: Input) {}

  act(gear: Vec, pencil: Vec, holding: boolean): void {
    if (holding) this.done = true;
    if (this.done) release(this.input);
    else steer(this.input, pencil.x - gear.x, pencil.y - gear.y);
  }
}
