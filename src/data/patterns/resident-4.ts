import type { Pattern } from "../pattern-types";
import { CHILD_DRAWING } from "../figures/child-drawing";

/**
 * Pattern thử của cô bé. Kim kẹp khe được sinh từ `paper` lúc tạo trận, không viết trong danh sách.
 * Đạn xao nhãng treo và đung đưa. Đạn thường khép dải trên và dải dưới.
 * 100 BPM, 56 beat ≈ 34 giây, bốn vòng giấy.
 *
 * Chơi thử: `PLAYTEST_PATTERN` trong src/main.ts.
 */
export const RESIDENT4_PATTERN: Pattern = {
  name: "trống giấy",
  bpm: 100,
  lengthBeats: 56,
  loop: true,
  gallery: true,
  paper: CHILD_DRAWING,
  events: [
    { beat: 4, type: "distraction", from: "top", at: 0.3, hang: true },
    { beat: 18, type: "distraction", from: "top", at: 0.72, hang: true },
    { beat: 32, type: "distraction", from: "top", at: 0.4, hang: true },
    { beat: 46, type: "distraction", from: "top", at: 0.66, hang: true },
    { beat: 8, type: "straight", from: "right", at: 0.06 },
    { beat: 8, type: "straight", from: "left", at: 0.94 },
    { beat: 22, type: "straight", from: "right", at: 0.08 },
    { beat: 22, type: "straight", from: "left", at: 0.92 },
    { beat: 36, type: "straight", from: "right", at: 0.05 },
    { beat: 36, type: "straight", from: "left", at: 0.95 },
    { beat: 50, type: "straight", from: "right", at: 0.07 },
    { beat: 50, type: "straight", from: "left", at: 0.93 },
  ],
};
