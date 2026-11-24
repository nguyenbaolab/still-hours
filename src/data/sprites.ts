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
  /** Người thợ đồng hồ (người chơi), nhìn xuống. */
  "keeper-down": {
    scale: 3,
    palette: { h: "#3a2a1a", s: "#e8c8a0", k: "#2a2420", c: "#4a5c6a", g: "#e0b04a", b: "#2a2420" },
    rows: [
      "..hhhh..",
      ".hhhhhh.",
      ".hssssh.",
      ".hskksh.",
      "..ssss..",
      ".cccccc.",
      "cccggccc",
      "cccccccc",
      ".cc..cc.",
      ".cc..cc.",
      ".bb..bb.",
      ".bb..bb.",
    ],
  },
  /** Người thợ đồng hồ (người chơi), nhìn lên. */
  "keeper-up": {
    scale: 3,
    palette: { h: "#3a2a1a", s: "#e8c8a0", k: "#2a2420", c: "#4a5c6a", g: "#e0b04a", b: "#2a2420" },
    rows: [
      "..hhhh..",
      ".hhhhhh.",
      ".hhhhhh.",
      ".hhhhhh.",
      "..hhhh..",
      ".cccccc.",
      "cccccccc",
      "cccccccc",
      ".cc..cc.",
      ".cc..cc.",
      ".bb..bb.",
      ".bb..bb.",
    ],
  },
  /** Người thợ đồng hồ (người chơi), nhìn trái. */
  "keeper-left": {
    scale: 3,
    palette: { h: "#3a2a1a", s: "#e8c8a0", k: "#2a2420", c: "#4a5c6a", g: "#e0b04a", b: "#2a2420" },
    rows: [
      "..hhhh..",
      ".hhhhhh.",
      ".hssshh.",
      ".ksshhh.",
      "..sshh..",
      ".cccccc.",
      "cgcccccc",
      "cccccccc",
      ".cc..cc.",
      ".cc..cc.",
      ".bb..bb.",
      ".bb..bb.",
    ],
  },
  /** Người thợ đồng hồ (người chơi), nhìn phải. */
  "keeper-right": {
    scale: 3,
    palette: { h: "#3a2a1a", s: "#e8c8a0", k: "#2a2420", c: "#4a5c6a", g: "#e0b04a", b: "#2a2420" },
    rows: [
      "..hhhh..",
      ".hhhhhh.",
      ".hhsssh.",
      ".hhhssk.",
      "..hhss..",
      ".cccccc.",
      "ccccccgc",
      "cccccccc",
      ".cc..cc.",
      ".cc..cc.",
      ".bb..bb.",
      ".bb..bb.",
    ],
  },
  /** Bác Hòa, cặp trong tay. */
  "r1": {
    scale: 2,
    palette: { h: "#5a5a60", s: "#e8c8a0", c: "#3a4a6a", b: "#2a2420", k: "#c9b88a" },
    rows: [
      "..hhhh..",
      ".hhhhhh.",
      ".hssssh.",
      "..ssss..",
      ".cccccc.",
      "cccccckk",
      "cccccckk",
      "cccccccc",
      ".cc..cc.",
      ".cc..cc.",
      ".bb..bb.",
      ".bb..bb.",
    ],
  },
  /** Chú Minh, người đưa thư cúi đầu. */
  "r2": {
    scale: 2,
    palette: { h: "#3a2a1a", s: "#e8c8a0", c: "#7a6a3a", b: "#2a2420", k: "#6a5a2a" },
    rows: [
      "..kkkk..",
      ".kkkkkk.",
      ".hssssh.",
      "..ssss..",
      ".cccccc.",
      "kcccccc.",
      "kcccccc.",
      "cccccccc",
      ".cc..cc.",
      ".cc..cc.",
      ".bb..bb.",
      ".bb..bb.",
    ],
  },
  /** Chị Vân, tóc dài, ngồi một mình. */
  "r3": {
    scale: 2,
    palette: { h: "#2a1a2a", s: "#e8c8a0", c: "#8a4a6a", b: "#2a2420" },
    rows: [
      ".hhhhhh.",
      "hhhhhhhh",
      "hhssssh.",
      "hhssssh.",
      "hhhssh..",
      ".cccccc.",
      "cccccccc",
      "cccccccc",
      ".cccccc.",
      ".cc..cc.",
      ".bb..bb.",
      ".bb..bb.",
    ],
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
