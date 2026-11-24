/**
 * Cảnh nền vẽ bằng hình khối, dùng cho chỗ ngắm cảnh trong thị trấn và cho cảnh hiện ra khi đứng yên
 * (cư dân 2, lượt 2 của boss). Toạ độ là tỉ lệ 0..1 của khung được vẽ vào, nên cùng một cảnh vẽ được trong khung né
 * (400×160) lẫn toàn màn. `drift`: trôi ngang bấy nhiêu khung mỗi giây, vòng lại.
 */

export type BackdropShape =
  | { kind: "rect"; x: number; y: number; w: number; h: number; color: string; drift?: number }
  | { kind: "disc"; x: number; y: number; r: number; color: string; drift?: number };

export interface Backdrop {
  /** Màu nền (bầu trời). */
  sky: string;
  shapes: readonly BackdropShape[];
}

const rect = (x: number, y: number, w: number, h: number, color: string, drift?: number): BackdropShape =>
  drift === undefined ? { kind: "rect", x, y, w, h, color } : { kind: "rect", x, y, w, h, color, drift };
const disc = (x: number, y: number, r: number, color: string): BackdropShape => ({ kind: "disc", x, y, r, color });

/** Nhóm hình thành một cánh chim chữ V nhỏ. */
const bird = (x: number, y: number, drift: number): BackdropShape[] => [
  rect(x, y, 0.02, 0.02, "#2a2420", drift),
  rect(x + 0.02, y + 0.02, 0.02, 0.02, "#2a2420", drift),
  rect(x + 0.04, y, 0.02, 0.02, "#2a2420", drift),
];

export const BACKDROPS: Readonly<Record<string, Backdrop>> = {
  /** Hoàng hôn (cư dân 2, lượt 1). */
  dusk: {
    sky: "#e8a05a",
    shapes: [
      rect(0, 0, 1, 0.3, "#c9647a"),
      rect(0, 0.3, 1, 0.25, "#e07a5a"),
      disc(0.7, 0.6, 0.16, "#fff0b8"),
      rect(0, 0.78, 1, 0.22, "#3a2a3a"),
      rect(0.1, 0.7, 0.1, 0.1, "#3a2a3a"),
      rect(0.4, 0.66, 0.14, 0.14, "#3a2a3a"),
    ],
  },
  /** Mây (cư dân 2, lượt 2). */
  clouds: {
    sky: "#7ab6e8",
    shapes: [
      rect(0.1, 0.2, 0.22, 0.1, "#ffffff", 0.02),
      rect(0.16, 0.14, 0.12, 0.08, "#ffffff", 0.02),
      rect(0.55, 0.38, 0.28, 0.1, "#f2f6fa", 0.015),
      rect(0.62, 0.32, 0.14, 0.08, "#f2f6fa", 0.015),
      rect(0.3, 0.6, 0.2, 0.08, "#ffffff", 0.025),
    ],
  },
  /** Đàn chim (cư dân 2, lượt 3). */
  birds: {
    sky: "#a8d4f0",
    shapes: [...bird(0.2, 0.3, 0.05), ...bird(0.32, 0.38, 0.05), ...bird(0.45, 0.26, 0.06), ...bird(0.6, 0.42, 0.045), ...bird(0.75, 0.3, 0.055)],
  },
  /** Từ tháp nhìn ra thị trấn (boss, lượt 2). */
  tower: {
    sky: "#1e2438",
    shapes: [
      disc(0.8, 0.2, 0.1, "#e8e0b0"),
      rect(0, 0.62, 1, 0.38, "#14161f"),
      rect(0.06, 0.55, 0.12, 0.2, "#252a3a"),
      rect(0.22, 0.5, 0.1, 0.25, "#2a3042"),
      rect(0.4, 0.58, 0.14, 0.17, "#252a3a"),
      rect(0.62, 0.52, 0.12, 0.23, "#2a3042"),
      rect(0.08, 0.6, 0.02, 0.03, "#f2d23c"),
      rect(0.25, 0.56, 0.02, 0.03, "#f2d23c"),
      rect(0.44, 0.64, 0.02, 0.03, "#f2d23c"),
      rect(0.66, 0.6, 0.02, 0.03, "#f2d23c"),
    ],
  },
  /** Lan can cầu nhìn xuống kênh. */
  "town-bridge": {
    sky: "#9ac4d8",
    shapes: [
      rect(0, 0, 1, 0.4, "#c8dce8"),
      rect(0, 0.55, 1, 0.45, "#3a6a86"),
      rect(0.1, 0.65, 0.3, 0.02, "#6aa0bc", 0.03),
      rect(0.5, 0.78, 0.35, 0.02, "#6aa0bc", 0.02),
      rect(0, 0.5, 1, 0.05, "#7a5c3a"),
    ],
  },
  /** Ghế dưới gốc cây. */
  "town-bench": {
    sky: "#cfe0b8",
    shapes: [
      rect(0.42, 0.3, 0.06, 0.6, "#5a3a22"),
      disc(0.45, 0.28, 0.24, "#3a6a3a"),
      disc(0.3, 0.36, 0.16, "#4a7a44"),
      disc(0.6, 0.34, 0.16, "#4a7a44"),
      rect(0, 0.9, 1, 0.1, "#6a8a4a"),
    ],
  },
  /** Đầu dốc nhìn mái nhà. */
  "town-hill": {
    sky: "#e8b87a",
    shapes: [
      rect(0, 0, 1, 0.3, "#d98a6a"),
      disc(0.2, 0.42, 0.12, "#fff0b8"),
      rect(0, 0.62, 1, 0.38, "#4a3a3a"),
      rect(0.05, 0.5, 0.14, 0.2, "#6a4a42"),
      rect(0.25, 0.46, 0.12, 0.24, "#7a5248"),
      rect(0.45, 0.52, 0.16, 0.18, "#6a4a42"),
      rect(0.68, 0.48, 0.12, 0.22, "#7a5248"),
      rect(0.84, 0.54, 0.12, 0.16, "#6a4a42"),
    ],
  },
};
