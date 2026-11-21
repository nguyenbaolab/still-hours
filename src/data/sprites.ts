import type { PixelSpriteData } from "../core/sprites";

/** Sprite placeholder vẽ bằng dữ liệu. Sau này thay bằng PNG trong public/assets/. */
export const SPRITES = {
  clock: {
    palette: { "#": "#d8c9a3" },
    rows: [
      "..#####..",
      ".#.....#.",
      "#...#...#",
      "#...#...#",
      "#...###.#",
      "#.......#",
      "#.......#",
      ".#.....#.",
      "..#####..",
    ],
  },
} as const satisfies Record<string, PixelSpriteData>;
