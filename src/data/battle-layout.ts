import { GAME_HEIGHT, GAME_WIDTH } from "../core/config";
import type { Rect } from "../core/math";

const ARENA_WIDTH = 200;
const ARENA_HEIGHT = 80;

export interface BattleLayout {
  /** Vùng bên trong khung mà bánh răng được phép đi (không tính viền). Mặc định nằm giữa màn hình. */
  arena: Rect;
  /** Độ dày viền trắng của khung, vẽ bên ngoài `arena`. */
  borderThickness: number;
  hpBar: {
    /** Khoảng cách từ viền khung đến thanh máu (px). */
    gapBelowFrame: number;
    /** Chiều cao thanh máu (px). */
    height: number;
    /** Mỗi điểm máu rộng bao nhiêu px (thanh máu dài theo máu tối đa, như Undertale). */
    pxPerHp: number;
  };
}

export const BATTLE_LAYOUT: BattleLayout = {
  arena: {
    x: (GAME_WIDTH - ARENA_WIDTH) / 2,
    y: (GAME_HEIGHT - ARENA_HEIGHT) / 2,
    w: ARENA_WIDTH,
    h: ARENA_HEIGHT,
  },
  borderThickness: 2,
  hpBar: { gapBelowFrame: 8, height: 8, pxPerHp: 3 },
};
