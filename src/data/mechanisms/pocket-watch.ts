import type { Mechanism, PartBox } from "./types";

function hit(x: number, y: number, w: number, h: number): PartBox {
  return { x: x - w / 2, y: y - h / 2, w, h };
}

/**
 * Đồng hồ quả quýt của bác Hòa (cư dân 1). Chậm và êm: `rhythmic: false` (không cửa sổ nhịp), 60 BPM, chỉ có `lift` và
 * `unhook`, không có `unscrew` (đỡ phải bấm nhiều: đây là máy đầu tiên người chơi tháo). Ba tầng:
 *  1. nắp sau, rồi vòng đệm và chốt cài (câu ký ức đầu, ở chốt);
 *  2. mặt số, rồi hai kim (câu thứ hai, ở kim phút);
 *  3. bánh răng, dây cót (câu thứ ba), bánh lắc (core, câu cuối).
 * Sprite còn là placeholder dùng chung; mốc 7.3 vẽ lại.
 */
export const POCKET_WATCH: Mechanism = {
  name: "đồng hồ quả quýt",
  bpm: 60,
  rhythmic: false,
  showHint: true,
  parts: [
    // Tầng 1
    { id: "back", sprite: "cover", x: 0.5, y: 0.34, hit: hit(0.5, 0.34, 0.3, 0.26), blockedBy: [], operation: "lift", stage: 1 },
    { id: "gasket", sprite: "cog", x: 0.25, y: 0.76, hit: hit(0.25, 0.76, 0.16, 0.2), blockedBy: ["back"], operation: "unhook", stage: 1 },
    {
      id: "clasp",
      sprite: "cog",
      x: 0.75,
      y: 0.76,
      hit: hit(0.75, 0.76, 0.16, 0.2),
      blockedBy: ["back"],
      operation: "unhook",
      stage: 1,
      memory: "Mâm cơm để phần, đã nguội.",
    },
    // Tầng 2
    { id: "face", sprite: "clock-face", x: 0.5, y: 0.34, hit: hit(0.5, 0.34, 0.24, 0.3), blockedBy: [], operation: "lift", stage: 2 },
    { id: "hand-hour", sprite: "cog", x: 0.25, y: 0.76, hit: hit(0.25, 0.76, 0.16, 0.2), blockedBy: ["face"], operation: "unhook", stage: 2 },
    {
      id: "hand-minute",
      sprite: "cog",
      x: 0.75,
      y: 0.76,
      hit: hit(0.75, 0.76, 0.16, 0.2),
      blockedBy: ["face"],
      operation: "unhook",
      stage: 2,
      memory: "Ba cuộc gọi nhỡ. Con gái.",
    },
    // Tầng 3
    { id: "wheel", sprite: "cog", x: 0.25, y: 0.3, hit: hit(0.25, 0.3, 0.16, 0.2), blockedBy: [], operation: "unhook", stage: 3 },
    {
      id: "mainspring",
      sprite: "spring",
      x: 0.75,
      y: 0.3,
      hit: hit(0.75, 0.3, 0.18, 0.2),
      blockedBy: ["wheel"],
      operation: "lift",
      stage: 3,
      memory: "Bánh sinh nhật chưa cắt.",
    },
    {
      id: "balance",
      sprite: "balance",
      x: 0.5,
      y: 0.78,
      hit: hit(0.5, 0.78, 0.2, 0.2),
      blockedBy: ["mainspring"],
      operation: "unhook",
      stage: 3,
      core: true,
      memory: "Con hỏi: mai ba có về không?",
    },
  ],
};