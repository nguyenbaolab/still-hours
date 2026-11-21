import type { PixelSpriteData } from "../core/sprites";

/** Sprite placeholder vẽ bằng dữ liệu. Sau này thay bằng PNG trong public/assets/. */
export const SPRITES = {
  /** Bánh răng của người chơi (thay cho trái tim của Undertale). Phải là hình vuông. */
  gear: {
    scale: 2,
    palette: { "#": "#e0b04a", o: "#9c6b24" },
    rows: [
      "....#....",
      ".#.###.#.",
      ".#######.",
      ".##ooo##.",
      "###o.o###",
      ".##ooo##.",
      ".#######.",
      ".#.###.#.",
      "....#....",
    ],
  },
} as const satisfies Record<string, PixelSpriteData>;
