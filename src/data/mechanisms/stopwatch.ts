import type { Mechanism, PartBox } from "./types";

function hit(x: number, y: number, w: number, h: number): PartBox {
  return { x: x - w / 2, y: y - h / 2, w, h };
}

/**
 * Đồng hồ bấm giờ của chú Minh (cư dân 2). Theo nhịp (`rhythmic: true`), 96 BPM, có `unscrew`. Ba tầng:
 *  1. hai ốc, rồi nắp lưng (câu ký ức đầu, ở nắp lưng);
 *  2. núm vặn, kim giây, rồi mặt số (câu thứ hai, ở mặt số);
 *  3. tấm đỡ, bánh răng, lò xo (câu thứ ba), bánh lắc (core, câu cuối).
 * Sprite còn là placeholder dùng chung; mốc 7.3 vẽ lại.
 */
export const STOPWATCH: Mechanism = {
  name: "đồng hồ bấm giờ",
  bpm: 96,
  rhythmic: true,
  parts: [
    // Tầng 1
    { id: "screw-a", sprite: "screw", x: 0.25, y: 0.2, hit: hit(0.25, 0.2, 0.12, 0.16), blockedBy: [], operation: "unscrew", stage: 1 },
    { id: "screw-b", sprite: "screw", x: 0.75, y: 0.2, hit: hit(0.75, 0.2, 0.12, 0.16), blockedBy: [], operation: "unscrew", stage: 1 },
    {
      id: "back",
      sprite: "cover",
      x: 0.5,
      y: 0.62,
      hit: hit(0.5, 0.62, 0.3, 0.24),
      blockedBy: ["screw-a", "screw-b"],
      operation: "lift",
      stage: 1,
      memory: "Con diều mắc trên dây điện.",
    },
    // Tầng 2
    { id: "crown", sprite: "screw", x: 0.2, y: 0.25, hit: hit(0.2, 0.25, 0.12, 0.16), blockedBy: [], operation: "unscrew", stage: 2 },
    { id: "hand", sprite: "cog", x: 0.8, y: 0.25, hit: hit(0.8, 0.25, 0.14, 0.18), blockedBy: ["crown"], operation: "unhook", stage: 2 },
    {
      id: "face",
      sprite: "clock-face",
      x: 0.5,
      y: 0.68,
      hit: hit(0.5, 0.68, 0.22, 0.28),
      blockedBy: ["hand"],
      operation: "lift",
      stage: 2,
      memory: "Mùa hoa sữa, năm nào cũng vội.",
    },
    // Tầng 3
    { id: "plate", sprite: "cover", x: 0.3, y: 0.28, hit: hit(0.3, 0.28, 0.24, 0.2), blockedBy: [], operation: "lift", stage: 3 },
    { id: "cog", sprite: "cog", x: 0.75, y: 0.28, hit: hit(0.75, 0.28, 0.16, 0.18), blockedBy: ["plate"], operation: "unhook", stage: 3 },
    {
      id: "spring",
      sprite: "spring",
      x: 0.25,
      y: 0.74,
      hit: hit(0.25, 0.74, 0.16, 0.18),
      blockedBy: ["plate"],
      operation: "lift",
      stage: 3,
      memory: "Con mèo chờ ở bậc cửa.",
    },
    {
      id: "balance",
      sprite: "balance",
      x: 0.68,
      y: 0.74,
      hit: hit(0.68, 0.74, 0.18, 0.16),
      blockedBy: ["cog", "spring"],
      operation: "unhook",
      stage: 3,
      core: true,
      memory: "Bầu trời hôm ấy rất xanh.",
    },
  ],
};