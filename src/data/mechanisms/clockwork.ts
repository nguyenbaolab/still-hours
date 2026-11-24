import type { Mechanism, PartBox } from "./types";

function hit(x: number, y: number, w: number, h: number): PartBox {
  return { x: x - w / 2, y: y - h / 2, w, h };
}

/**
 * Bộ máy đồng hồ đơn giản, dùng chơi thử pha tháo lắp.
 * Tầng 1: 4 ốc. Tầng 2: mặt, tấm che. Tầng 3: 2 bánh răng, lò xo, bánh lắc (core).
 */
export const CLOCKWORK: Mechanism = {
  name: "bộ máy đồng hồ",
  bpm: 80,
  rhythmic: true,
  showHint: true,
  parts: [
    { id: "screw-a", sprite: "screw", x: 0.14, y: 0.16, hit: hit(0.14, 0.16, 0.12, 0.16), blockedBy: [], operation: "unscrew", stage: 1 },
    { id: "screw-b", sprite: "screw", x: 0.38, y: 0.16, hit: hit(0.38, 0.16, 0.12, 0.16), blockedBy: [], operation: "unscrew", stage: 1 },
    { id: "screw-c", sprite: "screw", x: 0.62, y: 0.16, hit: hit(0.62, 0.16, 0.12, 0.16), blockedBy: [], operation: "unscrew", stage: 1 },
    {
      id: "screw-d",
      sprite: "screw",
      x: 0.86,
      y: 0.16,
      hit: hit(0.86, 0.16, 0.12, 0.16),
      blockedBy: [],
      operation: "unscrew",
      stage: 1,
      memory: "Tiếng tích tắc cuối cùng.",
    },
    {
      id: "face",
      sprite: "clock-face",
      x: 0.3,
      y: 0.46,
      hit: hit(0.3, 0.46, 0.2, 0.24),
      blockedBy: ["screw-a", "screw-b", "screw-c", "screw-d"],
      operation: "lift",
      stage: 2,
      memory: "Kim dừng giữa câu.",
    },
    {
      id: "plate",
      sprite: "cover",
      x: 0.62,
      y: 0.46,
      hit: hit(0.62, 0.46, 0.24, 0.2),
      blockedBy: ["face"],
      operation: "lift",
      stage: 2,
    },
    {
      id: "cog-a",
      sprite: "cog",
      x: 0.32,
      y: 0.74,
      hit: hit(0.32, 0.74, 0.16, 0.18),
      blockedBy: ["plate"],
      operation: "unhook",
      stage: 3,
    },
    {
      id: "cog-b",
      sprite: "cog",
      x: 0.56,
      y: 0.74,
      hit: hit(0.56, 0.74, 0.16, 0.18),
      blockedBy: ["plate"],
      operation: "unhook",
      stage: 3,
    },
    {
      id: "spring",
      sprite: "spring",
      x: 0.8,
      y: 0.74,
      hit: hit(0.8, 0.74, 0.16, 0.18),
      blockedBy: ["cog-a", "cog-b"],
      operation: "lift",
      stage: 3,
      memory: "Lò xo còn căng.",
    },
    {
      id: "balance",
      sprite: "balance",
      x: 0.5,
      y: 0.9,
      hit: hit(0.5, 0.9, 0.18, 0.16),
      blockedBy: ["spring"],
      operation: "unhook",
      stage: 3,
      core: true,
      memory: "Bánh lắc muốn đi.",
    },
  ],
};
