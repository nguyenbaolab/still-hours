import type { Pattern } from "../pattern-types";

/**
 * Pattern thử của cư dân 3: những câu tiêu cực bay qua khung. 100 BPM, 60 beat ≈ 36 giây, có lặp.
 * Câu là chỉ số trong NEGATIVE_PHRASES; câu thật viết sau.
 *
 * Chơi thử pattern này hay TEST_PATTERN: sửa `PLAYTEST_PATTERN` trong src/main.ts.
 */
export const RESIDENT3_PATTERN: Pattern = {
  name: "lời tiêu cực",
  bpm: 100,
  lengthBeats: 60,
  loop: true,
  events: [
    { beat: 2, type: "word", from: "right", at: 0.5, phrase: 0 },
    { beat: 6, type: "word", from: "left", at: 0.32, phrase: 1 },
    { beat: 10, type: "word", from: "top", at: 0.5, phrase: 2 },
    { beat: 14, type: "word", from: "bottom", at: 0.62, phrase: 3 },
    { beat: 18, type: "word", from: "right", at: 0.28, phrase: 4 },
    { beat: 22, type: "word", from: "left", at: 0.7, phrase: 0 },
    { beat: 26, type: "word", from: "top", at: 0.35, phrase: 1 },
    { beat: 30, type: "word", from: "bottom", at: 0.48, phrase: 2 },
    { beat: 34, type: "word", from: "right", at: 0.58, phrase: 3 },
    { beat: 38, type: "word", from: "left", at: 0.4, phrase: 4 },
    { beat: 42, type: "word", from: "top", at: 0.72, phrase: 0 },
    { beat: 46, type: "word", from: "bottom", at: 0.3, phrase: 1 },
    { beat: 50, type: "word", from: "right", at: 0.45, phrase: 2 },
    { beat: 54, type: "word", from: "left", at: 0.66, phrase: 3 },
    { beat: 58, type: "word", from: "bottom", at: 0.52, phrase: 4 },
  ],
};
