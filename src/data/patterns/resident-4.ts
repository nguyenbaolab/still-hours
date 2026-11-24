import type { Pattern } from "../pattern-types";

/**
 * Pattern tạm của cô bé (mốc 3b.1): chỉ có đạn xao nhãng và đạn thường, chưa có bút.
 * Mốc 3b.3 thay bằng ba lượt `R4_ROUNDS` ("Nhặt bút").
 * 100 BPM, 56 beat ≈ 34 giây, có lặp.
 */
export const RESIDENT4_PATTERN: Pattern = {
  name: "nhặt bút (tạm)",
  bpm: 100,
  lengthBeats: 56,
  loop: true,
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
