import type { Mechanism, PartBox } from "./types";

function hit(x: number, y: number, w: number, h: number): PartBox {
  return { x: x - w / 2, y: y - h / 2, w, h };
}

/**
 * Đồng hồ báo thức của Linh (cư dân 4). 100 BPM, theo nhịp. Ba tầng:
 *  1. ba ốc và nắp sau (câu ký ức đầu);
 *  2. hai kim, rồi mặt số (câu thứ hai);
 *  3. tấm che, bánh răng, lò xo (câu thứ ba), bánh lắc (core, câu cuối).
 * Sprite còn là placeholder dùng chung; mốc 7.3 vẽ lại.
 */
export const ALARM_CLOCK: Mechanism = {
  name: "đồng hồ báo thức",
  bpm: 100,
  rhythmic: true,
  parts: [
    // Tầng 1
    { id: "screw-a", sprite: "screw", x: 0.2, y: 0.2, hit: hit(0.2, 0.2, 0.12, 0.16), blockedBy: [], operation: "unscrew", stage: 1 },
    { id: "screw-b", sprite: "screw", x: 0.5, y: 0.2, hit: hit(0.5, 0.2, 0.12, 0.16), blockedBy: [], operation: "unscrew", stage: 1 },
    { id: "screw-c", sprite: "screw", x: 0.8, y: 0.2, hit: hit(0.8, 0.2, 0.12, 0.16), blockedBy: [], operation: "unscrew", stage: 1 },
    {
      id: "back",
      sprite: "cover",
      x: 0.5,
      y: 0.55,
      hit: hit(0.5, 0.55, 0.3, 0.22),
      blockedBy: ["screw-a", "screw-b", "screw-c"],
      operation: "lift",
      stage: 1,
      memory: "Hộp chì màu mười hai cây.",
    },
    // Tầng 2
    { id: "hand-a", sprite: "cog", x: 0.25, y: 0.3, hit: hit(0.25, 0.3, 0.16, 0.18), blockedBy: [], operation: "unhook", stage: 2 },
    { id: "hand-b", sprite: "cog", x: 0.75, y: 0.3, hit: hit(0.75, 0.3, 0.16, 0.18), blockedBy: [], operation: "unhook", stage: 2 },
    {
      id: "face",
      sprite: "clock-face",
      x: 0.5,
      y: 0.62,
      hit: hit(0.5, 0.62, 0.22, 0.26),
      blockedBy: ["hand-a", "hand-b"],
      operation: "lift",
      stage: 2,
      memory: "Con mèo vẽ được dán lên tủ lạnh.",
    },
    // Tầng 3
    {
      id: "plate",
      sprite: "cover",
      x: 0.3,
      y: 0.3,
      hit: hit(0.3, 0.3, 0.24, 0.2),
      blockedBy: [],
      operation: "lift",
      stage: 3,
    },
    {
      id: "cog",
      sprite: "cog",
      x: 0.7,
      y: 0.3,
      hit: hit(0.7, 0.3, 0.16, 0.18),
      blockedBy: ["plate"],
      operation: "unhook",
      stage: 3,
    },
    {
      id: "spring",
      sprite: "spring",
      x: 0.3,
      y: 0.68,
      hit: hit(0.3, 0.68, 0.16, 0.18),
      blockedBy: ["plate"],
      operation: "lift",
      stage: 3,
      memory: "Tập vẽ, trang đầu còn trắng.",
    },
    {
      id: "balance",
      sprite: "balance",
      x: 0.7,
      y: 0.7,
      hit: hit(0.7, 0.7, 0.18, 0.16),
      blockedBy: ["cog", "spring"],
      operation: "unhook",
      stage: 3,
      core: true,
      memory: "Hồi đó vẽ mà chẳng nghĩ gì.",
    },
  ],
};
