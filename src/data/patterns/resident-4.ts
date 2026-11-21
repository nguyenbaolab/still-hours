import type { Pattern } from "../pattern-types";
import { TOWN_HORIZON } from "../figures/town-horizon";

/**
 * Pattern thử của cô bé. Đốm sáng đi theo chân trời; đạn xao nhãng kéo bánh răng ra khỏi đường đó.
 * 100 BPM, 60 beat = 36 giây, có lặp. Cuối vòng tua lại nét thật rồi giữ tranh.
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
  guide: TOWN_HORIZON,
  events: [
    { beat: 3, type: "distraction", from: "top", at: 0.14 },
    { beat: 7, type: "distraction", from: "top", at: 0.22 },
    { beat: 12, type: "distraction", from: "bottom", at: 0.36 },
    { beat: 16, type: "distraction", from: "top", at: 0.48 },
    { beat: 20, type: "distraction", from: "top", at: 0.6 },
    { beat: 26, type: "distraction", from: "right", at: 0.5 },
    { beat: 35, type: "distraction", from: "top", at: 0.71 },
    { beat: 44, type: "distraction", from: "left", at: 0.46 },
    { beat: 53, type: "distraction", from: "top", at: 0.92 },
  ],
};
