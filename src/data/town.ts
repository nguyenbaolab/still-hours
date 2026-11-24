import type { DialogueId } from "./dialogues";
import type { ResidentId } from "./residents/types";

/**
 * Bản đồ thị trấn (CLAUDE.md, "Thị trấn"): lưới ô 32 px, 64 × 11 ô (2048 × 352 px), nhìn từ trên xuống.
 * Hàng 0–2 là dãy nhà và cửa; hàng 3–7 là phố đi được; hàng 8–10 là vỉa hè, cây, kênh nhánh.
 * Tây → đông: tiệm đồng hồ, nhà bác Hòa, kênh và cầu, quảng trường, nhà Linh, bậc thang lên tháp.
 */

export interface Tile {
  x: number;
  y: number;
}

export interface TileDef {
  /** Ô cứng: không đi vào được. */
  solid: boolean;
  color: string;
}

/**
 * Ký tự → ô. `#` tường/mái, `D` cửa, `.` đường, `,` vỉa hè, `=` cầu, `~` kênh, `T` cây, `b` ghế đá,
 * `S` bậc thang, `r` lan can, `n` biển, `d` bàn. Ô có thứ tương tác (biển, bàn, lan can, ghế, cửa) đều cứng:
 * người thợ đứng cạnh nó và nhìn vào.
 */
export const TOWN_LEGEND: Readonly<Record<string, TileDef>> = {
  "#": { solid: true, color: "#2a2420" },
  D: { solid: true, color: "#6b4a2b" },
  ".": { solid: false, color: "#4a443c" },
  ",": { solid: false, color: "#625a50" },
  "=": { solid: false, color: "#7a5c3a" },
  "~": { solid: true, color: "#2f4a5c" },
  T: { solid: true, color: "#2f5a3a" },
  b: { solid: true, color: "#7a5c3a" },
  S: { solid: false, color: "#8a8070" },
  r: { solid: true, color: "#8a7a5a" },
  n: { solid: true, color: "#c9b88a" },
  d: { solid: true, color: "#7a5530" },
};

export const TOWN_ROWS: readonly string[] = [
  "###################~~~~~~~~####,,,,,,,,,,,,#####################",
  "###################~~~~~~~~####,,,,,,,,,,,,#####################",
  "##############D####~~~~~~~~####,,,,,,,,,,,,#####D#######r####D##",
  "#,dd,,,,#,,,n,,,,,,rrrrrrrr,,,,,,,,,n,,,,,,,,,,,,,,,,nSSSSSSSSS#",
  "#,,,,,,,#..........========...........................SSSSSSSSS#",
  "#,,,,,,,...........========...........................SSSSSSSSS#",
  "#,,,,,,,#..........========...........b...............SSSSSSSSS#",
  "#,,,,,,,#,,,,,,,,,,rrrrrrrr,,,,,,,,,,,,,,,,,,,,,,,,,,,SSSSSSSSS#",
  "#########,,,,,,,T,,~~~~~~~~,T,,,,,b,,,,,,,T,,,,,,,,T,,,,,,,,,,,#",
  "#########,,T,T,TT,,~~~~~~~~,TT,,,TT,T,,,T,T,,T,T,T,TT,,,,,,,,,,#",
  "#########~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~#",
];

/** Người đứng trong thị trấn. `gateX`: cột cổng chặn phía đông của cư dân, đóng tới khi họ được giải thoát. */
export interface TownNpc {
  id: Exclude<ResidentId, "boss">;
  tile: Tile;
  gateX: number;
  /** Sprite lúc chưa giải thoát (xám) và đã giải thoát (có màu). */
  sprite: string;
  freedSprite: string;
}

/** Thứ tự gặp cố định: 1 → 2 → 3 → 4 → boss. Mỗi cư dân chưa giải thoát kèm một cổng cắt ngang phố. */
export const TOWN_NPCS: readonly TownNpc[] = [
  { id: "r1", tile: { x: 14, y: 4 }, gateX: 16, sprite: "r1-grey", freedSprite: "r1" },
  { id: "r2", tile: { x: 27, y: 5 }, gateX: 28, sprite: "r2-grey", freedSprite: "r2" },
  { id: "r3", tile: { x: 38, y: 6 }, gateX: 42, sprite: "r3-grey", freedSprite: "r3" },
  { id: "r4", tile: { x: 48, y: 3 }, gateX: 51, sprite: "r4-grey", freedSprite: "r4" },
];

