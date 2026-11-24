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
  /** Bánh răng nứt: màn thua. Cùng kích thước với `gear`. */
  "gear-cracked": {
    scale: 2,
    palette: { "#": "#e0b04a", o: "#9c6b24", x: "#3a2a12" },
    rows: [
      "....#....",
      ".#.##..#.",
      ".####.##.",
      ".##oxo##.",
      "###x.o###",
      ".##oxx##.",
      ".##.###..",
      ".#..##.#.",
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
  /** Cây bút chì nằm chéo trên giấy (cư dân 4). Tâm sprite là tâm bút. */
  pencil: {
    scale: 2,
    palette: { "#": "#f0b429", o: "#c98a1a", p: "#f2c1c8", w: "#e6e0d4", k: "#3a342c" },
    rows: [
      ".......pp.",
      "......ppo.",
      ".....###..",
      "....###o..",
      "...###o...",
      "..###o....",
      ".www#.....",
      ".wkw......",
      ".k........",
    ],
  },
  /** Linh, ngồi ở bàn học (bảng màu của cư dân 4). */
  r4: {
    scale: 2,
    palette: { h: "#3a2a1a", s: "#e8c8a0", d: "#c0504d" },
    rows: ["..hhhh..", ".hhhhhh.", ".hssssh.", ".hssssh.", "..dddd..", ".dddddd.", ".dddddd.", "..d..d.."],
  },
  /** Linh cầm bút chì lên (cảnh kết của cư dân 4). */
  "r4-pencil": {
    scale: 2,
    palette: { h: "#3a2a1a", s: "#e8c8a0", d: "#c0504d", y: "#f0b429", p: "#f2c1c8" },
    rows: ["..hhhh..p", ".hhhhhhy.", ".hssssyh.", ".hssssh..", "..dddd...", ".dddddd..", ".dddddd..", "..d..d.."],
  },
  /** Ốc trên bộ máy. */
  screw: {
    scale: 2,
    palette: { "#": "#d7d2c8", o: "#8d887e" },
    rows: ["..#..", ".###.", "#o.o#", ".###.", "..#.."],
  },
  /** Mặt đồng hồ, chưa có kim. */
  "clock-face": {
    scale: 2,
    palette: { "#": "#f4efe4", o: "#c4b8a4" },
    rows: ["..#####..", ".#######.", "##o...o##", "#.......#", "#...o...#", "#.......#", "##o...o##", ".#######.", "..#####.."],
  },
  /** Tấm che bánh răng. */
  cover: {
    scale: 2,
    palette: { "#": "#b7c0c4", o: "#6d787c" },
    rows: ["###########", "#o.......o#", "#.........#", "#o.......o#", "###########"],
  },
  /** Bánh răng trong máy, nhỏ hơn bánh răng người chơi. */
  cog: {
    scale: 2,
    palette: { "#": "#e0b04a", o: "#9c6b24" },
    rows: ["..#.#..", ".#####.", "##o.o##", ".#...#.", "##o.o##", ".#####.", "..#.#.."],
  },
  /** Lò xo. */
  spring: {
    scale: 2,
    palette: { "#": "#e8eef2" },
    rows: [".#.#.#.", "#.#.#.#", ".#.#.#.", "#.#.#.#"],
  },
  /** Bánh lắc, bộ phận core của máy thử. */
  balance: {
    scale: 2,
    palette: { "#": "#f2d23c", o: "#9c6b24" },
    rows: ["...#...", ".#####.", "##o.o##", "...#...", "##o.o##", ".#####.", "...#..."],
  },
} as const satisfies Record<string, PixelSpriteData>;
