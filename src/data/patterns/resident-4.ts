import type { Pattern } from "../pattern-types";

/**
 * Pattern thử của cô bé: đạn xao nhãng bay qua khung. 100 BPM, 60 beat ≈ 36 giây, có lặp.
 * Cuối mỗi vòng, khung và đạn mờ đi để chỉ còn bức tranh.
 *
 * Chơi thử: `PLAYTEST_PATTERN` trong src/main.ts. Pattern đạn cũ là TEST_PATTERN,
 * pattern lời tiêu cực là RESIDENT3_PATTERN.
 */
export const RESIDENT4_PATTERN: Pattern = {
  name: "nét chì",
  bpm: 100,
  lengthBeats: 60,
  loop: true,
  gallery: true,
  events: [
    { beat: 2, type: "distraction", from: "right", at: 0.3 },
    { beat: 6, type: "distraction", from: "left", at: 0.7 },
    { beat: 10, type: "distraction", from: "top", at: 0.4 },
    { beat: 14, type: "distraction", from: "bottom", at: 0.6 },
    { beat: 18, type: "distraction", from: "right", at: 0.55 },
    { beat: 22, type: "distraction", from: "left", at: 0.25 },
    { beat: 26, type: "distraction", from: "top", at: 0.75 },
    { beat: 30, type: "distraction", from: "bottom", at: 0.35 },
    { beat: 34, type: "distraction", from: "left", at: 0.5 },
    { beat: 38, type: "distraction", from: "right", at: 0.8 },
    { beat: 42, type: "distraction", from: "top", at: 0.2 },
    { beat: 46, type: "distraction", from: "bottom", at: 0.5 },
    { beat: 50, type: "distraction", from: "right", at: 0.42 },
    { beat: 54, type: "distraction", from: "left", at: 0.62 },
    { beat: 58, type: "distraction", from: "top", at: 0.58 },
  ],
};