/** Cổng là một cột ô cứng cắt ngang phố, từ hàng `from` tới hàng `to`. */
export const TOWN_GATE_ROWS = { from: 3, to: 7 } as const;

/** Chỗ ngắm cảnh: Z thì người thợ ngồi xuống, khung cảnh (`BACKDROPS`) hiện toàn màn. Không chữ, không phần thưởng. */
export interface TownSpot {
  id: string;
  tile: Tile;
  backdrop: string;
}

export const TOWN_SPOTS: readonly TownSpot[] = [
  { id: "bridge", tile: { x: 23, y: 3 }, backdrop: "town-bridge" },
  { id: "bench", tile: { x: 34, y: 8 }, backdrop: "town-bench" },
  { id: "hill", tile: { x: 56, y: 2 }, backdrop: "town-hill" },
];

/** Biển và tờ giấy: Z thì đọc một đoạn ngắn. */
export interface TownSign {
  id: string;
  tile: Tile;
  dialogue: DialogueId;
}

export const TOWN_SIGNS: readonly TownSign[] = [
  { id: "shopNote", tile: { x: 3, y: 3 }, dialogue: "shopNote" },
  { id: "officeSign", tile: { x: 12, y: 3 }, dialogue: "officeSign" },
  { id: "noticeBoard", tile: { x: 36, y: 3 }, dialogue: "noticeBoard" },
  { id: "towerSign", tile: { x: 53, y: 3 }, dialogue: "towerSign" },
];

export interface TownMap {
  rows: readonly string[];
  legend: Readonly<Record<string, TileDef>>;
  /** Điểm xuất phát: trong tiệm. */
  spawn: Tile;
  /** Cửa tháp: điểm gặp boss. */
  tower: Tile;
}

export const TOWN: TownMap = {
  rows: TOWN_ROWS,
  legend: TOWN_LEGEND,
  spawn: { x: 4, y: 5 },
  tower: { x: 61, y: 2 },
};

/**
 * Thị trấn đổi dần khi cư dân được giải thoát (CLAUDE.md, "Thị trấn"): mỗi người một lớp.
 *  r1 → cửa sổ các nhà sáng đèn vàng ấm; r2 → dải trời có màu ở mép trên màn hình; r3 → tiếng chim thỉnh thoảng;
 *  r4 → tranh người chơi vẽ treo trên tường nhà Linh (từ `SaveData.drawing`; rỗng thì một tờ giấy trắng).
 * Tọa độ ô theo bản đồ; `wall.frame` theo pixel thế giới.
 */
export const TOWN_AMBIENCE = {
  /** Cửa sổ nằm trên hàng 1 của dãy nhà (ô `#`). */
  windows: {
    color: "#f2c35a",
    glow: "#7a5a24",
    tiles: [
      { x: 2, y: 1 },
      { x: 5, y: 1 },
      { x: 8, y: 1 },
      { x: 11, y: 1 },
      { x: 14, y: 1 },
      { x: 17, y: 1 },
      { x: 28, y: 1 },
      { x: 50, y: 1 },
      { x: 53, y: 1 },
      { x: 56, y: 1 },
      { x: 58, y: 1 },
      { x: 62, y: 1 },
    ] satisfies readonly Tile[],
  },
  /** Dải trời: cao `height` px ở mép trên màn hình, hai màu. */
  sky: { color: "#6f9fd0", edge: "#a9c8e6", height: 12 },
  /** Chim: một tiếng mỗi khoảng ngẫu nhiên trong [min, max] giây. */
  birds: { minSeconds: 6, maxSeconds: 12 },
  /** Khung tranh treo trên tường nhà Linh (pixel thế giới). */
  wall: { frame: { x: 1452, y: 20, w: 64, h: 28 }, paper: "#f1ead8", edge: "#8a7a5a", ink: "#4a3f35" },
} as const;