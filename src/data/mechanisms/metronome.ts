import type { Mechanism, PartBox } from "./types";

function hit(x: number, y: number, w: number, h: number): PartBox {
  return { x: x - w / 2, y: y - h / 2, w, h };
}

/**
 * Máy đếm nhịp của chị Vân (cư dân 3). Theo nhịp (`rhythmic: true`), 88 BPM. Ba tầng:
 *  1. hai ốc, rồi nắp hộp (câu ký ức đầu, ở nắp hộp);
 *  2. quả cân, cần lắc, rồi núm lên dây (câu thứ hai, ở núm);
 *  3. tấm đỡ, bánh răng, lò xo (câu thứ ba), bánh lắc (core, câu cuối).
 * Sprite còn là placeholder dùng chung; mốc 7.3 vẽ lại.
 */
export const METRONOME: Mechanism = {
  name: "máy đếm nhịp",
  bpm: 88,
  rhythmic: true,
  parts: [
    // Tầng 1
    { id: "screw-a", sprite: "screw", x: 0.22, y: 0.22, hit: hit(0.22, 0.22, 0.12, 0.16), blockedBy: [], operation: "unscrew", stage: 1 },
    { id: "screw-b", sprite: "screw", x: 0.78, y: 0.22, hit: hit(0.78, 0.22, 0.12, 0.16), blockedBy: [], operation: "unscrew", stage: 1 },
    {
      id: "case",
      sprite: "cover",
      x: 0.5,
      y: 0.64,
      hit: hit(0.5, 0.64, 0.32, 0.26),
      blockedBy: ["screw-a", "screw-b"],
      operation: "lift",
      stage: 1,
      memory: "Sân khấu trường, tràng vỗ tay đầu tiên.",
    },
    // Tầng 2
    { id: "weight", sprite: "cog", x: 0.5, y: 0.2, hit: hit(0.5, 0.2, 0.14, 0.18), blockedBy: [], operation: "lift", stage: 2 },
    { id: "rod", sprite: "spring", x: 0.22, y: 0.6, hit: hit(0.22, 0.6, 0.16, 0.2), blockedBy: ["weight"], operation: "unhook", stage: 2 },
    {
      id: "key",
      sprite: "screw",
      x: 0.78,
      y: 0.6,
      hit: hit(0.78, 0.6, 0.14, 0.18),
      blockedBy: ["rod"],
      operation: "unscrew",
      stage: 2,
      memory: "Cây đàn trên nóc tủ.",
    },
    // Tầng 3
    { id: "plate", sprite: "cover", x: 0.3, y: 0.26, hit: hit(0.3, 0.26, 0.24, 0.2), blockedBy: [], operation: "lift", stage: 3 },
    { id: "cog", sprite: "cog", x: 0.76, y: 0.26, hit: hit(0.76, 0.26, 0.16, 0.18), blockedBy: ["plate"], operation: "unhook", stage: 3 },
    {
      id: "spring",
      sprite: "spring",
      x: 0.24,
      y: 0.72,
      hit: hit(0.24, 0.72, 0.16, 0.18),
      blockedBy: ["plate"],
      operation: "lift",
      stage: 3,
      memory: "Bài hát viết dở.",
    },
    {
      id: "balance",
      sprite: "balance",
      x: 0.64,
      y: 0.74,
      hit: hit(0.64, 0.74, 0.18, 0.16),
      blockedBy: ["cog", "spring"],
      operation: "unhook",
      stage: 3,
      core: true,
      memory: "Giọng mình. Lâu rồi không nghe.",
    },
  ],
};