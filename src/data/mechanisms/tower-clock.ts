import type { Mechanism, PartBox } from "./types";

function hit(x: number, y: number, w: number, h: number): PartBox {
  return { x: x - w / 2, y: y - h / 2, w, h };
}

/**
 * Máy tháp đồng hồ của ông Khải (boss). Theo nhịp (`rhythmic: true`), 72 BPM, chậm và nặng. `core` là bộ thoát
 * (`escapement`): tháo bộ thoát thì vòng lặp dừng. Ba tầng:
 *  1. hai bu lông, rồi nắp che (câu ký ức đầu, ở nắp che);
 *  2. kim giờ, kim phút, rồi mặt số (câu thứ hai, ở mặt số);
 *  3. quả nặng, bộ bánh răng, con lắc (câu thứ ba), bộ thoát (core, câu cuối).
 * Sprite còn là placeholder dùng chung; mốc 7.3 vẽ lại.
 */
export const TOWER_CLOCK: Mechanism = {
  name: "máy tháp đồng hồ",
  bpm: 72,
  rhythmic: true,
  parts: [
    // Tầng 1
    { id: "bolt-a", sprite: "screw", x: 0.2, y: 0.22, hit: hit(0.2, 0.22, 0.12, 0.16), blockedBy: [], operation: "unscrew", stage: 1 },
    { id: "bolt-b", sprite: "screw", x: 0.8, y: 0.22, hit: hit(0.8, 0.22, 0.12, 0.16), blockedBy: [], operation: "unscrew", stage: 1 },
    {
      id: "hood",
      sprite: "cover",
      x: 0.5,
      y: 0.62,
      hit: hit(0.5, 0.62, 0.34, 0.26),
      blockedBy: ["bolt-a", "bolt-b"],
      operation: "lift",
      stage: 1,
      memory: "Tiệm chưa bao giờ đóng cửa sớm.",
    },
    // Tầng 2
    { id: "hand-hour", sprite: "hand", x: 0.22, y: 0.26, hit: hit(0.22, 0.26, 0.16, 0.2), blockedBy: [], operation: "unhook", stage: 2 },
    { id: "hand-minute", sprite: "hand", x: 0.78, y: 0.26, hit: hit(0.78, 0.26, 0.16, 0.2), blockedBy: [], operation: "unhook", stage: 2 },
    {
      id: "dial",
      sprite: "clock-face",
      x: 0.5,
      y: 0.68,
      hit: hit(0.5, 0.68, 0.24, 0.3),
      blockedBy: ["hand-hour", "hand-minute"],
      operation: "lift",
      stage: 2,
      memory: "Lá thư viết xong, chưa gửi.",
    },
    // Tầng 3
    { id: "weight", sprite: "weight", x: 0.24, y: 0.26, hit: hit(0.24, 0.26, 0.22, 0.2), blockedBy: [], operation: "lift", stage: 3 },
    { id: "train", sprite: "cog", x: 0.76, y: 0.26, hit: hit(0.76, 0.26, 0.16, 0.18), blockedBy: ["weight"], operation: "unhook", stage: 3 },
    {
      id: "pendulum",
      sprite: "rod",
      x: 0.24,
      y: 0.74,
      hit: hit(0.24, 0.74, 0.16, 0.2),
      blockedBy: ["weight"],
      operation: "lift",
      stage: 3,
      memory: "Sang năm. Sang năm nữa.",
    },
    {
      id: "escapement",
      sprite: "balance",
      x: 0.66,
      y: 0.74,
      hit: hit(0.66, 0.74, 0.18, 0.16),
      blockedBy: ["train", "pendulum"],
      operation: "unhook",
      stage: 3,
      core: true,
      memory: "Còn kịp không?",
    },
  ],
};