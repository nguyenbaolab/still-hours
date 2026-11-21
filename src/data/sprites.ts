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
  /** Đạn xao nhãng: một viên kẹo sáng, để sau này thay bằng PNG cùng id. */
  distraction: {
    scale: 2,
    palette: { "#": "#ffe08a", "@": "#ffb4c8", o: "#fffaf0" },
    rows: [
      "...#...",
      "..#@#..",
      ".#o.o#.",
      "#o...o#",
      ".#o.o#.",
      "..#@#..",
      "...#...",
    ],
  },
} as const satisfies Record<string, PixelSpriteData>;
